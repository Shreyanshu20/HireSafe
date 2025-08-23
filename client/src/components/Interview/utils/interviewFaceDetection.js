import * as faceapi from 'face-api.js';
import { sendMalpracticeDetection } from "./socketUtils";

let isModelLoaded = false;
let detectionInterval = null;
let lastDetectionTime = 0;
const DETECTION_COOLDOWN = 2000;

export const initializeFaceDetection = async () => {
  if (isModelLoaded) return true;

  try {
    console.log("Starting to load face detection models...");
    
    // Direct check for face-api availability
    console.log("faceapi:", faceapi);
    console.log("faceapi.nets:", faceapi?.nets);
    
    if (!faceapi || !faceapi.nets) {
      console.error("face-api.js or nets not available");
      console.log("Trying alternative import...");
      
      // Try using window.faceapi if available (from CDN)
      const globalFaceAPI = window.faceapi;
      if (globalFaceAPI && globalFaceAPI.nets) {
        console.log("Using global face-api.js from CDN");
        return await loadModelsWithAPI(globalFaceAPI);
      }
      
      return false;
    }

    return await loadModelsWithAPI(faceapi);
  } catch (error) {
    console.error("Failed to load face detection models:", error);
    return false;
  }
};

const loadModelsWithAPI = async (api) => {
  try {
    console.log("Available nets:", Object.keys(api.nets));

    // Load models with the provided API
    console.log("Loading tinyFaceDetector...");
    await api.nets.tinyFaceDetector.loadFromUri("/models");
    console.log("✓ tinyFaceDetector loaded");
    
    console.log("Loading faceLandmark68Net...");
    await api.nets.faceLandmark68Net.loadFromUri("/models");
    console.log("✓ faceLandmark68Net loaded");
    
    console.log("Loading faceExpressionNet...");
    await api.nets.faceExpressionNet.loadFromUri("/models");
    console.log("✓ faceExpressionNet loaded");
    
    console.log("All face detection models loaded successfully");
    isModelLoaded = true;
    return true;
  } catch (error) {
    console.error("Error loading models:", error);
    console.log("Make sure you have models in public/models/ directory");
    return false;
  }
};

export const startInterviewFaceDetection = ({
  videoElement,
  canvasElement,
  socketRef,
  interviewCode,
  isInterviewer = false,
  onAnomalyDetected,
}) => {
  if (!isModelLoaded) {
    console.error("Face detection models not loaded");
    return;
  }

  if (!videoElement) {
    console.error("Video element not provided");
    return;
  }

  if (detectionInterval) {
    clearInterval(detectionInterval);
  }

  const startDetection = () => {
    if (videoElement.readyState >= 2) {
      detectionInterval = setInterval(async () => {
        await performFaceDetection({
          videoElement,
          canvasElement,
          socketRef,
          interviewCode,
          isInterviewer,
          onAnomalyDetected,
        });
      }, 1000);

      console.log("Interview face detection started");
    } else {
      setTimeout(startDetection, 100);
    }
  };

  startDetection();
};

export const stopInterviewFaceDetection = () => {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
    console.log("Interview face detection stopped");
  }
};

const performFaceDetection = async ({
  videoElement,
  canvasElement,
  socketRef,
  interviewCode,
  isInterviewer,
  onAnomalyDetected,
}) => {
  if (!videoElement || videoElement.paused || videoElement.ended || videoElement.readyState < 2) {
    return;
  }

  // Use either imported faceapi or global one
  const api = faceapi || window.faceapi;
  if (!api) {
    console.error("face-api.js not available for detection");
    return;
  }

  try {
    const detections = await api
      .detectAllFaces(videoElement, new api.TinyFaceDetectorOptions({ 
        inputSize: 416,
        scoreThreshold: 0.5 
      }))
      .withFaceLandmarks()
      .withFaceExpressions();

    if (isInterviewer && canvasElement) {
      const ctx = canvasElement.getContext("2d");
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }

    const anomalies = analyzeDetections(detections, videoElement);

    anomalies.forEach((anomaly) => {
      const now = Date.now();

      if (now - lastDetectionTime > DETECTION_COOLDOWN) {
        lastDetectionTime = now;

        sendMalpracticeDetection(
          socketRef,
          anomaly.type,
          anomaly.confidence,
          interviewCode,
          anomaly.description
        );

        if (onAnomalyDetected) {
          onAnomalyDetected(anomaly);
        }
      }
    });

    if (isInterviewer && canvasElement && detections.length > 0) {
      drawDetectionOverlays(canvasElement, detections, anomalies);
    }
  } catch (error) {
    console.error("Face detection error:", error);
  }
};

