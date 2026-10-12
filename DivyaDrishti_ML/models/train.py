from pathlib import Path
import joblib, pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

ROOT=Path(__file__).resolve().parents[1]
CSV=ROOT/"dataset"/"divyadrishti_training.csv"
OUT=ROOT/"models"/"saved"
OUT.mkdir(parents=True,exist_ok=True)

FEATURES=["ear","eye_closed_duration","blink_rate","yawning","lane_deviation","lane_departure",
"object_count","closest_object_distance_m","accel_magnitude","pitch","roll","gyro_magnitude","speed_kmh","mq3"]

df=pd.read_csv(CSV)
X=df[FEATURES]

def fit(y,name):
    Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=.20,random_state=42,stratify=y)
    model=RandomForestClassifier(n_estimators=300,max_depth=16,min_samples_leaf=2,
                                 class_weight="balanced",random_state=42,n_jobs=-1)
    model.fit(Xtr,ytr)
    pred=model.predict(Xte)
    print(f"\n===== {name} =====")
    print(classification_report(yte,pred,digits=4))
    print("Confusion matrix:\n",confusion_matrix(yte,pred))
    joblib.dump(model,OUT/name+".joblib")
    return model

fit(df["event_label"],"event_random_forest")
fit(df["risk_label"],"risk_random_forest")
joblib.dump(FEATURES,OUT/"feature_schema.joblib")
print("Models saved to",OUT)
