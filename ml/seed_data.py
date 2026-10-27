
import os
import random
import uuid
import psycopg2

from psycopg2.extras import execute_batch
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

NUM_BINS = 50

# Approximate Delhi NCR demo locations.
# These are simulated collection points.
DELHI_LOCATIONS = [
    ("Connaught Place, New Delhi", 28.6315, 77.2167),
    ("Karol Bagh, New Delhi", 28.6519, 77.1909),
    ("India Gate Area, New Delhi", 28.6129, 77.2295),
    ("Lajpat Nagar, New Delhi", 28.5677, 77.2433),
    ("Saket, New Delhi", 28.5244, 77.2066),
    ("Hauz Khas, New Delhi", 28.5494, 77.2001),
    ("Nehru Place, New Delhi", 28.5491, 77.2533),
]

CAPACITIES = [100.0, 150.0, 200.0]


def generate_bins(count=NUM_BINS):
    # Fixed seed makes demos reproducible.
    rng = random.Random(42)
    bins = []

    for index in range(count):
        name, base_lat, base_lng = DELHI_LOCATIONS[
            index % len(DELHI_LOCATIONS)
        ]

        # Small geographic offsets keep collection
        # points near each selected Delhi locality.
        latitude = base_lat + rng.uniform(-0.003, 0.003)
        longitude = base_lng + rng.uniform(-0.003, 0.003)

        fill_level = rng.randint(10, 95)

        bins.append({
            "id": str(uuid.uuid4()),
            "address": f"{name} - Demo Bin {index + 1}",
            "latitude": round(latitude, 6),
            "longitude": round(longitude, 6),
            "total_depth_cm": 150.0,
            "max_capacity_kg": rng.choice(CAPACITIES),
            "current_fill_level": fill_level,
            "status": "ACTIVE",
        })

    return bins


def main():
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is missing from the environment"
        )

    print("Connecting to Neon PostgreSQL...")

    conn = psycopg2.connect(DATABASE_URL)

    try:
        with conn.cursor() as cursor:
            # Preserve the configurable fill threshold.
            cursor.execute("""
                SELECT fill_threshold
                FROM system_settings
                WHERE id = 1
            """)

            row = cursor.fetchone()
            threshold = row[0] if row else 75

            # IMPORTANT:
            # Deletes existing bin, route, and sensor data.
            # Only use with a disposable demo database.
            print("Clearing old demo bins and readings...")

            cursor.execute("""
                TRUNCATE TABLE
                    routes,
                    sensor_data,
                    smart_bins
                CASCADE
            """)

            bins = generate_bins()

            for bin_data in bins:
                bin_data["needs_collection"] = (
                    bin_data["current_fill_level"] >= threshold
                )

            insert_query = """
                INSERT INTO smart_bins (
                    id,
                    address,
                    latitude,
                    longitude,
                    total_depth_cm,
                    max_capacity_kg,
                    current_fill_level,
                    status,
                    needs_collection,
                    last_updated
                )
                VALUES (
                    %(id)s,
                    %(address)s,
                    %(latitude)s,
                    %(longitude)s,
                    %(total_depth_cm)s,
                    %(max_capacity_kg)s,
                    %(current_fill_level)s,
                    %(status)s,
                    %(needs_collection)s,
                    NOW()
                )
            """

            execute_batch(cursor, insert_query, bins)

        conn.commit()

        print("Successfully created Delhi NCR demo data!")
        print(f"Total bins: {len(bins)}")
        print(f"Collection threshold: {threshold}%")
        print("Database settings and accounts preserved.")

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    main()
