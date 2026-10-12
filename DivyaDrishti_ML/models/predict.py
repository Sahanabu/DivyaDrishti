from pathlib import Path
import joblib, pandas as pd

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"models"/"saved"
event_model=joblib.load(OUT/"event_random_forest.joblib")
risk_model=joblib.load(OUT/"risk_random_forest.joblib")
FEATURES=joblib.load(OUT/"feature_schema.joblib")

def predict(feature_dict):
    row={f:feature_dict.get(f,0) for f in FEATURES}
    X=pd.DataFrame([row],columns=FEATURES)
    ep=event_model.predict_proba(X)[0]
    rp=risk_model.predict_proba(X)[0]
    return {
        "event":event_model.classes_[ep.argmax()],
        "event_confidence":round(float(ep.max()),4),
        "risk":risk_model.classes_[rp.argmax()],
        "risk_confidence":round(float(rp.max()),4)
    }
