import psycopg2
from psycopg2.extras import execute_batch
import random
import uuid
import os
from dotenv import load_dotenv

# Load DATABASE_URL from the .env file
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Table names (lowercase format)
TABLE_SMART_BINS = "smart_bins"
TABLE_ROUTES = "routes"
TABLE_SENSOR_DATA = "sensor_data"

# Manhattan center coordinates
BASE_LAT = 40.7580
BASE_LNG = -73.9855

def generate_nyc_bins(count=50):
    bins = []
    for i in range(count):
        lat_offset = random.uniform(-0.0150, 0.0150)
        lng_offset = random.uniform(-0.0150, 0.0150)
        
        # Prepare the data as tuples for execute_batch
        bins.append((
            str(uuid.uuid4()),                      # id
            f"Manhattan, NY - Bin {i+1}",           # address (this was missing)
            BASE_LAT + lat_offset,                  # latitude
            BASE_LNG + lng_offset,                  # longitude
            150.0,                                  # total_depth_cm (this was missing)
            random.choice([100.0, 150.0, 200.0]),   # max_capacity_kg
            0,                                      # current_fill_level
            "ACTIVE",                               # status
            False                                   # needs_collection
        ))
    return bins

def seed_database():
    conn = None
    try:
        print("🔌 Connecting to Neon PostgreSQL database...")
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("🧹 Clearing existing data (TRUNCATE CASCADE)...")
        cur.execute(f"TRUNCATE TABLE {TABLE_SMART_BINS}, {TABLE_ROUTES}, {TABLE_SENSOR_DATA} CASCADE;")
        
        print("🗽 Generating 50 smart bins around the Manhattan/Times Square area...")
        nyc_bins = generate_nyc_bins(50)
        
        # Added address and total_depth_cm columns to the INSERT query
        insert_query = f"""
            INSERT INTO {TABLE_SMART_BINS} 
            (id, address, latitude, longitude, total_depth_cm, max_capacity_kg, current_fill_level, status, needs_collection)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        execute_batch(cur, insert_query, nyc_bins)
        conn.commit()
        print("✅ SUCCESS! 50 New York smart bins were added to Neon and all are 0% full!")

    except Exception as e:
        print(f"❌ Database operation failed: {e}")
        if conn:
            conn.rollback() # Roll back changes if an error occurs (security)
    finally:
        if conn:
            cur.close()
            conn.close()
            print("🔌 PostgreSQL connection closed.")

if __name__ == "__main__":
    seed_database()