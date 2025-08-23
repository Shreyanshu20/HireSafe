import { sendMalpracticeDetection } from "./socketUtils";

let isModelLoaded = false;
let detectionInterval = null;
let lastDetectionTime = 0;
const DETECTION_COOLDOWN = 2000; // Reduced cooldown
let useBasicDetection = false;
let eyeClosedCount = 0;
let lookingAwayCount = 0;
let previousHeadPosition = null;

// Advanced detection counters
let suspiciousMovementCount = 0;
let phoneDetectionCount = 0;
let multiplePersonCount = 0;
let offScreenCount = 0;
let tabSwitchCount = 0;

// Basic detection variables
let previousFrame = null;
let staticFrameCount = 0;
let darkFrameCount = 0;

// Add debugging flags
const DEBUG_MODE = true;
let detectionCount = 0;

export const initializeFaceDetection = async () => {
  if (isModelLoaded) return true;

  console.log("🚀 Initializing face detection...");
  
  // Force advanced detection if face-api is available
  if (window.faceapi) {
    try {
      console.log("📦 Loading face-api.js models...");
      const success = await loadModelsWithRetry();
      if (success) {
        useBasicDetection = false;
        isModelLoaded = true;
        console.log("✅ Advanced face detection enabled");
        return true;
      }
    } catch (error) {
      console.warn("❌ Failed to load advanced models:", error);
    }
  }
  
  // Fallback to basic detection
  isModelLoaded = true;
  useBasicDetection = true;
  console.log("⚠️ Using basic detection mode");
  
  return true;
};

// Update the loadModelsWithRetry function with better error handling
const loadModelsWithRetry = async (retryCount = 3) => {
  console.log("🚀 Starting face-api.js model loading...");
  
  // First check if face-api is available
  if (!window.faceapi) {
    console.error("❌ face-api.js not loaded! Add script tag to index.html");
    return false;
  }

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`📦 Model loading attempt ${attempt}/${retryCount}`);
      
      const api = window.faceapi;
      
      // Check if already loaded
      if (api.nets.tinyFaceDetector?.isLoaded && 
          api.nets.faceLandmark68Net?.isLoaded && 
          api.nets.faceExpressionNet?.isLoaded) {
        console.log("✅ Models already loaded");
        return true;
      }

      // Try loading from CDN (most reliable)
      const modelPaths = [
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model",
        "/models",
        "/public/models"
      ];
      
      for (const modelPath of modelPaths) {
        try {
          console.log(`🔄 Trying model path: ${modelPath}`);
          
          // Load essential models only
          await Promise.all([
            api.nets.tinyFaceDetector.loadFromUri(modelPath),
            api.nets.faceLandmark68Net.loadFromUri(modelPath),
            api.nets.faceExpressionNet.loadFromUri(modelPath),
          ]);
          
          console.log("✅ All models loaded successfully from:", modelPath);
          return true;
        } catch (pathError) {
          console.warn(`❌ Failed to load from ${modelPath}:`, pathError.message);
          continue;
        }
      }
      
      // Wait before retry
      if (attempt < retryCount) {
        console.log(`⏳ Waiting ${attempt}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      if (attempt === retryCount) {
        console.error("❌ All model loading attempts failed");
        return false;
      }
    }
  }
  
  return false;
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
    console.warn("⚠️ Face detection not ready, initializing...");
    initializeFaceDetection().then(loaded => {
      if (loaded) {
        startInterviewFaceDetection({
          videoElement,
          canvasElement,
          socketRef,
          interviewCode,
          isInterviewer,
          onAnomalyDetected,
        });
      }
    });
    return;
  }

  if (!videoElement) {
    console.error("❌ Video element not provided");
    return;
  }

  if (detectionInterval) {
    clearInterval(detectionInterval);
  }

  const startDetection = () => {
    if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      console.log(`🎯 Starting ${isInterviewer ? 'overlay' : 'detection'} for ${isInterviewer ? 'interviewer' : 'interviewee'}`);
      console.log(`🔧 Detection mode: ${useBasicDetection ? 'Basic' : 'Advanced'}`);
      
      detectionInterval = setInterval(async () => {
        detectionCount++;
        
        if (DEBUG_MODE && detectionCount % 5 === 0) {
          console.log(`🔄 Detection cycle #${detectionCount} (${isInterviewer ? 'interviewer overlay' : 'interviewee detection'})`);
        }
        
        try {
          if (!useBasicDetection && window.faceapi) {
            await performAdvancedFaceDetection({
              videoElement,
              canvasElement,
              socketRef,
              interviewCode,
              isInterviewer,
              onAnomalyDetected,
            });
          } else {
            // Run basic detection for actual monitoring (interviewee side)
            if (!isInterviewer) {
              await performBasicDetection({
                videoElement,
                socketRef,
                interviewCode,
                onAnomalyDetected,
              });
            }
          }
        } catch (error) {
          console.error("❌ Detection error:", error);
          // Don't fallback to basic if we want overlays
          if (!isInterviewer) {
            useBasicDetection = true;
          }
        }
      }, isInterviewer ? 1000 : 1500); // Faster for overlay

      console.log(`✅ Detection started for ${isInterviewer ? 'interviewer overlay' : 'interviewee monitoring'}`);
    } else {
      console.log("⏳ Video not ready, retrying...");
      setTimeout(startDetection, 500);
    }
  };

  startDetection();
};

