import math
import os
import psycopg2
import random
from pathlib import Path
from typing import List
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load the Neon DB connection from .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_DIR = Path(os.getenv("MODEL_DIR", Path(__file__).parent / "models"))
MODEL_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="WasteWise CVRP & Simulation Engine")

# --- CORS CONFIGURATION ADDED ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- YOUR EXISTING DATA MODELS ---
class BinInput(BaseModel):
    id: str
    lat: float
    lng: float
    current_fill_level: float = Field(ge=0, le=100)
    max_capacity_kg: float = Field(gt=0)
    generator_type: str | None = None
    waste_category: str | None = None
    est_daily_kg: float | None = Field(default=None, gt=0)
    priority: float = 0

class DestinationInput(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)

class OptimizeRequest(BaseModel):
    assigned_car_id: str
    bins: List[BinInput]
    vehicle_capacity_kg: float | None = Field(default=None, gt=0)
    destination: DestinationInput | None = None

def compute_distance(left: BinInput, right: BinInput) -> int:
    return int(compute_distance_km(left, right) * 1000)

def compute_distance_km(left: BinInput, right: BinInput) -> float:
    latitude_a, latitude_b = math.radians(left.lat), math.radians(right.lat)
    latitude_delta = latitude_b - latitude_a
    longitude_delta = math.radians(right.lng - left.lng)
    arc = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(latitude_a)
        * math.cos(latitude_b)
        * math.sin(longitude_delta / 2) ** 2
    )
    return 6371 * 2 * math.atan2(math.sqrt(arc), math.sqrt(1 - arc))

GENERATOR_CODES = {
    "RESTAURANT": 0,
    "HOTEL": 1,
    "CANTEEN": 2,
    "VEGETABLE_MARKET": 3,
}
WASTE_CODES = {"VEG_SCRAPS": 0, "COOKED_FOOD": 1, "MIXED_ORGANIC": 2}

def ml_features(records):
    return pd.DataFrame([
        {
            "generator_type": GENERATOR_CODES.get(item.get("generator_type"), -1),
            "waste_category": WASTE_CODES.get(item.get("waste_category"), -1),
            "est_daily_kg": float(item.get("est_daily_kg") or 0),
            "hour": int(item["hour"]),
            "is_weekend": int(item["is_weekend"]),
        }
        for item in records
    ])

def get_collection_settings(cur):
    cur.execute(
        "SELECT fill_threshold, max_waste_age_hours FROM system_settings WHERE id = 1"
    )
    settings = cur.fetchone()
    return (settings[0], settings[1]) if settings else (75, 24)

@app.get("/health")
def health():
    return {"status": "ok"}

