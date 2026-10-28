"""
DivyaDrishti AI Subsystem Complete Automated Verification Suite
Tests Feature Engineering, ML Inference, Hybrid Risk Engine,
Computer Vision modules (YOLOv8, MediaPipe, Lane Tracker), and Edge FastAPI.
"""

import sys
import os
import time
import math
import numpy as np
import cv2

# Set path to include ai/ directory
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from features.feature_engineering import FeatureEngine
from models.predict import RiskEngine
from risk.risk_engine import HybridRiskEngine
from vision.lane_detection import LaneDetector
from vision.object_detection import ObjectDetector
from vision.drowsiness_detection import DrowsinessDetector
from api import app
from starlette.testclient import TestClient

def test_feature_engineering():
    print("• Testing FeatureEngine...")
    engine = FeatureEngine()
    obj_feat = {"object_count": 2, "min_distance_m": 8.5, "time_to_collision": 2.1}
    lane_feat = {"lane_detected": True, "lane_deviation": 0.12, "lane_departure": False}
    drowsy_feat = {"ear": 0.28, "eye_closed_duration": 0.0, "head_yaw": -4.5, "distracted": False}

    vector = engine.combine(obj_feat, lane_feat, drowsy_feat)
    assert vector["object_count"] == 2
    assert vector["lane_deviation"] == 0.12
    assert vector["distracted"] is False
    print("  FeatureEngine combine PASSED ✓")

def test_ml_risk_models():
    print("• Testing Trained ML Random Forest Models...")
    risk_engine = RiskEngine()
    assert risk_engine.models_loaded, "ML models must be loaded from saved/ directory"

    # Test 1: Normal vector
    norm_vec = {
        "ear": 0.32, "eye_closed_duration": 0.0, "blink_rate": 18,
        "lane_deviation": 0.05, "lane_departure": 0, "object_count": 1,
        "accel_magnitude": 1.0, "pitch": 2.0, "roll": 0.5,
        "gyro_magnitude": 0.1, "speed": 35.0, "mq3": 110
    }
    event, risk, conf = risk_engine.predict(norm_vec)
    assert event in ["NORMAL", "NO_HAZARD", "CLEAR"], f"Expected normal event, got {event}"
    assert conf >= 50.0
    print(f"  ML Normal Vector -> Event: {event}, Risk: {risk}, Conf: {conf}% PASSED ✓")

    # Test 2: Crash/Impact vector (High G + High Gyro shock + speed drops to 0)
    impact_vec = {
        "ear": 0.28, "eye_closed_duration": 0.0, "blink_rate": 15,
        "lane_deviation": 0.1, "lane_departure": 0, "object_count": 1,
        "accel_magnitude": 8.5, "pitch": 5.0, "roll": 8.0,
        "gyro_magnitude": 180.0, "speed": 0.0, "mq3": 120
    }
    event, risk, conf = risk_engine.predict(impact_vec)
    assert event in ["IMPACT", "COLLISION", "FALL", "CRASH"], f"Expected crash event, got {event}"
    assert risk in ["CRITICAL", "HIGH"], f"Expected high risk, got {risk}"
    print(f"  ML Crash Vector -> Event: {event}, Risk: {risk}, Conf: {conf}% PASSED ✓")

    # Test 3: Drowsiness vector
    drowsy_vec = {
        "ear": 0.14, "eye_closed_duration": 2.8, "blink_rate": 8,
        "lane_deviation": 0.25, "lane_departure": 0, "object_count": 0,
        "accel_magnitude": 1.0, "pitch": 0.0, "roll": 0.0,
        "gyro_magnitude": 1.0, "speed": 45.0, "mq3": 150
    }
    event, risk, conf = risk_engine.predict(drowsy_vec)
    assert event == "DROWSINESS", f"Expected DROWSINESS, got {event}"
    assert risk in ["CRITICAL", "HIGH"], f"Expected high risk, got {risk}"
    print(f"  ML Drowsiness Vector -> Event: {event}, Risk: {risk}, Conf: {conf}% PASSED ✓")

