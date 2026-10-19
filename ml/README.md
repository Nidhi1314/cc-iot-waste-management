# WasteWise Algorithm Engine 🧠♻️

Welcome to the **WasteWise Algorithm & Machine Learning Engine**. This service acts as the brain of the WasteWise platform, responsible for simulating waste accumulation, predicting future bin fill levels using Machine Learning, and generating optimized collection routes using Google OR-Tools.

Built with **FastAPI**, this microservice seamlessly communicates with the Neon PostgreSQL database and the Next.js frontend to provide a real-time, AI-driven waste management dashboard.

---

## 🛠️ Core Technologies
* **Framework:** FastAPI (Python 3)
* **Routing Algorithm:** Google OR-Tools (Capacitated Vehicle Routing Problem - CVRP)
* **Machine Learning:** Scikit-Learn (Random Forest Regressor), Pandas, Joblib
* **Database Driver:** `psycopg2` (PostgreSQL)

---

## 🏗️ System Architecture & Logic Flow

The algorithm engine handles three main domains: **Simulation**, **Routing (CVRP)**, and **Predictive Machine Learning**.

### 1. The Simulation Engine (Time Machine)
To demonstrate the platform to a jury or stakeholders without waiting days for bins to fill up, we built a simulation mechanism.
* **Endpoint:** `POST /simulate-next-day`
* **What it does:** It acts as a "Time Machine." Every time it is called, it fetches all smart bins from the database and artificially adds a realistic, random amount of waste (between `5%` and `25%`) to their `current_fill_level`. 
* **Why:** This creates a realistic distribution of bins (e.g., 75% of bins are partially full, 25% are critical) for routing tests.

### 2. Standard AI Routing (Reactive CVRP)
This is the traditional, reactive approach to waste management. We only collect bins that are *already* full.
* **Endpoint:** `POST /run-demo-cvrp` -> Calls `POST /optimize-cvrp`
* **What it does:** 
  1. Scans the database for bins where `current_fill_level >= 75%`.
  2. Converts their coordinates and weights into a mathematical matrix.
  3. Uses **Google OR-Tools** to solve the Capacitated Vehicle Routing Problem (CVRP). It calculates the shortest path starting from a dynamic depot, visiting all critical bins without exceeding the truck's maximum weight capacity (`max_capacity_kg`).
  4. Saves the optimized sequence (waypoints) to the `routes` table in the database and marks those bins as `needs_collection = TRUE`.

### 3. Predictive ML Routing (Proactive CVRP)
This is the advanced, proactive approach. Instead of waiting for bins to overflow, the system predicts which bins *will* be full in the near future and routes the truck there in advance.
* **Training (`POST /ml/train-model`):** 
  * We generate 90 days of synthetic historical sensor data (`seed_ml_data.py`).
  * The algorithm uses **Pandas** to extract features like `hour_of_day`, `is_weekend`, and `bin_id_encoded`.
  * A **Random Forest Regressor** is trained to understand the specific filling pattern of each unique bin (e.g., "Bin A fills up fast on Friday nights", "Bin B fills slowly on weekdays").
  * The model is saved to disk as `rf_model.pkl` alongside a label encoder `le_bin_id.pkl`.
* **Predicting & Routing (`POST /ml/run-predictive-demo-cvrp`):**
  * You specify a time horizon (e.g., `+24 hours`).
  * The system looks at the *current* fill level of all bins.
  * It feeds the current time and bin IDs into the ML model to predict how much waste will be deposited in the next 24 hours.
  * `Future_Fill_Level = Current_Fill + Predicted_Increase`
  * If the `Future_Fill_Level >= 80%`, the bin is proactively added to the route.
  * The CVRP algorithm then optimizes this future-proof route and saves it to the database.

---

## 🎯 Admin Dashboard Features & Logic (Frontend to Backend)

The **Admin Dashboard** connects directly to the FastAPI engine (via NestJS) to provide complete control over the system. Here is a detailed breakdown of each feature and its underlying logic:

### 1. Simulate Time (+1 Day)
* **What it does:** Fast-forwards the system time by 24 hours to simulate waste accumulation.
* **Logic:** When clicked, the frontend calls the FastAPI `/simulate-next-day` endpoint. The backend updates the `current_fill_level` of all bins in the database by adding a random percentage (5-25%). The dashboard then automatically refetches the data, immediately reflecting the new fill levels (and critical statuses) on the map and tables.

