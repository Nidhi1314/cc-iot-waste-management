import os
import random
import uuid
import psycopg2
from psycopg2 import extras
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
TABLE_SMART_BINS = "smart_bins"
TABLE_SENSOR_DATA = "sensor_data"

def generate_sensor_data(bin_id, base_fill_rate, current_time):
    """Generates synthetic sensor data for a specific time."""
    # Simulate day/night and weekday/weekend patterns
    hour = current_time.hour
    is_weekend = current_time.weekday() >= 5
    
    # Base fill rate multiplier
    multiplier = 1.0
    
    # Higher fill rates during daytime (8 AM to 8 PM)
    if 8 <= hour <= 20:
        multiplier *= 1.5
    else:
        multiplier *= 0.5
        
    # Lower fill rates on weekends (e.g., in a commercial area)
    if is_weekend:
        multiplier *= 0.6
        
    # Introduce some randomness
    actual_fill_rate = base_fill_rate * multiplier * random.uniform(0.8, 1.2)
    
    return actual_fill_rate

def main():
    if not DATABASE_URL:
        print("Hata: DATABASE_URL .env dosyasında bulunamadı!")
        return

    conn = None
    cursor = None
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cursor = conn.cursor()

        # 1. Fetch all bins
        cursor.execute(f"SELECT id FROM {TABLE_SMART_BINS};")
        bins = cursor.fetchall()
        
        if not bins:
            print("No bins found. Please run seed_data.py first.")
            return
            
        print(f"Found {len(bins)} bins. Generating 90 days of synthetic ML data...")
        
        # 2. Clear existing sensor data
        cursor.execute(f"TRUNCATE TABLE {TABLE_SENSOR_DATA} CASCADE;")
        
        # 3. Generate data for the last 90 days, every 4 hours
        end_time = datetime.now()
        start_time = end_time - timedelta(days=90)
        
        sensor_records = []
        
        for bin_row in bins:
            bin_id = bin_row[0]
            current_time = start_time
            current_fill = random.uniform(0, 20) # Start with some random fill
            
            # Each bin has a slightly different base fill characteristic
            base_fill_rate = random.uniform(1.0, 3.0) # Fill % increase per 4 hours
            
            while current_time < end_time:
                fill_increase = generate_sensor_data(bin_id, base_fill_rate, current_time)
                current_fill += fill_increase
                
                # If bin is full (>90%), simulate a collection (reset to 0-5%)
                if current_fill >= 90:
                    current_fill = random.uniform(0, 5)
                
                # Cap at 100% just in case
                current_fill = min(100.0, current_fill)
                
                sensor_records.append({
                    "id": str(uuid.uuid4()),
                    "bin_id": bin_id,
                    "measure_distance_cm": 150.0 - (150.0 * current_fill / 100.0), # Assuming total depth 150cm
                    "fill_percentage": round(current_fill, 2),
                    "battery_voltage": round(random.uniform(3.5, 4.2), 2),
                    "recorded_at": current_time,
                    "created_at": current_time
                })
                
                current_time += timedelta(hours=4)
                
        print(f"Generated {len(sensor_records)} sensor readings. Inserting into DB...")
        
        insert_query = f"""
            INSERT INTO {TABLE_SENSOR_DATA} (
                id, bin_id, measure_distance_cm, fill_percentage, battery_voltage, recorded_at, created_at
            ) VALUES (
                %(id)s, %(bin_id)s, %(measure_distance_cm)s, %(fill_percentage)s, %(battery_voltage)s, %(recorded_at)s, %(created_at)s
            );
        """
        
        # Batch insert chunks of 5000 to avoid memory issues
        chunk_size = 5000
        for i in range(0, len(sensor_records), chunk_size):
            chunk = sensor_records[i:i + chunk_size]
            extras.execute_batch(cursor, insert_query, chunk)
            
        conn.commit()
        print("Successfully generated and saved 90 days of synthetic ML data!")

    except (Exception, psycopg2.Error) as error:
        if conn:
            conn.rollback()
        print(f"Database error: {error}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
