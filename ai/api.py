"""
DivyaDrishti AI Edge REST API Module
Provides microservice endpoints for telemetry ingestion and health checking.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(
    title="DivyaDrishti AI Edge Perception Service",
    version="2.4.0",
    description="Edge Computer Vision & Telemetry Fusion Microservice"
)

class TelemetryPayload(BaseModel):
    speed: Optional[float] = 0.0
    accel_magnitude: Optional[float] = 1.0
    pitch: Optional[float] = 0.0
    roll: Optional[float] = 0.0
    mq3: Optional[int] = 120
    ear: Optional[float] = 0.30
    lane_deviation: Optional[float] = 0.0

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "DivyaDrishti AI Edge Perception",
        "version": "2.4.0",
        "hardware_acceleration": "DirectShow / CUDA (if available)"
    }

@app.get("/status")
def pipeline_status():
    return {
        "running": True,
        "vision_subsystems": ["YOLOv8 Objects", "MediaPipe Face & Head Pose", "Polynomial Lane Tracker"],
        "fusion": "Hybrid Random Forest + Physics Engine"
    }
