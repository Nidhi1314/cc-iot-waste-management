import os
import random
import uuid
import psycopg2
from psycopg2 import extras
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database connection URL from .env
DATABASE_URL = os.getenv("DATABASE_URL")

# Geographic center: Manhattan, Times Square
CENTER_LAT = 40.7580
CENTER_LON = -73.9855
LAT_SPREAD = 0.015  # Random latitude spread (approx. 1.5 - 2 km radius)
LON_SPREAD = 0.015  # Random longitude spread

# Configuration
NUM_BINS = 50
CAPACITIES = [100.0, 150.0, 200.0]

# Keep table names flexible.
# If your schema uses uppercase table names (CamelCase, etc.),
# you must escape them with quotes: TABLE_SMART_BINS = '"Smart_Bins"'
TABLE_SMART_BINS = "smart_bins"
TABLE_ROUTES = "routes"
TABLE_SENSOR_DATA = "sensor_data"

def generate_bin_data(index):
    """Generates initial-day data for a single smart bin."""
    lat = random.uniform(CENTER_LAT - LAT_SPREAD, CENTER_LAT + LAT_SPREAD)
    lon = random.uniform(CENTER_LON - LON_SPREAD, CENTER_LON + LON_SPREAD)
    
    return {
        "id": str(uuid.uuid4()),
        "latitude": round(lat, 6),
        "longitude": round(lon, 6),
        "address": f"Manhattan, NY - Bin {index}",
        "max_capacity_kg": random.choice(CAPACITIES),
        "total_depth_cm": 150.0,
        "current_fill_level": 0, # Integer
        "status": "ACTIVE",
        "needs_collection": False
    }

def main():
    if not DATABASE_URL:
        print("Error: DATABASE_URL was not found in the .env file!")
        print("Please create a .env file in the project root and add your Neon DB URL.")
        return

    conn = None
    cursor = None
    try:
        # 1. Connect to Neon DB
        print("Connecting to Neon PostgreSQL database...")
        # Neon DB connection URLs sometimes require SSL
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cursor = conn.cursor()

        # 2. Database cleanup (TRUNCATE CASCADE)
        print("Clearing existing data (TRUNCATE CASCADE)...")
        truncate_query = f"TRUNCATE TABLE {TABLE_SMART_BINS}, {TABLE_ROUTES}, {TABLE_SENSOR_DATA} CASCADE;"
        cursor.execute(truncate_query)
        print("Database successfully cleared.")

        # 3. Generate bin data
        print(f"Generating {NUM_BINS} smart bins around the Manhattan/Times Square area...")
        # Use the range (1, NUM_BINS + 1) so bin addresses start at 1
        bins_data = [generate_bin_data(i) for i in range(1, NUM_BINS + 1)]

        # 4. Insert into the database (Batch Insert)
        # New columns were added: address and total_depth_cm. last_updated is filled by the database with NOW().
        insert_query = f"""
            INSERT INTO {TABLE_SMART_BINS} (
                id, latitude, longitude, total_depth_cm, max_capacity_kg, status, current_fill_level, needs_collection, address, last_updated
            ) VALUES (
                %(id)s, %(latitude)s, %(longitude)s, %(total_depth_cm)s, %(max_capacity_kg)s, %(status)s, %(current_fill_level)s, %(needs_collection)s, %(address)s, NOW()
            );
        """
        
        # Send all data in one batch with execute_batch (efficient I/O)
        extras.execute_batch(cursor, insert_query, bins_data)
        
        # Finish the transaction (Commit)
        conn.commit()
        
        # 5. Print success message after completion
        print("Success: 50 initial-day smart bin records were generated and saved to the database.")

    except (Exception, psycopg2.Error) as error:
        # Roll back the transaction in case of an error
        if conn:
            conn.rollback()
        print(f"A database error occurred: {error}")
    finally:
        # Close database connections safely (Graceful Shutdown)
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("PostgreSQL connection closed.")

if __name__ == "__main__":
    main()