const analyzeDetections = (detections, videoElement) => {
  const anomalies = [];
  const currentTime = new Date().toISOString();

  if (detections.length === 0) {
    anomalies.push({
      type: "face_missing",
      confidence: 0.9,
      description: "No face detected in frame",
      timestamp: currentTime,
    });
    return anomalies;
  }

  if (detections.length > 1) {
    anomalies.push({
      type: "multiple_faces",
      confidence: 0.95,
      description: `${detections.length} faces detected`,
      timestamp: currentTime,
    });
  }

  detections.forEach((detection, index) => {
    const landmarks = detection.landmarks;
    const expressions = detection.expressions;

    if (landmarks) {
      const eyesClosedConfidence = checkEyesClosed(landmarks);
      if (eyesClosedConfidence > 0.7) {
        anomalies.push({
          type: "eyes_closed",
          confidence: eyesClosedConfidence,
          description: "Eyes appear to be closed",
          timestamp: currentTime,
        });
      }

      const lookingAwayConfidence = checkLookingAway(landmarks, videoElement);
      if (lookingAwayConfidence > 0.6) {
        anomalies.push({
          type: "looking_away",
          confidence: lookingAwayConfidence,
          description: "Looking away from camera",
          timestamp: currentTime,
        });
      }
    }

    if (expressions) {
      const suspiciousConfidence = checkSuspiciousExpressions(expressions);
      if (suspiciousConfidence > 0.8) {
        anomalies.push({
          type: "suspicious_behavior",
          confidence: suspiciousConfidence,
          description: "Suspicious facial expressions detected",
          timestamp: currentTime,
        });
      }
    }
  });

  return anomalies;
};

const checkEyesClosed = (landmarks) => {
  try {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);

    const avgEAR = (leftEAR + rightEAR) / 2;
    const threshold = 0.25;
    return avgEAR < threshold ? 1 - avgEAR / threshold : 0;
  } catch (error) {
    console.error("Error checking eyes closed:", error);
    return 0;
  }
};

const calculateEAR = (eyePoints) => {
  if (!eyePoints || eyePoints.length < 6) return 0.3;
  
  const p1 = eyePoints[1];
  const p2 = eyePoints[5];
  const p3 = eyePoints[2];
  const p4 = eyePoints[4];
  const p5 = eyePoints[0];
  const p6 = eyePoints[3];

  const vertical1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
  const vertical2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
  const horizontal = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));

  return horizontal > 0 ? (vertical1 + vertical2) / (2 * horizontal) : 0.3;
};

const checkLookingAway = (landmarks, videoElement) => {
  try {
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    if (!nose.length || !leftEye.length || !rightEye.length) return 0;

    const noseTip = nose[nose.length - 1];
    const leftEyeCenter = getCenter(leftEye);
    const rightEyeCenter = getCenter(rightEye);

    const eyeCenter = {
      x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    };

    const relativeX = (noseTip.x - eyeCenter.x) / (videoElement.videoWidth || videoElement.clientWidth);
    const relativeY = (noseTip.y - eyeCenter.y) / (videoElement.videoHeight || videoElement.clientHeight);

    const threshold = 0.15;
    const awayConfidence = Math.max(
      Math.abs(relativeX) > threshold ? Math.abs(relativeX) : 0,
      Math.abs(relativeY) > threshold ? Math.abs(relativeY) : 0
    );

    return Math.min(awayConfidence * 2, 1);
  } catch (error) {
    console.error("Error checking looking away:", error);
    return 0;
  }
};

const getCenter = (points) => {
  if (!points || points.length === 0) return { x: 0, y: 0 };
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  return { x, y };
};

const checkSuspiciousExpressions = (expressions) => {
  if (!expressions) return 0;
  
  const suspiciousExpressions = ["surprised", "fearful", "disgusted"];
  let maxSuspiciousValue = 0;

  suspiciousExpressions.forEach((expr) => {
    if (expressions[expr] && expressions[expr] > maxSuspiciousValue) {
      maxSuspiciousValue = expressions[expr];
    }
  });

  return maxSuspiciousValue;
};

const drawDetectionOverlays = (canvas, detections, anomalies) => {
  const ctx = canvas.getContext("2d");

  detections.forEach((detection, index) => {
    const { x, y, width, height } = detection.detection.box;

    let color = "#00ff00";
    anomalies.forEach((anomaly) => {
      if (
        anomaly.type === "multiple_faces" ||
        anomaly.type === "eyes_closed" ||
        anomaly.type === "looking_away"
      ) {
        color = "#ff6600";
      }
      if (anomaly.type === "suspicious_behavior") {
        color = "#ff0000";
      }
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    if (detection.landmarks) {
      ctx.fillStyle = color;
      detection.landmarks.positions.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    anomalies.forEach((anomaly, anomalyIndex) => {
      ctx.fillStyle = color;
      ctx.font = "12px Arial";
      ctx.fillText(
        `${anomaly.type}: ${(anomaly.confidence * 100).toFixed(0)}%`,
        x,
        y - 10 - anomalyIndex * 15
      );
    });
  });
};

export const setupFaceDetectionCanvas = (videoElement, canvasElement) => {
  if (!videoElement || !canvasElement) return;

  const updateCanvasSize = () => {
    canvasElement.width = videoElement.videoWidth || videoElement.clientWidth;
    canvasElement.height = videoElement.videoHeight || videoElement.clientHeight;
    
    canvasElement.style.position = "absolute";
    canvasElement.style.top = "0";
    canvasElement.style.left = "0";
    canvasElement.style.pointerEvents = "none";
  };

  if (videoElement.readyState >= 2) {
    updateCanvasSize();
  }

  videoElement.addEventListener('loadedmetadata', updateCanvasSize);
  
  return () => {
    videoElement.removeEventListener('loadedmetadata', updateCanvasSize);
  };
};