def test_hybrid_risk_engine():
    print("• Testing Hybrid Zero-Latency Physics + ML Risk Engine...")
    ml_engine = RiskEngine()
    hybrid = HybridRiskEngine(ml_engine=ml_engine)

    # 1. High-G Impact Override
    event, risk, conf, rationale = hybrid.evaluate({"accel_magnitude": 5.0, "speed": 40.0})
    assert event == "IMPACT" and risk == "CRITICAL"
    print(f"  Physics High-G Impact: {rationale} PASSED ✓")

    # 2. Extreme Fall Tilt Override
    event, risk, conf, rationale = hybrid.evaluate({"roll": 72.0, "accel_magnitude": 1.0})
    assert event == "FALL" and risk == "CRITICAL"
    print(f"  Physics Extreme Fall: {rationale} PASSED ✓")

    # 3. Unconscious Drowsiness (>10s eyes closed)
    event, risk, conf, rationale = hybrid.evaluate({"eye_closed_duration": 10.5})
    assert event == "UNCONSCIOUS_DROWSINESS" and risk == "CRITICAL"
    print(f"  Physics Unconscious Drowsiness: {rationale} PASSED ✓")

    # 4. Forward Collision Warning (TTC < 2.5s at speed)
    event, risk, conf, rationale = hybrid.evaluate({
        "time_to_collision": 1.6,
        "min_distance_m": 12.0,
        "speed": 48.0
    })
    assert event == "FORWARD_COLLISION_WARNING" and risk == "HIGH"
    print(f"  Physics FCW: {rationale} PASSED ✓")

    # 5. Distraction (head looking away > 2.5s)
    event, risk, conf, rationale = hybrid.evaluate({
        "distracted": True,
        "distraction_duration": 3.1
    })
    assert event == "DISTRACTED" and risk == "HIGH"
    print(f"  Physics Distraction: {rationale} PASSED ✓")

    # 6. Alcohol Impairment (MQ-3 > 400 ADC)
    event, risk, conf, rationale = hybrid.evaluate({"mq3": 580})
    assert event == "ALCOHOL_WARNING" and risk == "HIGH"
    print(f"  Physics Alcohol Impairment: {rationale} PASSED ✓")

    # 7. Severe Drowsiness (2s-10s eye closure)
    event, risk, conf, rationale = hybrid.evaluate({"eye_closed_duration": 3.0})
    assert event == "SEVERE_DROWSINESS" and risk == "HIGH"
    print(f"  Physics Severe Drowsiness: {rationale} PASSED ✓")

    # 8. Lane Departure
    event, risk, conf, rationale = hybrid.evaluate({"lane_departure": True, "lane_deviation": 1.4})
    assert event == "LANE_DEPARTURE" and risk == "MEDIUM"
    print(f"  Physics Lane Departure: {rationale} PASSED ✓")

    # 9. Penalties test
    assert hybrid.compute_safety_score_penalty("IMPACT") == 40
    assert hybrid.compute_safety_score_penalty("FORWARD_COLLISION_WARNING") == 15
    assert hybrid.compute_safety_score_penalty("DISTRACTED") == 10
    assert hybrid.compute_safety_score_penalty("NORMAL") == 0
    print("  Safety score penalty matrix PASSED ✓")

def test_lane_detector():
    print("• Testing LaneDetector module...")
    detector = LaneDetector()
    
    # Create synthetic road frame with left and right painted lane markers
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    # Background road surface (dark gray)
    frame[240:, :] = (50, 50, 50)
    # White left lane (slanting)
    cv2.line(frame, (180, 480), (280, 260), (255, 255, 255), 8)
    # Yellow right lane (slanting)
    cv2.line(frame, (460, 480), (360, 260), (0, 220, 255), 8)

    features = detector.process(frame)
    assert "lane_detected" in features
    assert "lane_deviation" in features
    assert "lane_departure" in features
    print(f"  LaneDetector process output: {features} PASSED ✓")

def test_object_detector():
    print("• Testing YOLOv8 ObjectDetector module...")
    detector = ObjectDetector()
    assert detector.model is not None

    # Synthetic frame (black background)
    blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    draw_frame, features = detector.process(blank_frame)

    assert "object_count" in features
    assert "min_distance_m" in features
    assert "time_to_collision" in features
    assert "forward_collision_warning" in features
    assert features["object_count"] == 0
    assert features["forward_collision_warning"] is False
    print("  YOLOv8 ObjectDetector execution PASSED ✓")

def test_drowsiness_detector():
    print("• Testing MediaPipe Drowsiness & Head Pose Detector module...")
    model_path = os.path.join(os.path.dirname(__file__), "face_landmarker.task")
    detector = DrowsinessDetector(model_path=model_path)
    assert detector.landmarker is not None
    assert detector.model_points_3d.shape == (6, 3)

    # Process blank frame (ensures graceful handling when no face is in view)
    blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    features = detector.process(blank_frame)

    assert features["ear"] == 1.0
    assert features["eye_closed"] is False
    assert features["head_yaw"] == 0.0
    assert features["distracted"] is False
    detector.close()
    print("  MediaPipe Drowsiness & Head Pose execution PASSED ✓")

def test_edge_fastapi():
    print("• Testing FastAPI Edge Perception Service...")
    client = TestClient(app)

    res_health = client.get("/health")
    assert res_health.status_code == 200
    data_health = res_health.json()
    assert data_health["status"] == "healthy"
    assert "version" in data_health
    print(f"  GET /health: {data_health} PASSED ✓")

    res_status = client.get("/status")
    assert res_status.status_code == 200
    data_status = res_status.json()
    assert data_status["running"] is True
    assert len(data_status["vision_subsystems"]) == 3
    print(f"  GET /status: {data_status} PASSED ✓")

def run_all_ai_tests():
    print("\n" + "="*60)
    print("      DIVYADRISHTI AI & COMPUTER VISION TEST SUITE")
    print("="*60 + "\n")

    t0 = time.time()
    test_feature_engineering()
    test_ml_risk_models()
    test_hybrid_risk_engine()
    test_lane_detector()
    test_object_detector()
    test_drowsiness_detector()
    test_edge_fastapi()
    elapsed = time.time() - t0

    print("\n" + "-"*60)
    print(f"Results: All 7 AI subsystem test suites passed in {elapsed:.2f}s!")
    print("="*60 + "\n")

if __name__ == "__main__":
    run_all_ai_tests()
