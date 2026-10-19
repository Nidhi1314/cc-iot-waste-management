import psycopg2
from psycopg2.extras import execute_batch
import random
import uuid
import os
from dotenv import load_dotenv

# .env dosyasındaki DATABASE_URL'i yükle
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Tablo isimleri (Küçük harf formatı)
TABLE_SMART_BINS = "smart_bins"
TABLE_ROUTES = "routes"
TABLE_SENSOR_DATA = "sensor_data"

# Manhattan Merkez Koordinatları
BASE_LAT = 40.7580
BASE_LNG = -73.9855

def generate_nyc_bins(count=50):
    bins = []
    for i in range(count):
        lat_offset = random.uniform(-0.0150, 0.0150)
        lng_offset = random.uniform(-0.0150, 0.0150)
        
        #execute_batch için verileri Tuple halinde hazırlıyoruz
        bins.append((
            str(uuid.uuid4()),                      # id
            f"Manhattan, NY - Bin {i+1}",           # address (Eksik olan buydu!)
            BASE_LAT + lat_offset,                  # latitude
            BASE_LNG + lng_offset,                  # longitude
            150.0,                                  # total_depth_cm (Eksik olan buydu!)
            random.choice([100.0, 150.0, 200.0]),   # max_capacity_kg
            0,                                      # current_fill_level
            "ACTIVE",                               # status
            False                                   # needs_collection
        ))
    return bins

def seed_database():
    conn = None
    try:
        print("🔌 Neon PostgreSQL veritabanına bağlanılıyor...")
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("🧹 Eski veriler kökünden temizleniyor (TRUNCATE CASCADE)...")
        cur.execute(f"TRUNCATE TABLE {TABLE_SMART_BINS}, {TABLE_ROUTES}, {TABLE_SENSOR_DATA} CASCADE;")
        
        print("🗽 Manhattan/Times Square bölgesi çevresinde 50 adet çöp kutusu üretiliyor...")
        nyc_bins = generate_nyc_bins(50)
        
        # INSERT sorgusuna address ve total_depth_cm sütunları eklendi
        insert_query = f"""
            INSERT INTO {TABLE_SMART_BINS} 
            (id, address, latitude, longitude, total_depth_cm, max_capacity_kg, current_fill_level, status, needs_collection)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        execute_batch(cur, insert_query, nyc_bins)
        conn.commit()
        print("✅ BAŞARILI! 50 Adet New York Çöp Kutusu Neon'a eklendi ve hepsi %0 dolu!")

    except Exception as e:
        print(f"❌ Veritabanı işlemi sırasında hata oluştu: {e}")
        if conn:
            conn.rollback() # Hata olursa işlemleri geri al (Güvenlik)
    finally:
        if conn:
            cur.close()
            conn.close()
            print("🔌 PostgreSQL bağlantısı kapatıldı.")

if __name__ == "__main__":
    seed_database()