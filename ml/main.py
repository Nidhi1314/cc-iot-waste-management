import math
import os
import psycopg2
import uuid
import json
from typing import List
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
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

class OptimizeRequest(BaseModel):
    assigned_car_id: str
    bins: List[BinInput]

def compute_distance(left: BinInput, right: BinInput) -> int:
    return int(math.hypot(left.lat - right.lat, left.lng - right.lng) * 100000)

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
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE smart_bins 
            SET current_fill_level = 0,
                needs_collection = FALSE
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
            cur.close()
            conn.close()

@app.post("/simulate-next-day")
def simulate_next_day():
    """
    Intended only for demo presentations and tests.
    Adds waste to all bins in the database at a rate of 15%-30% fill.
    """
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Fill all bins in smart_bins more slowly and realistically (each time by 5% to 25%)
        cur.execute("""
            UPDATE smart_bins 
            SET current_fill_level = LEAST(current_fill_level + floor(random() * 20 + 5)::int, 100)
        """)
        
        # Automatically update needs_collection status for bins that exceed 75%
        cur.execute("""
            UPDATE smart_bins 
            SET needs_collection = TRUE 
            WHERE current_fill_level >= 75
        """)
        conn.commit()
        return {"status": "success", "message": "Simulation successful: time advanced by 1 day and waste levels increased!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if conn:
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
        query = "SELECT bin_id, fill_percentage, recorded_at FROM sensor_data ORDER BY bin_id, recorded_at"
        # Use psycopg2 directly instead of SQLAlchemy to avoid pandas warnings
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            df = pd.read_sql(query, conn)
        
        if df.empty:
            return {"status": "error", "message": "No sensor data was found in the database for training. Please run seed_ml_data.py first."}

        # Data preparation
        df['recorded_at'] = pd.to_datetime(df['recorded_at'])
        df['hour'] = df['recorded_at'].dt.hour
        df['day_of_week'] = df['recorded_at'].dt.dayofweek
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Set the increase over a 4-hour period as the target
        df['next_fill'] = df.groupby('bin_id')['fill_percentage'].shift(-1)
        df = df.dropna()
        df = df[df['next_fill'] >= df['fill_percentage']]
        df['fill_increase_4h'] = df['next_fill'] - df['fill_percentage']
        
        # Encoding
        le = LabelEncoder()
        df['bin_id_encoded'] = le.fit_transform(df['bin_id'])
        
        features = ['bin_id_encoded', 'hour', 'is_weekend']
        X = df[features]
        y = df['fill_increase_4h']
        
        # Training
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        # Save the model (in the algorithm directory)
        joblib.dump(model, 'rf_model.pkl')
        joblib.dump(le, 'le_bin_id.pkl')
        
        return {
            "status": "success", 
            "message": "Model trained successfully and saved as rf_model.pkl.", 
            "r2_score": round(model.score(X, y), 4)
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if conn:
            conn.close()

class PredictiveOptimizeRequest(BaseModel):
    assigned_car_id: str
    bins: List[BinInput]
    hours_ahead: int = 24

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
        target_is_weekend = 1 if target_time.weekday() >= 5 else 0
        
        predicted_critical_bins = [
            bin_obj for bin_obj in payload.bins
            if bin_obj.current_fill_level >= 75.0
        ]
        bins_to_predict = [
            bin_obj for bin_obj in payload.bins
            if bin_obj.current_fill_level < 75.0
        ]

        if bins_to_predict:
            if not os.path.exists('rf_model.pkl') or not os.path.exists('le_bin_id.pkl'):
                return {"status": "error", "message": "ML model not found. Please call the /ml/train-model endpoint first."}

            model = joblib.load('rf_model.pkl')
            le = joblib.load('le_bin_id.pkl')

            # Known bins by encoder (to prevent unseen-bin errors)
            known_bins = set(le.classes_)

            for bin_obj in bins_to_predict:
                if bin_obj.id not in known_bins:
                    continue # Skip a newly added bin that has not been trained yet

                bin_id_encoded = le.transform([bin_obj.id])[0]

                features = pd.DataFrame([{
                    'bin_id_encoded': bin_id_encoded,
                    'hour': now.hour,
                    'is_weekend': target_is_weekend
                }])

                predicted_increase_4h = model.predict(features)[0]
                predicted_increase = (predicted_increase_4h / 4.0) * payload.hours_ahead

                future_fill_level = min(
                    100.0, bin_obj.current_fill_level + predicted_increase
                )

                if future_fill_level >= 75.0:
                    predicted_critical_bins.append(
                        BinInput(
                            id=bin_obj.id,
                            lat=bin_obj.lat,
                            lng=bin_obj.lng,
                            current_fill_level=future_fill_level,
                            max_capacity_kg=bin_obj.max_capacity_kg
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
    nodes = [depot, *bins]

    demands = [
        max(0, int((item.current_fill_level / 100.0) * item.max_capacity_kg))
        for item in bins
    ]
    demands = [0, *demands]

    depot_index = 0
    num_vehicles = 1
    vehicle_capacities = [100000]

    distance_matrix = []
    for i in range(len(nodes)):
        row = [compute_distance(nodes[i], nodes[j]) for j in range(len(nodes))]
        distance_matrix.append(row)

    manager = pywrapcp.RoutingIndexManager(
        len(distance_matrix), num_vehicles, depot_index
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
    total_collected_kg = 0
    waypoints_order = []

    while not routing.IsEnd(index):
        node_index = manager.IndexToNode(index)
        if node_index != depot_index:
            collected_kg = demands[node_index]
            total_collected_kg += collected_kg
            waypoints_order.append(
                {
                    "step": step,
                    "bin_id": nodes[node_index].id,
                    "collected_kg": collected_kg,
                }
            )
            step += 1
        index = solution.Value(routing.NextVar(index))

    return {
        "status": "success",
        "routes": [
            {
                "assigned_car_id": payload.assigned_car_id,
                "total_collected_kg": total_collected_kg,
                "waypoints_order": waypoints_order,
            }
        ],
    }