# =====================================================================
# 🚀 NEW: TIME MACHINE (SIMULATION AND RESET) ENDPOINTS
# =====================================================================
@app.post("/reset-bins")
def reset_bins():
    """
    Safe reset for demo purposes: without changing bin IDs (so the ML model is not affected),
    it sets all bins' fill levels to 0% and clears their needs_collection status.
    """
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE smart_bins 
            SET current_fill_level = 0,
                needs_collection = FALSE,
                fill_started_at = NULL,
                last_updated = now()
        """)
        
        # If active routes exist, we can mark them as completed so the map clears
        cur.execute("""
            UPDATE routes 
            SET is_completed = TRUE 
            WHERE is_completed = FALSE
        """)
        
        conn.commit()
        return {"status": "success", "message": "Demo reset successful: all bins emptied to 0%!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if conn:
            if cur:
                cur.close()
            conn.close()

@app.post("/simulate-next-day")
def simulate_next_day():
    """
    Intended only for demo presentations and tests.
    Adds waste to all bins in the database at a rate of 15%-30% fill.
    """
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        threshold, max_age_hours = get_collection_settings(cur)
        cur.execute("""
            SELECT id, total_depth_cm, max_capacity_kg, current_fill_level,
                   generator_type, waste_category, est_daily_kg, fill_started_at
            FROM smart_bins
            WHERE status = 'ACTIVE'
        """)
        bins = cur.fetchall()
        simulated_count = 0
        for (
            bin_id, depth_cm, max_capacity_kg, current_fill_level,
            generator_type, waste_category, est_daily_kg, fill_started_at,
        ) in bins:
            generator_type = generator_type or "RESTAURANT"
            daily_defaults = {
                "RESTAURANT": 12.0,
                "HOTEL": 18.0,
                "CANTEEN": 20.0,
                "VEGETABLE_MARKET": 16.0,
            }
            category_factor = {
                "VEG_SCRAPS": 1.15,
                "COOKED_FOOD": 1.0,
                "MIXED_ORGANIC": 1.08,
            }.get(waste_category, 1.0)
            daily_kg = float(est_daily_kg or daily_defaults.get(generator_type, 12.0))
            increase_kg = max(
                0.0,
                daily_kg * random.uniform(0.75, 1.25) * category_factor,
            )
            previous_level = int(current_fill_level or 0)
            next_level = min(
                100,
                int(round(previous_level + (increase_kg / max_capacity_kg) * 100)),
            )
            now = datetime.now().astimezone()
            fill_started = fill_started_at or (now if next_level else None)
            needs_collection = next_level >= threshold or (
                fill_started is not None
                and (now - fill_started).total_seconds()
                >= max_age_hours * 3600
            )
            distance_cm = max(0.0, depth_cm * (1 - next_level / 100))
            cur.execute("""
                UPDATE smart_bins
                SET current_fill_level = %s,
                    needs_collection = %s,
                    fill_started_at = COALESCE(fill_started_at, CASE WHEN %s > 0 THEN now() END),
                    last_updated = now()
                WHERE id = %s
            """, (next_level, needs_collection, next_level, bin_id))
            cur.execute("""
                INSERT INTO sensor_data
                    (bin_id, measure_distance_cm, fill_percentage, battery_voltage, recorded_at)
                VALUES (%s, %s, %s, %s, now())
            """, (
                bin_id,
                distance_cm,
                float(next_level),
                round(random.uniform(3.55, 4.15), 2),
            ))
            simulated_count += 1
        conn.commit()
        return {
            "status": "success",
            "message": f"Simulated 24 hours for {simulated_count} generators with type-based sensor readings.",
            "simulated_generators": simulated_count,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if conn:
            if cur:
                cur.close()
            conn.close()

# =====================================================================
# 🔮 NEW: MACHINE LEARNING (PREDICTIVE ROUTING) ENDPOINTS
# =====================================================================
@app.post("/ml/train-model")
def train_ml_model():
    """
    Trains and saves the ML model (Random Forest) using synthetic historical data.
    """
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        
        # Fetch only the last 90 days of data
        query = """
            SELECT s.bin_id, s.fill_percentage, s.recorded_at,
                   b.generator_type, b.waste_category, b.est_daily_kg
            FROM sensor_data s
            JOIN smart_bins b ON b.id = s.bin_id
            ORDER BY s.recorded_at, s.bin_id
        """
        # Use psycopg2 directly instead of SQLAlchemy to avoid pandas warnings
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            df = pd.read_sql(query, conn)
        
        if df.empty:
            return {"status": "error", "message": "No sensor data was found in the database for training. Please run seed_ml_data.py first."}

        # Data preparation
        df['recorded_at'] = pd.to_datetime(df['recorded_at'])
        df['next_fill'] = df.groupby('bin_id')['fill_percentage'].shift(-1)
        df['next_recorded_at'] = df.groupby('bin_id')['recorded_at'].shift(-1)
        df = df.dropna()
        df['elapsed_hours'] = (
            df['next_recorded_at'] - df['recorded_at']
        ).dt.total_seconds() / 3600
        df = df[
            (df['elapsed_hours'] > 0)
            & (df['elapsed_hours'] <= 72)
            & (df['next_fill'] >= df['fill_percentage'])
        ].copy()
        if len(df) < 5:
            return {
                "status": "error",
                "message": "At least five consecutive valid sensor-reading pairs are required to train and evaluate the generator forecast.",
            }
        df['hour'] = df['recorded_at'].dt.hour
        df['is_weekend'] = (df['recorded_at'].dt.dayofweek >= 5).astype(int)
        df['fill_increase_per_hour'] = (
            df['next_fill'] - df['fill_percentage']
        ) / df['elapsed_hours']
        records = df.to_dict('records')
        X = ml_features(records)
        y = df['fill_increase_per_hour']

        split_at = max(1, int(len(df) * 0.8))
        if split_at >= len(df):
            split_at = len(df) - 1
        train_x, test_x = X.iloc[:split_at], X.iloc[split_at:]
        train_y, test_y = y.iloc[:split_at], y.iloc[split_at:]
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(train_x, train_y)
        predictions = model.predict(test_x)
        metrics = {
            "maeFillPercentagePerHour": round(float(mean_absolute_error(test_y, predictions)), 4),
            "rmseFillPercentagePerHour": round(float(mean_squared_error(test_y, predictions) ** 0.5), 4),
            "evaluationSamples": int(len(test_y)),
        }
        if len(test_y) > 1:
            metrics["r2Score"] = round(float(r2_score(test_y, predictions)), 4)
        model.fit(X, y)
        joblib.dump(model, MODEL_DIR / 'rf_model.pkl')
        joblib.dump(
            {
                "evaluated_at": datetime.now().isoformat(),
                "metrics": metrics,
            },
            MODEL_DIR / 'forecast_evaluation.pkl',
        )

        return {
            "status": "success", 
            "message": "Generator-aware waste forecast trained and evaluated.",
            "metrics": metrics,
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if conn:
            conn.close()

class PredictiveOptimizeRequest(BaseModel):
    assigned_car_id: str
    bins: List[BinInput]
    hours_ahead: int = Field(default=24, ge=1, le=168)

@app.post("/ml/predictive-cvrp")
def predictive_cvrp(payload: PredictiveOptimizeRequest):
    """
    Uses current fill levels and the trained ML model to estimate the predicted fill levels
    'hours_ahead' hours from now and creates a route containing bins that will exceed
    (or have already exceeded) 75% capacity.
    """
    try:
        now = datetime.now()
        target_time = now + timedelta(hours=payload.hours_ahead)
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        threshold, _ = get_collection_settings(cur)
        cur.close()
        conn.close()
        
        predicted_critical_bins = [
            bin_obj for bin_obj in payload.bins
            if bin_obj.current_fill_level >= threshold
        ]
        bins_to_predict = [
            bin_obj for bin_obj in payload.bins
            if bin_obj.current_fill_level < threshold
        ]

        if bins_to_predict:
            if not (MODEL_DIR / 'rf_model.pkl').exists():
                return {"status": "error", "message": "ML model not found. Please call the /ml/train-model endpoint first."}

            model = joblib.load(MODEL_DIR / 'rf_model.pkl')

            for bin_obj in bins_to_predict:
                features = ml_features([{
                    "generator_type": bin_obj.generator_type,
                    "waste_category": bin_obj.waste_category,
                    "est_daily_kg": bin_obj.est_daily_kg,
                    "hour": target_time.hour,
                    "is_weekend": target_time.weekday() >= 5,
                }])
                predicted_increase = max(0, float(model.predict(features)[0])) * payload.hours_ahead

                future_fill_level = min(
                    100.0, bin_obj.current_fill_level + predicted_increase
                )

                if future_fill_level >= threshold:
                    predicted_critical_bins.append(
                        BinInput(
                            id=bin_obj.id,
                            lat=bin_obj.lat,
                            lng=bin_obj.lng,
                            current_fill_level=future_fill_level,
                            max_capacity_kg=bin_obj.max_capacity_kg,
                            generator_type=bin_obj.generator_type,
                            waste_category=bin_obj.waste_category,
                            est_daily_kg=bin_obj.est_daily_kg,
                        )
                    )

        if not predicted_critical_bins:
            return {"status": "info", "message": f"No bins are predicted to exceed 75% within {payload.hours_ahead} hours."}
            
        request_payload = OptimizeRequest(
            assigned_car_id=payload.assigned_car_id, 
            bins=predicted_critical_bins
        )
        
        result = optimize_cvrp(request_payload)
        
        if result.get("status") == "success":
            result["predicted_bins_count"] = len(predicted_critical_bins)
            
        return result
        
    except Exception as e:
        return {"status": "error", "message": f"ML prediction error: {str(e)}"}

# =====================================================================
# 🧠 YOUR EXISTING OR-TOOLS ALGORITHM (UNTOUCHED)
# =====================================================================
@app.post("/optimize-cvrp")
def optimize_cvrp(payload: OptimizeRequest):
    bins = payload.bins

    if len(bins) == 0:
        return {"status": "error", "message": "No bins provided"}

    depot = BinInput(
        id="depot",
        lat=sum(item.lat for item in bins) / len(bins),
        lng=sum(item.lng for item in bins) / len(bins),
        current_fill_level=0,
        max_capacity_kg=1,
    )
    destination = None
    if payload.destination:
        destination = BinInput(
            id="destination",
            lat=payload.destination.lat,
            lng=payload.destination.lng,
            current_fill_level=0,
            max_capacity_kg=1,
        )
    nodes = [depot, *bins, *([destination] if destination else [])]

    demands = [
        max(0, int(round((item.current_fill_level / 100.0) * item.max_capacity_kg * 1000)))
        for item in bins
    ]
    demands = [0, *demands, *([0] if destination else [])]

    depot_index = 0
    end_index = len(nodes) - 1 if destination else depot_index
    vehicle_capacities = [
        int(round((payload.vehicle_capacity_kg or 100000) * 1000))
    ]

    distance_matrix = []
    for i in range(len(nodes)):
        row = [compute_distance(nodes[i], nodes[j]) for j in range(len(nodes))]
        distance_matrix.append(row)

    manager = pywrapcp.RoutingIndexManager(
        len(distance_matrix), 1, [depot_index], [end_index]
    )
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        return distance_matrix[manager.IndexToNode(from_index)][
            manager.IndexToNode(to_index)
        ]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index):
        return demands[manager.IndexToNode(from_index)]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,
        vehicle_capacities,
        True,
        "Capacity",
    )

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        return {
            "status": "error",
            "message": "No solution found for provided bins",
        }

    index = routing.Start(0)
    step = 1
    total_collected_kg = 0.0
    waypoints_order = []
    path_nodes = [depot]

    while not routing.IsEnd(index):
        node_index = manager.IndexToNode(index)
        if node_index != depot_index:
            collected_kg = demands[node_index] / 1000
            total_collected_kg += collected_kg
            waypoints_order.append(
                {
                    "step": step,
                    "bin_id": nodes[node_index].id,
                    "collected_kg": collected_kg,
                }
            )
            path_nodes.append(nodes[node_index])
            step += 1
        index = solution.Value(routing.NextVar(index))
    if destination:
        path_nodes.append(destination)
    else:
        path_nodes.append(depot)

    total_distance_km = sum(
        compute_distance_km(left, right)
        for left, right in zip(path_nodes, path_nodes[1:])
    )

    return {
        "status": "success",
        "routes": [
            {
                "assigned_car_id": payload.assigned_car_id,
                "total_collected_kg": total_collected_kg,
                "total_distance_km": round(total_distance_km, 3),
                "waypoints_order": waypoints_order,
            }
        ],
    }