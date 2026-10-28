"""
DivyaDrishti ML Training & Evaluation Pipeline
Trains Random Forest classifiers for Sensor Fusion Risk & Event Prediction.
Computes cross-validation, feature importances, and validation metrics.
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, f1_score

DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "dataset", "divyadrishti_synthetic.csv")
SAVED_DIR = os.path.join(os.path.dirname(__file__), "saved")
os.makedirs(SAVED_DIR, exist_ok=True)

def ensure_dataset():
    if os.path.exists(DATASET_PATH) and os.path.getsize(DATASET_PATH) > 1000:
        return pd.read_csv(DATASET_PATH)
    
    print("[TRAINING] Dataset not found. Generating synthetic dataset...")
    from ml_pipeline import generate_synthetic_data
    return generate_synthetic_data(10000)

def train_and_evaluate():
    print("==================================================")
    print("       DIVYADRISHTI ML MODEL TRAINING PIPELINE    ")
    print("==================================================")
    
    df = ensure_dataset()
    print(f"Loaded dataset: {df.shape[0]} rows, {df.shape[1]} features")

    # Features and targets
    X = df.drop(columns=["event_label", "risk_label"], errors='ignore')
    feature_names = list(X.columns)
    
    y_event = df["event_label"]
    y_risk = df["risk_label"]

    # 1. EVENT CLASSIFICATION MODEL
    print("\n--- Training Event Classification Model ---")
    X_train_e, X_test_e, y_train_e, y_test_e = train_test_split(X, y_event, test_size=0.2, random_state=42, stratify=y_event)
    
    rf_event = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    rf_event.fit(X_train_e, y_train_e)
    
    preds_e = rf_event.predict(X_test_e)
    acc_e = accuracy_score(y_test_e, preds_e)
    f1_e = f1_score(y_test_e, preds_e, average='weighted')
    cv_scores_e = cross_val_score(rf_event, X, y_event, cv=5, scoring='accuracy')
    
    print(f"Event Model Accuracy: {acc_e * 100:.2f}% | F1-Score: {f1_e:.4f}")
    print(f"5-Fold Cross Validation: {cv_scores_e.mean() * 100:.2f}% (+/- {cv_scores_e.std() * 100:.2f}%)")

    # Feature Importance for Events
    event_importances = dict(zip(feature_names, [round(float(v), 4) for v in rf_event.feature_importances_]))
    sorted_event_imp = sorted(event_importances.items(), key=lambda x: x[1], reverse=True)
    print("Top Event Features:", sorted_event_imp[:4])

    # 2. RISK PREDICTION MODEL
    print("\n--- Training Risk Prediction Model ---")
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X, y_risk, test_size=0.2, random_state=42, stratify=y_risk)
    
    rf_risk = RandomForestClassifier(
        n_estimators=60,
        max_depth=10,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    rf_risk.fit(X_train_r, y_train_r)
    
    preds_r = rf_risk.predict(X_test_r)
    acc_r = accuracy_score(y_test_r, preds_r)
    f1_r = f1_score(y_test_r, preds_r, average='weighted')
    cv_scores_r = cross_val_score(rf_risk, X, y_risk, cv=5, scoring='accuracy')
    
    print(f"Risk Model Accuracy: {acc_r * 100:.2f}% | F1-Score: {f1_r:.4f}")
    print(f"5-Fold Cross Validation: {cv_scores_r.mean() * 100:.2f}% (+/- {cv_scores_r.std() * 100:.2f}%)")

    # 3. SAVE MODEL ARTIFACTS
    event_model_path = os.path.join(SAVED_DIR, "event_random_forest.joblib")
    risk_model_path = os.path.join(SAVED_DIR, "risk_random_forest.joblib")
    joblib.dump(rf_event, event_model_path)
    joblib.dump(rf_risk, risk_model_path)

    # 4. EXPORT EVALUATION METRICS REPORT
    report = {
        "dataset_samples": len(df),
        "features": feature_names,
        "event_model": {
            "accuracy": round(acc_e * 100, 2),
            "f1_score": round(f1_e, 4),
            "cv_accuracy_mean": round(cv_scores_e.mean() * 100, 2),
            "feature_importance": dict(sorted_event_imp)
        },
        "risk_model": {
            "accuracy": round(acc_r * 100, 2),
            "f1_score": round(f1_r, 4),
            "cv_accuracy_mean": round(cv_scores_r.mean() * 100, 2)
        }
    }
    
    report_path = os.path.join(SAVED_DIR, "model_performance_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\nModels and metrics successfully exported to: {SAVED_DIR}")
    return report

if __name__ == "__main__":
    train_and_evaluate()