export const stopInterviewFaceDetection = () => {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
    console.log("🛑 Interview face detection stopped");
  }
  
  // Reset all counters
  eyeClosedCount = 0;
  lookingAwayCount = 0;
  previousHeadPosition = null;
  detectionCount = 0;
  suspiciousMovementCount = 0;
  phoneDetectionCount = 0;
  multiplePersonCount = 0;
  offScreenCount = 0;
  tabSwitchCount = 0;
  
  // Reset basic detection variables
  previousFrame = null;
  staticFrameCount = 0;
  darkFrameCount = 0;
};

// Enhanced advanced detection with interview-specific anomalies
const performAdvancedFaceDetection = async ({
  videoElement,
  canvasElement,
  socketRef,
  interviewCode,
  isInterviewer,
  onAnomalyDetected,
}) => {
  if (!videoElement || videoElement.paused || videoElement.ended) {
    if (DEBUG_MODE) console.log("⏸️ Video not available for detection");
    return;
  }

  try {
    const api = window.faceapi;
    
    // Ensure models are loaded
    if (!api?.nets?.tinyFaceDetector?.isLoaded) {
      console.warn("⚠️ Models not loaded, attempting to reload...");
      const loaded = await loadModelsWithRetry();
      if (!loaded) {
        console.error("❌ Could not load face-api models");
        useBasicDetection = true;
        return;
      }
    }
    
    const detections = await api
      .detectAllFaces(videoElement, new api.TinyFaceDetectorOptions({ 
        inputSize: 416,
        scoreThreshold: 0.3
      }))
      .withFaceLandmarks()
      .withFaceExpressions();

    if (DEBUG_MODE && detectionCount % 10 === 0) {
      console.log(`👥 Advanced detection: ${detections.length} face(s) detected`);
    }

    // Analyze behavior for anomalies
    const anomalies = analyzeInterviewBehavior(detections, videoElement);
    
    // ALWAYS draw overlay for interviewer (even with 0 faces)
    if (canvasElement && isInterviewer) {
      drawInterviewOverlay(canvasElement, detections, anomalies, videoElement);
    }
    
    // Send anomalies from interviewee's detection to interviewer
    if (!isInterviewer && anomalies.length > 0) {
      console.log("🚨 Interview anomalies detected by interviewee:", anomalies.map(a => a.type));
      anomalies.forEach((anomaly) => {
        sendAnomalyIfCooldownPassed(anomaly, socketRef, interviewCode, onAnomalyDetected);
      });
    }

    // For interviewer overlay - also send local detection for immediate visual feedback
    if (isInterviewer && anomalies.length > 0) {
      console.log("🔍 Overlay anomalies for interviewer:", anomalies.map(a => a.type));
      // Don't send to socket, just for local overlay visualization
    }

  } catch (error) {
    console.error("❌ Advanced face detection error:", error);
    
    // Show error on overlay for interviewer
    if (canvasElement && isInterviewer) {
      const ctx = canvasElement.getContext("2d");
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      
      ctx.fillStyle = "#ff0000";
      ctx.font = "bold 16px Arial";
      ctx.fillText("❌ Detection Error - Check Console", 10, 30);
      ctx.fillText("Using Basic Detection Mode", 10, 50);
    }
    
    // For interviewer, keep trying advanced detection
    if (isInterviewer) {
      console.log("🔄 Retrying advanced detection for overlay...");
      // Don't fallback to basic for interviewer
    } else {
      useBasicDetection = true;
    }
  }
};

