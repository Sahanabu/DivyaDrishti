import pandas as pd
import numpy as np
import os
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# =======================================================
# 1. GENERATE SYNTHETIC DATASET
# =======================================================
def generate_synthetic_data(num_samples=10000):
    np.random.seed(42)
    data = []
    
    events = ["NORMAL", "BRAKING", "TURNING", "LANE_DEPARTURE", "DROWSINESS", "IMPACT", "FALL"]
    
    for _ in range(num_samples):
        # Pick a random driving event
        event = np.random.choice(events, p=[0.5, 0.1, 0.1, 0.1, 0.1, 0.05, 0.05])
        
        # Base Defaults (NORMAL)
        ear = np.random.normal(0.33, 0.02)
        eye_closed_duration = 0.0
        blink_rate = np.random.normal(15, 3)
        lane_deviation = np.random.normal(0, 0.05)
        lane_departure = False
        object_count = np.random.randint(0, 3)
        accel_magnitude = np.random.normal(1.0, 0.1) # 1G resting
        pitch = np.random.normal(0, 5)
        roll = np.random.normal(0, 5)
        gyro_magnitude = np.random.normal(0, 5)
        speed = np.random.normal(60, 10)
        mq3 = np.random.normal(200, 20)
        
        risk = "LOW"
        
        # Inject physics-based signatures for each event
        if event == "DROWSINESS":
            ear = np.random.normal(0.15, 0.02)
            eye_closed_duration = np.random.uniform(1.5, 4.0)
            lane_deviation = np.random.normal(0.2, 0.1)
            risk = "HIGH"
        elif event == "BRAKING":
            accel_magnitude = np.random.uniform(2.0, 4.0)
            pitch = np.random.uniform(15, 30)
            speed = np.random.uniform(10, 40)
            risk = "MEDIUM"
        elif event == "TURNING":
            gyro_magnitude = np.random.uniform(30, 90)
            roll = np.random.uniform(10, 25)
            risk = "LOW"
        elif event == "LANE_DEPARTURE":
            lane_deviation = np.random.uniform(0.3, 0.6)
            lane_departure = True
            risk = "MEDIUM"
        elif event == "IMPACT":
            accel_magnitude = np.random.uniform(6.0, 15.0)
            gyro_magnitude = np.random.uniform(100, 300)
            speed = 0
            risk = "CRITICAL"
        elif event == "FALL":
            accel_magnitude = np.random.uniform(2.0, 5.0)
            pitch = np.random.uniform(60, 180)
            roll = np.random.uniform(60, 180)
            risk = "CRITICAL"
            
        row = {
            "ear": ear,
            "eye_closed_duration": eye_closed_duration,
            "blink_rate": blink_rate,
            "lane_deviation": lane_deviation,
            "lane_departure": int(lane_departure),
            "object_count": object_count,
            "accel_magnitude": accel_magnitude,
            "pitch": pitch,
            "roll": roll,
            "gyro_magnitude": gyro_magnitude,
            "speed": speed,
            "mq3": mq3,
            "event_label": event,
            "risk_label": risk
        }
        data.append(row)
        
    df = pd.DataFrame(data)
    os.makedirs("../dataset", exist_ok=True)
    csv_path = "../dataset/divyadrishti_synthetic.csv"
    df.to_csv(csv_path, index=False)
    print(f"Generated 10,000 synthetic rows at {csv_path}")
    return df

# =======================================================
# 2. TRAIN RANDOM FOREST MODELS
# =======================================================
def train_models(df):
    X = df.drop(columns=["event_label", "risk_label"])
    y_event = df["event_label"]
    y_risk = df["risk_label"]
    
    # Train Event Classification Model
    X_train, X_test, y_train, y_test = train_test_split(X, y_event, test_size=0.2, random_state=42)
    rf_event = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_event.fit(X_train, y_train)
    acc = accuracy_score(y_test, rf_event.predict(X_test))
    print(f"Event Model Validation Accuracy: {acc*100:.2f}%")
    
    # Train Risk Prediction Model
    X_train, X_test, y_train, y_test = train_test_split(X, y_risk, test_size=0.2, random_state=42)
    rf_risk = RandomForestClassifier(n_estimators=50, random_state=42)
    rf_risk.fit(X_train, y_train)
    acc2 = accuracy_score(y_test, rf_risk.predict(X_test))
    print(f"Risk Model Validation Accuracy: {acc2*100:.2f}%")
    
    # Save the models
    os.makedirs("saved", exist_ok=True)
    joblib.dump(rf_event, "saved/event_random_forest.joblib")
    joblib.dump(rf_risk, "saved/risk_random_forest.joblib")
    print("Models saved to ai/models/saved/")
    
if __name__ == "__main__":
    df = generate_synthetic_data()
    train_models(df)
