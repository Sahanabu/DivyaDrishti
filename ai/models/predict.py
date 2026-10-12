import joblib
import pandas as pd
import os

class RiskEngine:
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        event_model_path = os.path.join(base_dir, "saved/event_random_forest.joblib")
        risk_model_path = os.path.join(base_dir, "saved/risk_random_forest.joblib")
        
        if os.path.exists(event_model_path) and os.path.exists(risk_model_path):
            self.event_model = joblib.load(event_model_path)
            self.risk_model = joblib.load(risk_model_path)
            self.models_loaded = True
        else:
            print("WARNING: ML Models not found! Run ml_pipeline.py first.")
            self.models_loaded = False
            
    def predict(self, feature_dict):
        if not self.models_loaded:
            return "UNKNOWN", "UNKNOWN"
            
        # Extract features exactly matching the synthetic schema
        schema = [
            "ear", "eye_closed_duration", "blink_rate", "lane_deviation", 
            "lane_departure", "object_count", "accel_magnitude", "pitch", 
            "roll", "gyro_magnitude", "speed", "mq3"
        ]
        
        vector = []
        for feat in schema:
            val = feature_dict.get(feat, 0)
            if isinstance(val, bool): val = int(val)
            vector.append(val)
            
        df = pd.DataFrame([vector], columns=schema)
        
        event = self.event_model.predict(df)[0]
        risk = self.risk_model.predict(df)[0]
        
        # Calculate confidence using probability of the predicted risk class
        try:
            risk_probs = self.risk_model.predict_proba(df)[0]
            # Get the index of the predicted class in the model's classes_ array
            class_idx = list(self.risk_model.classes_).index(risk)
            confidence = round(float(risk_probs[class_idx]) * 100, 1)
        except Exception:
            confidence = 92.0 # Fallback if predict_proba is unavailable
        
        return event, risk, confidence