// Interview-specific behavior analysis
const analyzeInterviewBehavior = (detections, videoElement) => {
  const anomalies = [];
  const currentTime = new Date().toISOString();

  // 1. NO CANDIDATE PRESENT
  if (detections.length === 0) {
    offScreenCount++;
    if (offScreenCount > 3) {
      anomalies.push({
        type: "candidate_absent",
        confidence: 0.95,
        description: "Candidate not visible in camera for extended period",
        timestamp: currentTime,
      });
    }
  } else {
    offScreenCount = 0;
  }

  // 2. MULTIPLE PEOPLE (Cheating assistance)
  if (detections.length > 1) {
    multiplePersonCount++;
    anomalies.push({
      type: "multiple_people",
      confidence: 0.98,
      description: `${detections.length} people detected - possible unauthorized assistance`,
      timestamp: currentTime,
    });
  } else {
    multiplePersonCount = 0;
  }

  if (detections.length > 0) {
    const primaryFace = detections[0];
    const landmarks = primaryFace.landmarks;
    const expressions = primaryFace.expressions;
    const ageGender = primaryFace;

    // Calculate eyeAspectRatio FIRST if landmarks exist
    let eyeAspectRatio = 0.3; // Default value
    if (landmarks) {
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      eyeAspectRatio = calculateEyeAspectRatio(leftEye, rightEye);
    }

    // 3. LOOKING AWAY FROM SCREEN (Cheating)
    if (landmarks) {
      const nose = landmarks.getNose();
      const faceBox = primaryFace.detection.box;
      const headPosition = calculateHeadPose(nose, faceBox);
      
      if (isLookingAway(headPosition, faceBox)) {
        lookingAwayCount++;
        if (lookingAwayCount > 4) {
          anomalies.push({
            type: "looking_away_extended",
            confidence: 0.88,
            description: `Candidate looking away from screen for ${lookingAwayCount * 1.5}s - possible external help`,
            timestamp: currentTime,
          });
        }
      } else {
        lookingAwayCount = 0;
      }

      // 4. EYES CLOSED (Sleeping/Not attentive) - Now eyeAspectRatio is defined
      if (eyeAspectRatio < 0.25) {
        eyeClosedCount++;
        if (eyeClosedCount > 5) {
          anomalies.push({
            type: "eyes_closed_extended",
            confidence: 0.85,
            description: `Eyes closed for ${eyeClosedCount * 1.5}s - candidate may be sleeping or distracted`,
            timestamp: currentTime,
          });
        }
      } else {
        eyeClosedCount = 0;
      }

      // 5. SUSPICIOUS HEAD MOVEMENTS (Looking at phone/notes)
      if (previousHeadPosition) {
        const movementMagnitude = Math.sqrt(
          Math.pow(headPosition.x - previousHeadPosition.x, 2) + 
          Math.pow(headPosition.y - previousHeadPosition.y, 2)
        );
        
        if (movementMagnitude > 50) { // Significant movement
          suspiciousMovementCount++;
          if (suspiciousMovementCount > 3) {
            anomalies.push({
              type: "suspicious_head_movement",
              confidence: 0.75,
              description: "Frequent head movements detected - possible use of external devices",
              timestamp: currentTime,
            });
            suspiciousMovementCount = 0;
          }
        }
      }
      previousHeadPosition = headPosition;
    }

    // 6. FACIAL EXPRESSIONS ANALYSIS
    if (expressions) {
      // High stress/anxiety
      if (expressions.fearful > 0.7 || expressions.surprised > 0.8) {
        anomalies.push({
          type: "high_stress_detected",
          confidence: 0.65,
          description: `High stress/surprise expression detected (${Math.max(expressions.fearful, expressions.surprised).toFixed(2)})`,
          timestamp: currentTime,
        });
      }

      // Suspicious concentration (might be reading) - Now eyeAspectRatio is available
      if (expressions.neutral > 0.9 && eyeAspectRatio > 0.4) {
        phoneDetectionCount++;
        if (phoneDetectionCount > 8) {
          anomalies.push({
            type: "reading_behavior",
            confidence: 0.7,
            description: "Sustained reading-like behavior detected - possible use of notes/phone",
            timestamp: currentTime,
          });
          phoneDetectionCount = 0;
        }
      }
    }

    // 7. FACE SIZE ANALYSIS (Moving closer to read/moving away)
    const faceArea = primaryFace.detection.box.width * primaryFace.detection.box.height;
    const videoArea = videoElement.videoWidth * videoElement.videoHeight;
    const faceRatio = faceArea / videoArea;
    
    if (faceRatio < 0.02) {
      anomalies.push({
        type: "candidate_too_far",
        confidence: 0.8,
        description: `Candidate too far from camera (${(faceRatio * 100).toFixed(1)}% of frame)`,
        timestamp: currentTime,
      });
    } else if (faceRatio > 0.4) {
      anomalies.push({
        type: "candidate_too_close",
        confidence: 0.75,
        description: `Candidate unusually close to camera (${(faceRatio * 100).toFixed(1)}% of frame) - possible screen reading`,
        timestamp: currentTime,
      });
    }

    // 8. LOW DETECTION CONFIDENCE (Poor lighting, obstruction)
    if (primaryFace.detection.score < 0.5) {
      anomalies.push({
        type: "poor_video_quality",
        confidence: 0.6,
        description: `Poor detection confidence (${(primaryFace.detection.score * 100).toFixed(1)}%) - improve lighting`,
        timestamp: currentTime,
      });
    }

    // 9. AGE/GENDER MISMATCH (If expected profile available)
    if (ageGender && ageGender.age) {
      if (ageGender.age < 16 || ageGender.age > 70) {
        anomalies.push({
          type: "age_verification_concern",
          confidence: 0.6,
          description: `Detected age: ${ageGender.age.toFixed(0)} years - verify candidate identity`,
          timestamp: currentTime,
        });
      }
    }
  }

  return anomalies;
};

