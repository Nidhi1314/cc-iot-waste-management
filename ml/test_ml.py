import os
import psycopg2
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def train():
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    
    # We want to predict fill_increase over the next 4 hours
    # Since we recorded every 4 hours, the difference between t and t-1 is the increase
    query = """
    SELECT bin_id, fill_percentage, recorded_at 
    FROM sensor_data 
    ORDER BY bin_id, recorded_at
    """
    
    df = pd.read_sql(query, conn)
    conn.close()
    
    # Preprocessing
    df['recorded_at'] = pd.to_datetime(df['recorded_at'])
    df['hour'] = df['recorded_at'].dt.hour
    df['day_of_week'] = df['recorded_at'].dt.dayofweek
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    
    # Calculate target: fill percentage increase in the next 4 hours
    df['next_fill'] = df.groupby('bin_id')['fill_percentage'].shift(-1)
    df = df.dropna()
    
    # Only keep rows where next_fill > fill_percentage (meaning it didn't get collected)
    df = df[df['next_fill'] >= df['fill_percentage']]
    df['fill_increase'] = df['next_fill'] - df['fill_percentage']
    
    # Encode bin_id
    le = LabelEncoder()
    df['bin_id_encoded'] = le.fit_transform(df['bin_id'])
    
    features = ['bin_id_encoded', 'hour', 'is_weekend']
    X = df[features]
    y = df['fill_increase']
    
    model = RandomForestRegressor(n_estimators=50, random_state=42)
    model.fit(X, y)
    
    # Save the model and encoder
    joblib.dump(model, 'rf_model.pkl')
    joblib.dump(le, 'le_bin_id.pkl')
    
    print(f"Model trained! R2 Score: {model.score(X, y):.4f}")

if __name__ == "__main__":
    train()
