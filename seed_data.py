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

# Coğrafi Merkez: Manhattan, Times Square
CENTER_LAT = 40.7580
CENTER_LON = -73.9855
LAT_SPREAD = 0.015  # Enlemde rastgele dağılım (Yaklaşık 1.5 - 2 km yarıçap)
LON_SPREAD = 0.015  # Boylamda rastgele dağılım

# Konfigürasyon
NUM_BINS = 50
CAPACITIES = [100.0, 150.0, 200.0]

# Tablo isimlerini esnek bir yapıda tutuyoruz. 
# Eğer şemanızda tabloları büyük harfle (CamelCase vb.) oluşturduysanız,
# tırnak işaretleriyle escape etmelisiniz: TABLE_SMART_BINS = '"Smart_Bins"'
TABLE_SMART_BINS = "smart_bins"
TABLE_ROUTES = "routes"
TABLE_SENSOR_DATA = "sensor_data"

def generate_bin_data(index):
    """Tek bir çöp kutusu (Smart Bin) için Sıfırıncı Gün verisi üretir."""
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
        print("Hata: DATABASE_URL .env dosyasında bulunamadı!")
        print("Lütfen kök dizinde bir .env dosyası oluşturun ve Neon DB URL'nizi ekleyin.")
        return

    conn = None
    cursor = None
    try:
        # 1. Neon DB'ye bağlan
        print("Neon PostgreSQL veritabanına bağlanılıyor...")
        # Neon DB connection URL'leri bazen SSL gerektirebilir
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cursor = conn.cursor()

        # 2. Veritabanı Temizliği (TRUNCATE CASCADE - Nükleer Seçenek)
        print("Eski veriler kökünden temizleniyor (TRUNCATE CASCADE)...")
        truncate_query = f"TRUNCATE TABLE {TABLE_SMART_BINS}, {TABLE_ROUTES}, {TABLE_SENSOR_DATA} CASCADE;"
        cursor.execute(truncate_query)
        print("Veritabanı başarıyla temizlendi.")

        # 3. Kutu verilerini üret
        print(f"Manhattan/Times Square bölgesi çevresinde {NUM_BINS} adet çöp kutusu üretiliyor...")
        # Kutu adreslerinin 1'den başlaması için (1, NUM_BINS + 1) aralığını kullanıyoruz
        bins_data = [generate_bin_data(i) for i in range(1, NUM_BINS + 1)]

        # 4. Veritabanına Yükleme (Batch Insert)
        # Yeni kolonlar eklendi: address ve total_depth_cm. last_updated veritabanı tarafından NOW() ile doldurulacak.
        insert_query = f"""
            INSERT INTO {TABLE_SMART_BINS} (
                id, latitude, longitude, total_depth_cm, max_capacity_kg, status, current_fill_level, needs_collection, address, last_updated
            ) VALUES (
                %(id)s, %(latitude)s, %(longitude)s, %(total_depth_cm)s, %(max_capacity_kg)s, %(status)s, %(current_fill_level)s, %(needs_collection)s, %(address)s, NOW()
            );
        """
        
        # execute_batch ile verileri tek seferde gönderiyoruz (Performanslı I/O)
        extras.execute_batch(cursor, insert_query, bins_data)
        
        # Transaction'ı bitir (Commit)
        conn.commit()
        
        # 5. İşlem bitince başarı mesajı bas
        print("Başarılı: 50 adet Sıfırıncı Gün çöp kutusu verisi üretildi ve veritabanına kaydedildi.")

    except (Exception, psycopg2.Error) as error:
        # Hata durumunda işlemi geri al
        if conn:
            conn.rollback()
        print(f"Veritabanı işlemi sırasında hata oluştu: {error}")
    finally:
        # Bağlantıları güvenli şekilde kapat (Graceful Shutdown)
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("PostgreSQL bağlantısı kapatıldı.")

if __name__ == "__main__":
    main()
