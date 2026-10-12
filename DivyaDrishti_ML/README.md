# DivyaDrishti ML Bootstrap

Contains a 10,000-row synthetic feature dataset and trained Random Forest models.

## Important
This synthetic data is for pipeline development, integration, and demonstration.
It is NOT real-world ground truth and its test metrics must NOT be presented as
real driving performance.

## Structure
- dataset/divyadrishti_training.csv
- models/train.py
- models/predict.py
- models/saved/event_random_forest.joblib
- models/saved/risk_random_forest.joblib
- models/saved/feature_schema.joblib

## Retraining
Run from the `DivyaDrishti_ML` directory:
`python models/train.py`

Later, append synchronized real rows from `data_collector.py` and retrain.
