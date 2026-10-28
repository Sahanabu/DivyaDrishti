"""
DivyaDrishti Hybrid Sensor-Fusion Risk Engine
Combines physics-based edge rules with machine learning classification.
Evaluates Driver State, Environment Hazards, and Helmet Telemetry.
"""

import math
from typing import Dict, Tuple

class HybridRiskEngine:
    def __init__(self, ml_engine=None):
        self.ml_engine = ml_engine

    def evaluate(self, fused_vector: Dict) -> Tuple[str, str, float, str]:
        """
        Evaluates fused telemetry and vision vectors.
        Returns: (event, risk_level, confidence, rationale)
        """
        # 1. Physics / Safety Hard Overrides (Zero Latency Safety Rules)
        
        # A. High-G Impact / Collision (Crash)
        accel = fused_vector.get("accel_magnitude", 1.0)
        speed = fused_vector.get("speed", 0.0)
        if accel >= 4.5:
            return "IMPACT", "CRITICAL", 98.5, f"High impact deceleration detected ({accel:.2f} G)"

        # B. Motorcycle Fall Detection (Extreme Roll / Pitch)
        pitch = abs(fused_vector.get("pitch", 0.0))
        roll = abs(fused_vector.get("roll", 0.0))
        if roll > 65.0 or pitch > 65.0:
            return "FALL", "CRITICAL", 96.0, f"Vehicle tilt exceeding safety bounds (Roll: {roll:.1f}°, Pitch: {pitch:.1f}°)"

        # C. Driver Unconsciousness (>10s continuous eye closure)
        eye_duration = fused_vector.get("eye_closed_duration", 0.0)
        if eye_duration >= 10.0:
            return "UNCONSCIOUS_DROWSINESS", "CRITICAL", 99.0, f"Driver eyes closed for {eye_duration:.1f}s (>10s SOS threshold)"

        # D. Forward Collision Warning (FCW: TTC < 2.5s and closing in)
        ttc = fused_vector.get("time_to_collision", float('inf'))
        min_dist = fused_vector.get("min_distance_m", float('inf'))
        if ttc < 2.5 and min_dist < 20.0 and speed > 15.0:
            return "FORWARD_COLLISION_WARNING", "HIGH", 94.0, f"Obstacle closing in rapidly (TTC: {ttc:.1f}s, Dist: {min_dist:.1f}m)"

        # E. Driver Inattention / Distraction (Head turned away > 3s)
        is_distracted = fused_vector.get("distracted", False)
        distract_dur = fused_vector.get("distraction_duration", 0.0)
        if is_distracted and distract_dur > 2.5:
            return "DISTRACTED", "HIGH", 92.0, f"Driver inattention detected (looking away for {distract_dur:.1f}s)"

        # F. Alcohol Impairment (MQ-3 ADC > 400)
        mq3 = fused_vector.get("mq3", 0)
        if mq3 > 400:
            return "ALCOHOL_WARNING", "HIGH", 95.0, f"Elevated blood-alcohol vapor detected (MQ-3: {mq3} ADC)"

        # G. Severe Drowsiness (2.0s to 10s eye closure or microsleep)
        if eye_duration >= 2.0:
            return "SEVERE_DROWSINESS", "HIGH", 93.0, f"Microsleep episode detected ({eye_duration:.1f}s eye closure)"

        # H. Lane Departure
        if fused_vector.get("lane_departure", False) or abs(fused_vector.get("lane_deviation", 0.0)) > 1.2:
            return "LANE_DEPARTURE", "MEDIUM", 88.0, "Vehicle drifted across road lane boundary"

        # 2. Machine Learning Model Fallback for Ambiguous Scenarios
        if self.ml_engine and self.ml_engine.models_loaded:
            ml_event, ml_risk, ml_conf = self.ml_engine.predict(fused_vector)
            if ml_event != "UNKNOWN":
                return ml_event, ml_risk, ml_conf, "Inferred from Multi-Sensor Random Forest classifier"

        # 3. Default Safe State
        return "NORMAL", "LOW", 95.0, "Vehicle and driver state optimal"

    def compute_safety_score_penalty(self, event: str) -> int:
        penalties = {
            "IMPACT": 40,
            "FALL": 35,
            "UNCONSCIOUS_DROWSINESS": 30,
            "FORWARD_COLLISION_WARNING": 15,
            "DISTRACTED": 10,
            "SEVERE_DROWSINESS": 15,
            "ALCOHOL_WARNING": 25,
            "LANE_DEPARTURE": 8,
            "BRAKING": 5,
            "NORMAL": 0
        }
        return penalties.get(event, 0)