// Add these missing functions after the analyzeInterviewBehavior function:

const isLookingAway = (headPosition, faceBox) => {
  const horizontalThreshold = faceBox.width * 0.15;
  const verticalThreshold = faceBox.height * 0.12;
  
  return Math.abs(headPosition.x) > horizontalThreshold || 
         Math.abs(headPosition.y) > verticalThreshold;
};

// Expression analysis panel
const drawExpressionPanel = (ctx, expressions, x, y) => {
  const topExpressions = Object.entries(expressions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  // Background panel
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(x, y, 200, 80);
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px Arial";
  ctx.fillText("Expressions:", x + 5, y + 15);
  
  topExpressions.forEach((expr, index) => {
    const percentage = (expr[1] * 100).toFixed(1);
    const color = expr[1] > 0.6 ? "#ff4444" : expr[1] > 0.3 ? "#ffaa44" : "#ffffff";
    ctx.fillStyle = color;
    ctx.font = "11px Arial";
    ctx.fillText(`${expr[0]}: ${percentage}%`, x + 5, y + 35 + index * 15);
  });
};

// Anomaly overlay (top-right)
const drawAnomalyOverlay = (ctx, anomalies, canvasWidth, canvasHeight) => {
  if (anomalies.length === 0) return;
  
  const alertWidth = 300;
  const alertX = canvasWidth - alertWidth - 10;
  let alertY = 50;
  
  anomalies.slice(0, 3).forEach((anomaly, index) => {
    const currentY = alertY + index * 45;
    
    // Background
    ctx.fillStyle = "rgba(255, 0, 0, 0.9)";
    ctx.fillRect(alertX, currentY, alertWidth, 40);
    
    // Icon and text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.fillText(`⚠️ ${anomaly.type.replace('_', ' ').toUpperCase()}`, alertX + 5, currentY + 15);
    
    ctx.font = "10px Arial";
    ctx.fillText(anomaly.description.substring(0, 40) + "...", alertX + 5, currentY + 30);
    
    // Confidence
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 11px Arial";
    ctx.fillText(`${(anomaly.confidence * 100).toFixed(0)}%`, alertX + alertWidth - 35, currentY + 20);
  });
};

// Interview status indicator
const drawInterviewStatus = (ctx, detections, anomalies) => {
  const statusY = 50;
  
  // Overall status
  let status = "✅ NORMAL";
  let statusColor = "#00ff00";
  
  const criticalAnomalies = anomalies.filter(a => 
    ["multiple_people", "candidate_absent", "looking_away_extended"].includes(a.type)
  );
  
  if (criticalAnomalies.length > 0) {
    status = "🚨 CRITICAL";
    statusColor = "#ff0000";
  } else if (anomalies.length > 0) {
    status = "⚠️ WARNING";
    statusColor = "#ff6600";
  }
  
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(10, statusY, 200, 30);
  
  ctx.fillStyle = statusColor;
  ctx.font = "bold 14px Arial";
  ctx.fillText(`Status: ${status}`, 15, statusY + 20);
};

// Enhanced overlay drawing (like in your image)
const drawInterviewOverlay = (canvas, detections, anomalies, videoElement) => {
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  
  // Set canvas size to match video exactly
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw status info
  ctx.fillStyle = "#00ff00";
  ctx.font = "bold 14px Arial";
  ctx.fillText(`AI Analysis Active - Cycle #${detectionCount}`, 10, 25);
  
  if (detections.length === 0) {
    // Draw warning when no face detected
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#ff0000";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("❌ NO CANDIDATE DETECTED", canvas.width / 2, canvas.height / 2);
    ctx.textAlign = "left";
    return;
  }

  detections.forEach((detection, index) => {
    try {
      const { x, y, width, height } = detection.detection.box;
      const landmarks = detection.landmarks;
      const expressions = detection.expressions;
      const confidence = detection.detection.score;
      
      // Determine box color based on anomalies and confidence
      let boxColor = "#00ff00"; // Green for normal
      if (anomalies.some(a => ["multiple_people", "candidate_absent"].includes(a.type))) {
        boxColor = "#ff0000"; // Red for critical
      } else if (anomalies.some(a => ["looking_away_extended", "suspicious_head_movement"].includes(a.type))) {
        boxColor = "#ff6600"; // Orange for warning
      } else if (confidence < 0.7) {
        boxColor = "#ffff00"; // Yellow for low confidence
      }

      // Draw main bounding box (like in your image)
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      // Draw confidence score (top-right of box)
      ctx.fillStyle = boxColor;
      ctx.font = "bold 16px Arial";
      const confidenceText = `${(confidence * 100).toFixed(0)}%`;
      ctx.fillText(confidenceText, x + width - 50, y - 5);
      
      // Draw face number if multiple faces
      if (detections.length > 1) {
        ctx.fillStyle = "#ff0000";
        ctx.font = "bold 18px Arial";
        ctx.fillText(`Person ${index + 1}`, x, y - 25);
      }

      if (landmarks) {
        // Draw facial landmarks (dots like in your image)
        drawDetailedFacialLandmarks(ctx, landmarks, boxColor);
        
        // Draw eye tracking
        drawEyeTracking(ctx, landmarks, anomalies);
        
        // Draw nose direction arrow
        drawNoseDirection(ctx, landmarks, anomalies);
      }

      if (expressions) {
        // Draw expression analysis
        drawExpressionPanel(ctx, expressions, x, y + height + 10);
      }

      // Draw age/gender if available
      if (detection.age !== undefined) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px Arial";
        ctx.fillRect(x, y + height - 40, 100, 35);
        ctx.fillStyle = "#000000";
        ctx.fillText(`Age: ${detection.age.toFixed(0)}`, x + 5, y + height - 25);
        ctx.fillText(`${detection.gender}`, x + 5, y + height - 10);
      }
    } catch (error) {
      console.warn(`Error drawing detection ${index}:`, error);
      
      // Draw simple error indicator
      ctx.fillStyle = "#ff0000";
      ctx.font = "12px Arial";
      ctx.fillText(`Detection Error`, 10, 50 + index * 20);
    }
  });

  // Draw anomaly alerts (top-right corner)
  drawAnomalyOverlay(ctx, anomalies, canvas.width, canvas.height);
  
  // Draw interview status
  drawInterviewStatus(ctx, detections, anomalies);
};

