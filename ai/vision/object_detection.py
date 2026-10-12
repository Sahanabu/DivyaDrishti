import cv2
from ultralytics import YOLO

class ObjectDetector:
    def __init__(self):
        self.model = YOLO("yolov8n.pt")
        # COCO mapping for relevant vehicle/person classes
        self.relevant_classes = {
            0: "person",
            1: "bicycle",
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck"
        }
        # Approximate real-world widths in meters for distance estimation
        self.real_widths = {
            "person": 0.5,
            "bicycle": 0.6,
            "car": 1.8,
            "motorcycle": 0.8,
            "bus": 2.5,
            "truck": 2.5
        }
        # Assumed focal length in pixels (standard webcam proxy)
        self.focal_length = 700 
        
    def process(self, frame, output_frame=None):
        results = self.model(frame, verbose=False)
        
        draw_frame = output_frame if output_frame is not None else frame.copy()
        draw_frame = results[0].plot(img=draw_frame)
        
        obj_features = {
            "object_count": 0,
            "person_count": 0,
            "car_count": 0,
            "motorcycle_count": 0,
            "truck_count": 0,
            "bus_count": 0,
            "closest_object": "none",
            "largest_bbox_area": 0.0,
            "average_confidence": 0.0
        }
        
        boxes = results[0].boxes
        if len(boxes) > 0:
            total_conf = 0
            min_distance = float('inf')
            closest_obj_name = "none"
            
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = box.conf[0].item()
                
                # Check if it's a relevant class for safety
                if cls_id in self.relevant_classes:
                    obj_features["object_count"] += 1
                    class_name = self.relevant_classes[cls_id]
                    
                    if class_name == "person": obj_features["person_count"] += 1
                    elif class_name == "car": obj_features["car_count"] += 1
                    elif class_name == "motorcycle": obj_features["motorcycle_count"] += 1
                    elif class_name == "truck": obj_features["truck_count"] += 1
                    elif class_name == "bus": obj_features["bus_count"] += 1
                    
                    total_conf += conf
                    
                    # Extract dimensions
                    x, y, w, h = box.xywh[0].tolist()
                    area = w * h
                    
                    # Estimate distance in meters using pinhole camera model
                    # Distance = (Real_Width * Focal_Length) / Pixel_Width
                    real_w = self.real_widths.get(class_name, 1.0)
                    distance_m = (real_w * self.focal_length) / w if w > 0 else 0
                    
                    # Draw live distance on the frame
                    xmin, ymin, xmax, ymax = box.xyxy[0].tolist()
                    label = f"{distance_m:.1f}m"
                    
                    # Draw background box for text readability at BOTTOM-LEFT to avoid YOLO label
                    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                    cv2.rectangle(draw_frame, (int(xmin), int(ymax) - th - 10), 
                                  (int(xmin) + tw, int(ymax)), (0, 0, 0), -1)
                    # Draw text inside the bottom-left of the box
                    cv2.putText(draw_frame, label, (int(xmin), int(ymax) - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                    
                    # Proximity tracking
                    if area > obj_features["largest_bbox_area"]:
                        obj_features["largest_bbox_area"] = round(area, 2)
                        
                    if distance_m < min_distance and distance_m > 0:
                        min_distance = distance_m
                        closest_obj_name = class_name
                        
            if obj_features["object_count"] > 0:
                obj_features["average_confidence"] = round(total_conf / obj_features["object_count"], 2)
                obj_features["closest_object"] = closest_obj_name
                
        if output_frame is not None:
            output_frame[:] = draw_frame
            
        return draw_frame, obj_features
