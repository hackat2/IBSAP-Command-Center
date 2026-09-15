import os
os.environ["OPENCV_VIDEOIO_PRIORITY_MSMF"] = "0"
import time
from google import genai
from pydantic import BaseModel
from ultralytics import YOLO
import cv2
from fastapi.responses import StreamingResponse
import asyncio
import json
import random
from datetime import datetime
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

live_incident_state = {
    "incident_id": f"IB-{random.randint(1000, 9999)}",
    "zone": "Zone 17-B",
    "object_type": "CLEAR",
    "direction": "STATIC",
    "active_threats": 0,
    "risk_level": "NORMAL"
}
last_centroid_x = None

def generate_sensor_data():
    """Streams the live camera state directly to the React dashboard."""
    return {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "risk_level": live_incident_state["risk_level"],
        "active_threats": live_incident_state["active_threats"],
        "incident": live_incident_state,
        "sensor_health": { "cctv": random.randint(92, 98), "radar": random.randint(95, 100) }
    }

def generate_frames():
    """Streams a looping demo surveillance video with proper frame pacing and YOLO tracking."""
    global last_centroid_x
    
    video_path = "demo_surveillance.mp4"
    if not os.path.exists(video_path):
        print(f"ERROR: '{video_path}' not found in root directory!")
        return

    camera = cv2.VideoCapture(video_path)
    
    while True:
        success, frame = camera.read()
        
        # Re-open file cleanly when video finishes
        if not success:
            camera.open(video_path)
            success, frame = camera.read()
            if not success:
                time.sleep(0.1)
                continue
            
        results = vision_model(frame, stream=True, verbose=False)
        
        current_threats = 0
        detected_types = []
        current_centroid_x = None
        largest_area = 0
        
        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                if cls in [0, 2, 7]:  # Person, Car, Truck
                    current_threats += 1
                    class_name = vision_model.names[cls].upper()
                    detected_types.append(class_name)
                    
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    
                    area = (x2 - x1) * (y2 - y1)
                    if area > largest_area:
                        largest_area = area
                        current_centroid_x = (x1 + x2) // 2

                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    label = f"THREAT: {class_name} ({int(box.conf[0] * 100)}%)"
                    cv2.putText(frame, label, (x1, max(20, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        # Update shared global state for WebSocket
        if current_threats > 0:
            live_incident_state["active_threats"] = current_threats
            live_incident_state["object_type"] = f"{detected_types[0]} ({current_threats})"
            live_incident_state["risk_level"] = "CRITICAL" if current_threats > 1 else "HIGH"
            
            if current_centroid_x is not None and last_centroid_x is not None:
                delta = current_centroid_x - last_centroid_x
                if delta > 15: live_incident_state["direction"] = "→ EAST"
                elif delta < -15: live_incident_state["direction"] = "← WEST"
            
            if current_centroid_x is not None:
                last_centroid_x = current_centroid_x
        else:
            live_incident_state["active_threats"] = 0
            live_incident_state["object_type"] = "CLEAR"
            live_incident_state["risk_level"] = "NORMAL"
            live_incident_state["direction"] = "STATIC"
            last_centroid_x = None

        border_color = (0, 0, 255) if current_threats > 0 else (0, 255, 0)
        cv2.putText(frame, f"DEMO FEED // SECTOR 17-B // {'BREACH' if current_threats > 0 else 'SECURE'}", (10, 25), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, border_color, 2)
        
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            continue
            
        # Pace frame processing to ~30 FPS to prevent memory overflow
        time.sleep(0.033)
        
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = generate_sensor_data()
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1.0)
    except Exception:
        pass

# Initialize YOLOv8 Nano model
vision_model = YOLO('yolov8n.pt')

# --- Gemini setup ---
# Uses the current `google-genai` SDK. The old `google.generativeai` package
# (genai.configure / genai.GenerativeModel) is deprecated and doesn't reliably
# support the newer "AQ."-prefixed Authentication Keys that Google AI Studio
# now issues by default — that mismatch is almost certainly why calls were failing.
#
# NEVER hardcode the key. Set it in your environment before running, e.g.:
#   export GEMINI_API_KEY="your-new-key-here"
# or put it in a .env file (loaded with python-dotenv) that's in .gitignore.
ai_client = genai.Client(api_key="AQ.Ab8RN6KDSfMmYcaTA_qcFE9LweS_-sd9x-A-N5CXL5q1u6JDpg")
GEMINI_MODEL = "gemini-3.6-flash"

class ChatRequest(BaseModel):
    prompt: str
    context: dict

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    system_prompt = f"""You are the IBSAP Tactical AI Assistant. 
    Respond concisely in a strict, military-style format (under 50 words). 
    Do not use markdown formatting.
    Current Live System Telemetry: {json.dumps(req.context)}
    
    Operator Query: {req.prompt}"""
    
    try:
        # Modern SDK generation syntax
        response = ai_client.models.generate_content(
            model='gemini-3.6-flash',
            contents=system_prompt
        )
        return {"reply": response.text}
    except Exception as e:
        return {"reply": f"SYSTEM ERROR: {str(e)}"}

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)