// Fix the drawDetailedFacialLandmarks function with correct face-api.js methods
const drawDetailedFacialLandmarks = (ctx, landmarks, color) => {
  const drawPoints = (points, pointColor = color, size = 2) => {
    ctx.fillStyle = pointColor;
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  // Use correct face-api.js landmark methods
  try {
    // Draw facial feature points with different colors
    drawPoints(landmarks.getJawOutline(), "#00ffff", 2); // Cyan jaw outline
    drawPoints(landmarks.getLeftEyeBrow(), "#ff00ff", 2); // Magenta eyebrows (correct method name)
    drawPoints(landmarks.getRightEyeBrow(), "#ff00ff", 2); // Magenta eyebrows (correct method name)
    drawPoints(landmarks.getLeftEye(), "#00ff00", 3); // Green eyes (more prominent)
    drawPoints(landmarks.getRightEye(), "#00ff00", 3);
    drawPoints(landmarks.getNose(), "#ffff00", 2); // Yellow nose
    drawPoints(landmarks.getMouth(), "#ff0000", 2); // Red mouth
  } catch (error) {
    console.warn("Error drawing landmarks:", error);
    
    // Fallback: draw landmarks as raw points if methods fail
    if (landmarks.positions) {
      drawPoints(landmarks.positions, color, 1);
    } else if (landmarks._positions) {
      drawPoints(landmarks._positions, color, 1);
    } else {
      // Manual landmark indices for face-api.js 68-point model
      drawManualLandmarks(ctx, landmarks, color);
    }
  }
};

// Manual landmark drawing as fallback
const drawManualLandmarks = (ctx, landmarks, color) => {
  // Face-api.js uses 68 landmark points - access them directly
  const points = landmarks.positions || landmarks._positions || landmarks;
  
  if (!points || !Array.isArray(points)) {
    console.warn("No valid landmark points found");
    return;
  }

  const drawPoints = (indices, pointColor, size = 2) => {
    ctx.fillStyle = pointColor;
    indices.forEach(index => {
      if (points[index]) {
        const point = points[index];
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  // 68-point face model indices
  const jawOutline = Array.from({length: 17}, (_, i) => i); // 0-16
  const leftEyebrow = Array.from({length: 5}, (_, i) => i + 17); // 17-21
  const rightEyebrow = Array.from({length: 5}, (_, i) => i + 22); // 22-26
  const nose = Array.from({length: 9}, (_, i) => i + 27); // 27-35
  const leftEye = Array.from({length: 6}, (_, i) => i + 36); // 36-41
  const rightEye = Array.from({length: 6}, (_, i) => i + 42); // 42-47
  const mouth = Array.from({length: 20}, (_, i) => i + 48); // 48-67

  // Draw with different colors
  drawPoints(jawOutline, "#00ffff", 2); // Cyan jaw
  drawPoints(leftEyebrow, "#ff00ff", 2); // Magenta eyebrows
  drawPoints(rightEyebrow, "#ff00ff", 2);
  drawPoints(leftEye, "#00ff00", 3); // Green eyes
  drawPoints(rightEye, "#00ff00", 3);
  drawPoints(nose, "#ffff00", 2); // Yellow nose
  drawPoints(mouth, "#ff0000", 2); // Red mouth
};

// Fix the eye tracking function
const drawEyeTracking = (ctx, landmarks, anomalies) => {
  try {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const eyeColor = anomalies.some(a => a.type.includes("eyes_closed")) ? "#ff0000" : "#00ff00";
    
    // Draw eye outlines
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 2;
    
    [leftEye, rightEye].forEach(eye => {
      if (eye && eye.length > 0) {
        ctx.beginPath();
        eye.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.stroke();
      }
    });
    
    // Draw gaze direction indicators
    const leftCenter = getPolygonCenter(leftEye);
    const rightCenter = getPolygonCenter(rightEye);
    
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(leftCenter.x, leftCenter.y, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(rightCenter.x, rightCenter.y, 4, 0, 2 * Math.PI);
    ctx.fill();
  } catch (error) {
    console.warn("Error drawing eye tracking:", error);
    
    // Fallback: draw simple eye indicators
    drawFallbackEyes(ctx, landmarks, anomalies);
  }
};

// Fallback eye drawing
const drawFallbackEyes = (ctx, landmarks, anomalies) => {
  const points = landmarks.positions || landmarks._positions || landmarks;
  if (!points) return;

  const eyeColor = anomalies.some(a => a.type.includes("eyes_closed")) ? "#ff0000" : "#00ff00";
  
  // Left eye (points 36-41)
  const leftEyePoints = points.slice(36, 42);
  // Right eye (points 42-47)  
  const rightEyePoints = points.slice(42, 48);
  
  [leftEyePoints, rightEyePoints].forEach(eyePoints => {
    if (eyePoints && eyePoints.length > 0) {
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      eyePoints.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.stroke();
      
      // Draw center point
      const center = getPolygonCenter(eyePoints);
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
};

// Fix the nose direction function
const drawNoseDirection = (ctx, landmarks, anomalies) => {
  try {
    const nose = landmarks.getNose();
    if (!nose || nose.length < 4) {
      throw new Error("Invalid nose landmarks");
    }
    
    const noseTip = nose[3];
    const noseBase = nose[6] || nose[0]; // Fallback if nose[6] doesn't exist
    
    const directionColor = anomalies.some(a => a.type.includes("looking_away")) ? "#ff0000" : "#00ff00";
    
    ctx.strokeStyle = directionColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(noseBase.x, noseBase.y);
    ctx.lineTo(noseTip.x, noseTip.y);
    ctx.stroke();
    
    // Arrow head
    const angle = Math.atan2(noseTip.y - noseBase.y, noseTip.x - noseBase.x);
    const arrowLength = 8;
    
    ctx.beginPath();
    ctx.moveTo(noseTip.x, noseTip.y);
    ctx.lineTo(
      noseTip.x - arrowLength * Math.cos(angle - Math.PI / 6),
      noseTip.y - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(noseTip.x, noseTip.y);
    ctx.lineTo(
      noseTip.x - arrowLength * Math.cos(angle + Math.PI / 6),
      noseTip.y - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  } catch (error) {
    console.warn("Error drawing nose direction:", error);
    
    // Fallback: use manual nose points
    drawFallbackNose(ctx, landmarks, anomalies);
  }
};

// Fallback nose drawing
const drawFallbackNose = (ctx, landmarks, anomalies) => {
  const points = landmarks.positions || landmarks._positions || landmarks;
  if (!points) return;

  const directionColor = anomalies.some(a => a.type.includes("looking_away")) ? "#ff0000" : "#00ff00";
  
  // Nose tip is typically point 30, nose base could be point 27
  const noseTip = points[30];
  const noseBase = points[27];
  
  if (noseTip && noseBase) {
    ctx.strokeStyle = directionColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(noseBase.x, noseBase.y);
    ctx.lineTo(noseTip.x, noseTip.y);
    ctx.stroke();
    
    // Simple arrow
    ctx.fillStyle = directionColor;
    ctx.beginPath();
    ctx.arc(noseTip.x, noseTip.y, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
};

// Fix the polygon center function with error handling
const getPolygonCenter = (points) => {
  if (!points || points.length === 0) {
    return { x: 0, y: 0 };
  }
  
  const x = points.reduce((sum, p) => sum + (p.x || 0), 0) / points.length;
  const y = points.reduce((sum, p) => sum + (p.y || 0), 0) / points.length;
  return { x, y };
};

// Fix the calculateEyeAspectRatio function with error handling
const calculateEyeAspectRatio = (leftEye, rightEye) => {
  try {
    if (!leftEye || !rightEye || leftEye.length < 6 || rightEye.length < 6) {
      return 0.3; // Default value
    }

    // Calculate vertical distances for both eyes
    const leftEyeHeight = Math.sqrt(
      Math.pow(leftEye[1].x - leftEye[5].x, 2) + Math.pow(leftEye[1].y - leftEye[5].y, 2)
    ) + Math.sqrt(
      Math.pow(leftEye[2].x - leftEye[4].x, 2) + Math.pow(leftEye[2].y - leftEye[4].y, 2)
    );
    
    const rightEyeHeight = Math.sqrt(
      Math.pow(rightEye[1].x - rightEye[5].x, 2) + Math.pow(rightEye[1].y - rightEye[5].y, 2)
    ) + Math.sqrt(
      Math.pow(rightEye[2].x - rightEye[4].x, 2) + Math.pow(rightEye[2].y - rightEye[4].y, 2)
    );

    // Calculate horizontal distances
    const leftEyeWidth = Math.sqrt(
      Math.pow(leftEye[0].x - leftEye[3].x, 2) + Math.pow(leftEye[0].y - leftEye[3].y, 2)
    );
    const rightEyeWidth = Math.sqrt(
      Math.pow(rightEye[0].x - rightEye[3].x, 2) + Math.pow(rightEye[0].y - rightEye[3].y, 2)
    );

    // Calculate EAR
    const leftEAR = leftEyeHeight / (2 * leftEyeWidth);
    const rightEAR = rightEyeHeight / (2 * rightEyeWidth);
    
    return (leftEAR + rightEAR) / 2;
  } catch (error) {
    console.warn("Error calculating eye aspect ratio:", error);
    return 0.3; // Default safe value
  }
};

// Fix the calculateHeadPose function with error handling
const calculateHeadPose = (nose, faceBox) => {
  try {
    if (!nose || nose.length < 4 || !faceBox) {
      return { x: 0, y: 0, faceWidth: 100, faceHeight: 100 };
    }

    const noseTip = nose[3]; // Nose tip point
    const faceCenter = {
      x: faceBox.x + faceBox.width / 2,
      y: faceBox.y + faceBox.height / 2
    };
    
    return {
      x: noseTip.x - faceCenter.x,
      y: noseTip.y - faceCenter.y,
      faceWidth: faceBox.width,
      faceHeight: faceBox.height
    };
  } catch (error) {
    console.warn("Error calculating head pose:", error);
    return { x: 0, y: 0, faceWidth: 100, faceHeight: 100 };
  }
};

// Enhanced basic detection for non-overlay scenarios
const performBasicDetection = async ({
  videoElement,
  socketRef,
  interviewCode,
  onAnomalyDetected,
}) => {
  if (!videoElement || videoElement.paused || videoElement.ended) return;

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = Math.min(videoElement.videoWidth || 320, 320);
    canvas.height = Math.min(videoElement.videoHeight || 240, 240);
    
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Movement detection
    if (previousFrame) {
      const similarity = calculateFrameSimilarity(previousFrame, imageData);
      if (similarity > 0.97) {
        staticFrameCount++;
        if (staticFrameCount > 4) {
          const anomaly = {
            type: "no_movement_detected",
            confidence: 0.8,
            description: `No movement detected for ${staticFrameCount * 1.5} seconds`,
            timestamp: new Date().toISOString(),
          };
          sendAnomalyIfCooldownPassed(anomaly, socketRef, interviewCode, onAnomalyDetected);
          staticFrameCount = 0;
        }
      } else {
        staticFrameCount = 0;
      }
    }
    
    // Lighting/camera issues
    const brightness = calculateBrightness(imageData);
    if (brightness < 40) {
      darkFrameCount++;
      if (darkFrameCount > 2) {
        const anomaly = {
          type: "poor_lighting",
          confidence: 0.9,
          description: `Poor lighting detected (brightness: ${brightness.toFixed(1)})`,
          timestamp: new Date().toISOString(),
        };
        sendAnomalyIfCooldownPassed(anomaly, socketRef, interviewCode, onAnomalyDetected);
        darkFrameCount = 0;
      }
    } else {
      darkFrameCount = 0;
    }
    
    previousFrame = imageData;

  } catch (error) {
    console.error("❌ Basic detection error:", error);
  }
};

const sendAnomalyIfCooldownPassed = (anomaly, socketRef, interviewCode, onAnomalyDetected) => {
  const now = Date.now();
  if (now - lastDetectionTime > DETECTION_COOLDOWN) {
    lastDetectionTime = now;
    
    console.log("🚨 Sending anomaly:", anomaly.type, "confidence:", anomaly.confidence);
    
    sendMalpracticeDetection(
      socketRef,
      anomaly.type,
      anomaly.confidence,
      interviewCode,
      anomaly.description
    );

    if (onAnomalyDetected) {
      onAnomalyDetected({
        id: Date.now(),
        type: anomaly.type,
        confidence: anomaly.confidence,
        description: anomaly.description,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  }
};

const calculateFrameSimilarity = (frame1, frame2) => {
  const data1 = frame1.data;
  const data2 = frame2.data;
  let differences = 0;
  const sampleRate = 4;
  
  for (let i = 0; i < data1.length; i += 4 * sampleRate) {
    const diff = Math.abs(data1[i] - data2[i]) + 
                 Math.abs(data1[i + 1] - data2[i + 1]) + 
                 Math.abs(data1[i + 2] - data2[i + 2]);
    if (diff > 30) differences++;
  }
  
  return 1 - (differences / (data1.length / (4 * sampleRate)));
};

const calculateBrightness = (imageData) => {
  const data = imageData.data;
  let total = 0;
  const sampleRate = 4;
  
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    total += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  
  return total / (data.length / (4 * sampleRate));
};

export const setupFaceDetectionCanvas = (videoElement, canvasElement) => {
  if (!videoElement || !canvasElement) return;

  const updateCanvasSize = () => {
    if (videoElement.videoWidth && videoElement.videoHeight) {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
    } else {
      canvasElement.width = videoElement.clientWidth || 320;
      canvasElement.height = videoElement.clientHeight || 240;
    }
    
    canvasElement.style.position = "absolute";
    canvasElement.style.top = "0";
    canvasElement.style.left = "0";
    canvasElement.style.pointerEvents = "none";
    canvasElement.style.width = "100%";
    canvasElement.style.height = "100%";
    canvasElement.style.zIndex = "10";
    
    console.log("📐 Canvas size updated:", canvasElement.width, "x", canvasElement.height);
  };

  updateCanvasSize();
  
  videoElement.addEventListener('loadedmetadata', updateCanvasSize);
  videoElement.addEventListener('resize', updateCanvasSize);
  
  return () => {
    videoElement.removeEventListener('loadedmetadata', updateCanvasSize);
    videoElement.removeEventListener('resize', updateCanvasSize);
  };
};