### 2. Safe Reset (Set Bins to 0%)
* **What it does:** Instantly empties all bins back to 0% fill level.
* **Why it is "Safe":** Unlike older scripts (`seed_data.py`) which deleted and recreated bins with new UUIDs, this feature **preserves the Bin IDs**. This is crucial because the Machine Learning model is trained on specific UUIDs. If IDs change, the ML predictions will fail.
* **Logic:** Calls the FastAPI `/reset-bins` endpoint. The backend sets `current_fill_kg = 0`, `current_fill_level = 0.0`, and updates `last_emptied_at` to the current timestamp for all existing bins.

### 3. Generate Reactive Route
* **What it does:** Creates a standard collection route based on the *current* state of the bins.
* **Logic:** The Admin selects an available vehicle (Operator Account) from the dropdown and clicks "Generate Reactive Route". NestJS sends a request to FastAPI's `/optimize-cvrp` (or equivalent). Only bins currently exceeding the critical threshold (e.g., >80%) are included. The algorithm calculates the shortest path (CVRP) considering the selected vehicle's `maxCapacityKg`. The generated route is saved in the database and appears in the Routes Panel.

### 4. Generate ML Predictive Route (+24h)
* **What it does:** Creates a proactive collection route by predicting which bins will be full tomorrow.
* **Logic:** The Admin selects a vehicle and clicks "Generate ML Predictive Route (+24h)". NestJS calls the FastAPI predictive endpoint. The backend loads the trained **Random Forest** model (`rf_model.pkl`), inputs the current time and bin states, and predicts the fill levels +24 hours into the future. Bins that are predicted to cross the critical threshold (even if they are only at 50% right now) are added to the routing algorithm. The optimized route is then saved and displayed.

### 5. Route Management (Select, Complete, Delete)
* **Select Route:** Clicking a generated route in the list fetches its `waypointsOrder` (the exact sequence of bins to visit) and displays it on the map.
* **Complete Route:** Marks the `isCompleted` flag as `true` in the database. In a real-world scenario, this signifies the driver has finished the shift and the bins have been physically emptied.
* **Delete Route:** Permanently removes the selected route from the database. Uses a robust React inline confirmation (`Confirm delete? Yes/No`) to prevent accidental deletions without blocking the browser's UI thread (a common issue with native `window.confirm` in React 18).

---

## 🌐 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check to ensure the API is running. |
| `POST` | `/simulate-next-day` | Simulates time passing by adding 5-25% waste to all bins. |
| `POST` | `/reset-bins` | Safely resets all bin fill levels to 0% without changing UUIDs. |
| `POST` | `/optimize-cvrp` | The core Google OR-Tools CVRP solver (Accepts JSON payload). |
| `POST` | `/predict-and-route` | Calculates future (+24h) fill levels via ML and runs CVRP. |

---

## 🚀 How to Setup & Run Locally

1. **Environment Variables:** Ensure you have a `.env` file in the root directory (one level up) containing your `DATABASE_URL`.
   ```env
   DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   ```

2. **Virtual Environment & Dependencies:**
   ```bash
   # From the project root
   python3 -m venv .venv
   source .venv/bin/activate
   
   # Move to algorithm folder and install requirements
   cd wastewise-algorithm
   pip install -r requirements.txt
   ```

3. **Data Preparation (Run from project root):**
   ```bash
   cd ..
   # 1. Generate 50 empty bins (Resets the DB to Day 0)
   python seed_data.py
   
   # 2. Generate 90 days of historical data for ML training
   python seed_ml_data.py
   ```

4. **Start the FastAPI Server:**
   ```bash
   cd wastewise-algorithm
   fastapi dev main.py --port 8000
   ```
   *The server will start at `http://localhost:8000`. You can visit `http://localhost:8000/docs` to see the interactive Swagger UI and test the endpoints.*

## 🧪 Quick Test Flow for Jury
1. Ensure the ML model is trained (run `seed_ml_data.py` once to generate DB data and `rf_model.pkl`).
2. Go to the Admin Dashboard.
3. Click **Safe Reset** to ensure a clean slate (0% bins).
4. Click **Simulate Time (+1 Day)** 3-4 times to realistically fill bins across the map.
5. Select a vehicle and click **Generate Reactive Route** to collect currently full bins.
6. Click **Generate ML Predictive Route (+24h)** to see the proactive route that catches bins before they overflow!
7. Manage the routes in the panel (View Details, Complete, or Delete).
