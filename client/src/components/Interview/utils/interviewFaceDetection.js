import { sendMalpracticeDetection } from "./socketUtils";

let isModelLoaded = false;
let detectionInterval = null;
let lastDetectionTime = 0;
const DETECTION_COOLDOWN = 1500;
let useBasicDetection = false;
let eyeClosedCount = 0;
let lookingAwayCount = 0;
let previousHeadPosition = null;
let suspiciousMovementCount = 0;
let phoneDetectionCount = 0;
let multiplePersonCount = 0;
let offScreenCount = 0;
let tabSwitchCount = 0;
let previousFrame = null;
let staticFrameCount = 0;
let darkFrameCount = 0;
let detectionCount = 0;

export const initializeFaceDetection = async () => {
  if (isModelLoaded) return true;

  // Check if face-api.js is loaded
  if (!window.faceapi) {
    console.warn("Face-api.js not loaded, using basic detection");
    isModelLoaded = true;
    useBasicDetection = true;
    return true;
  }

  try {
    const success = await loadModelsWithRetry();
    if (success) {
      useBasicDetection = false;
      isModelLoaded = true;
      console.log("✅ Face detection models loaded successfully");
      return true;
    } else {
      console.warn(
        "⚠️ Face detection models failed to load, using basic detection"
      );
      useBasicDetection = true;
      isModelLoaded = true;
      return true;
    }
  } catch (error) {
    console.warn("⚠️ Face detection initialization error:", error);
    useBasicDetection = true;
    isModelLoaded = true;
    return true;
  }
};

const loadModelsWithRetry = async (retryCount = 3) => {
  if (!window.faceapi) {
    return false;
  }

  const api = window.faceapi;

  // Check if models are already loaded
  if (
    api.nets.tinyFaceDetector?.isLoaded &&
    api.nets.faceLandmark68Net?.isLoaded &&
    api.nets.faceExpressionNet?.isLoaded
  ) {
    console.log("✅ Models already loaded");
    return true;
  }

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(
        `🔄 Loading face detection models (attempt ${attempt}/${retryCount})`
      );

      const modelPaths = [
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model",
        "/models",
        "./models",
        "/public/models",
        "./public/models",
      ];

      for (const modelPath of modelPaths) {
        try {
          console.log(`🔄 Trying model path: ${modelPath}`);

          await Promise.all([
            api.nets.tinyFaceDetector.loadFromUri(modelPath),
            api.nets.faceLandmark68Net.loadFromUri(modelPath),
            api.nets.faceExpressionNet.loadFromUri(modelPath),
          ]);

          console.log(`✅ Models loaded successfully from: ${modelPath}`);
          return true;
        } catch (pathError) {
          console.warn(
            `❌ Failed to load from ${modelPath}:`,
            pathError.message
          );
          continue;
        }
      }

      if (attempt < retryCount) {
        console.log(`⏳ Retrying in ${attempt} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error);
      if (attempt === retryCount) {
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
    console.log("🔄 Initializing face detection...");
    initializeFaceDetection().then((loaded) => {
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
    console.warn("⚠️ No video element provided");
    return;
  }

  if (detectionInterval) {
    clearInterval(detectionInterval);
  }

  const startDetection = () => {
    if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      console.log(
        `🚀 Starting ${
          isInterviewer ? "interviewer" : "candidate"
        } face detection`
      );

      detectionInterval = setInterval(
        async () => {
          detectionCount++;

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
            if (!isInterviewer) {
              useBasicDetection = true;
              console.log("🔄 Switched to basic detection mode");
            }
          }
        },
        isInterviewer ? 800 : 1000
      );
    } else {
      console.log("⏳ Waiting for video to be ready...");
      setTimeout(startDetection, 500);
    }
  };

  startDetection();
};

export const stopInterviewFaceDetection = () => {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
    console.log("🛑 Face detection stopped");
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
  previousFrame = null;
  staticFrameCount = 0;
  darkFrameCount = 0;
};

const performAdvancedFaceDetection = async ({
  videoElement,
  canvasElement,
  socketRef,
  interviewCode,
  isInterviewer,
  onAnomalyDetected,
}) => {
  if (!videoElement || videoElement.paused || videoElement.ended) {
    return;
  }

  try {
    const api = window.faceapi;

    if (!api?.nets?.tinyFaceDetector?.isLoaded) {
      console.warn("⚠️ Models not loaded, attempting to reload...");
      const loaded = await loadModelsWithRetry();
      if (!loaded) {
        useBasicDetection = true;
        if (isInterviewer && canvasElement) {
          showDetectionError(canvasElement, "Models failed to load");
        }
        return;
      }
    }

    const detections = await api
      .detectAllFaces(
        videoElement,
        new api.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.25,
        })
      )
      .withFaceLandmarks()
      .withFaceExpressions();

    const anomalies = analyzeInterviewBehavior(detections, videoElement);

    if (canvasElement && isInterviewer) {
      drawInterviewOverlay(canvasElement, detections, anomalies, videoElement);
    }

    if (!isInterviewer && anomalies.length > 0) {
      anomalies.forEach((anomaly) => {
        sendAnomalyIfCooldownPassed(
          anomaly,
          socketRef,
          interviewCode,
          onAnomalyDetected
        );
      });
    }
  } catch (error) {
    console.error("❌ Advanced detection error:", error);

    if (canvasElement && isInterviewer) {
      showDetectionError(canvasElement, error.message);
    }

    if (!isInterviewer) {
      useBasicDetection = true;
      console.log("🔄 Switched to basic detection due to error");
    }
  }
};

const showDetectionError = (canvasElement, errorMessage) => {
  const ctx = canvasElement.getContext("2d");
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
  ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  ctx.fillStyle = "#ff0000";
  ctx.font = "bold 16px Arial";
  ctx.fillText("⚠️ Detection Error", 10, 30);

  ctx.font = "12px Arial";
  ctx.fillText("Using Basic Detection Mode", 10, 50);

  if (errorMessage) {
    ctx.font = "10px Arial";
    ctx.fillText(`Error: ${errorMessage.substring(0, 50)}...`, 10, 70);
  }
};

const analyzeInterviewBehavior = (detections, videoElement) => {
  const anomalies = [];
  const currentTime = new Date().toISOString();

  // Absence detection
  if (detections.length === 0) {
    offScreenCount++;
    if (offScreenCount > 2) {
      anomalies.push({
        type: "candidate_absent",
        confidence: 0.95,
        description: "Candidate not visible in camera",
        timestamp: currentTime,
      });
    }
  } else {
    offScreenCount = 0;
  }

  // Multiple people detection
  if (detections.length > 1) {
    multiplePersonCount++;
    anomalies.push({
      type: "multiple_people",
      confidence: 0.98,
      description: `${detections.length} people detected - unauthorized assistance`,
      timestamp: currentTime,
    });
  } else {
    multiplePersonCount = 0;
  }

  if (detections.length > 0) {
    const primaryFace = detections[0];
    const landmarks = primaryFace.landmarks;
    const expressions = primaryFace.expressions;

    let eyeAspectRatio = 0.3;
    if (landmarks) {
      try {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        eyeAspectRatio = calculateEyeAspectRatio(leftEye, rightEye);
      } catch (error) {
        console.warn("⚠️ Eye aspect ratio calculation failed:", error);
      }
    }

    if (landmarks) {
      try {
        const nose = landmarks.getNose();
        const faceBox = primaryFace.detection.box;
        const headPosition = calculateHeadPose(nose, faceBox);

        // Looking away detection
        if (isLookingAway(headPosition, faceBox)) {
          lookingAwayCount++;
          if (lookingAwayCount > 2) {
            anomalies.push({
              type: "looking_away_extended",
              confidence: 0.88,
              description: `Candidate looking away - possible external assistance`,
              timestamp: currentTime,
            });
          }
        } else {
          lookingAwayCount = 0;
        }

        // Eye closure detection
        if (eyeAspectRatio < 0.22) {
          eyeClosedCount++;
          if (eyeClosedCount > 3) {
            anomalies.push({
              type: "eyes_closed_extended",
              confidence: 0.85,
              description: `Eyes closed for extended period - possible distraction`,
              timestamp: currentTime,
            });
          }
        } else {
          eyeClosedCount = 0;
        }

        // Head movement detection
        if (previousHeadPosition) {
          const movementMagnitude = Math.sqrt(
            Math.pow(headPosition.x - previousHeadPosition.x, 2) +
              Math.pow(headPosition.y - previousHeadPosition.y, 2)
          );

          if (movementMagnitude > 35) {
            suspiciousMovementCount++;
            if (suspiciousMovementCount > 2) {
              anomalies.push({
                type: "suspicious_head_movement",
                confidence: 0.75,
                description:
                  "Frequent head movements - possible external device use",
                timestamp: currentTime,
              });
              suspiciousMovementCount = 0;
            }
          }
        }
        previousHeadPosition = headPosition;
      } catch (error) {
        console.warn("⚠️ Landmark analysis failed:", error);
      }
    }

    // Expression analysis
    if (expressions) {
      try {
        if (expressions.fearful > 0.6 || expressions.surprised > 0.7) {
          anomalies.push({
            type: "high_stress_detected",
            confidence: 0.7,
            description: `High stress/surprise detected - unusual behavior`,
            timestamp: currentTime,
          });
        }

        // Reading behavior detection (focused concentration patterns)
        if (expressions.neutral > 0.85 && eyeAspectRatio > 0.35) {
          phoneDetectionCount++;
          if (phoneDetectionCount > 5) {
            anomalies.push({
              type: "reading_behavior",
              confidence: 0.75,
              description:
                "Sustained focused reading - possible use of notes/device",
              timestamp: currentTime,
            });
            phoneDetectionCount = 0;
          }
        }
      } catch (error) {
        console.warn("⚠️ Expression analysis failed:", error);
      }
    }

    // Distance detection
    try {
      const faceArea =
        primaryFace.detection.box.width * primaryFace.detection.box.height;
      const videoArea = videoElement.videoWidth * videoElement.videoHeight;
      const faceRatio = faceArea / videoArea;

      if (faceRatio < 0.025) {
        anomalies.push({
          type: "candidate_too_far",
          confidence: 0.85,
          description: `Candidate too far from camera - verification difficult`,
          timestamp: currentTime,
        });
      } else if (faceRatio > 0.35) {
        anomalies.push({
          type: "candidate_too_close",
          confidence: 0.8,
          description: `Candidate unusually close - possible screen reading`,
          timestamp: currentTime,
        });
      }
    } catch (error) {
      console.warn("⚠️ Distance calculation failed:", error);
    }

    // Quality detection
    if (primaryFace.detection.score < 0.6) {
      anomalies.push({
        type: "poor_video_quality",
        confidence: 0.65,
        description: `Poor detection quality - improve lighting/camera`,
        timestamp: currentTime,
      });
    }
  }

  return anomalies;
};

// Utility functions with error handling
const calculateEyeAspectRatio = (leftEye, rightEye) => {
  try {
    if (!leftEye || !rightEye || leftEye.length < 6 || rightEye.length < 6) {
      return 0.3;
    }

    const leftEyeHeight =
      Math.sqrt(
        Math.pow(leftEye[1].x - leftEye[5].x, 2) +
          Math.pow(leftEye[1].y - leftEye[5].y, 2)
      ) +
      Math.sqrt(
        Math.pow(leftEye[2].x - leftEye[4].x, 2) +
          Math.pow(leftEye[2].y - leftEye[4].y, 2)
      );

    const rightEyeHeight =
      Math.sqrt(
        Math.pow(rightEye[1].x - rightEye[5].x, 2) +
          Math.pow(rightEye[1].y - rightEye[5].y, 2)
      ) +
      Math.sqrt(
        Math.pow(rightEye[2].x - rightEye[4].x, 2) +
          Math.pow(rightEye[2].y - rightEye[4].y, 2)
      );

    const leftEyeWidth = Math.sqrt(
      Math.pow(leftEye[0].x - leftEye[3].x, 2) +
        Math.pow(leftEye[0].y - leftEye[3].y, 2)
    );
    const rightEyeWidth = Math.sqrt(
      Math.pow(rightEye[0].x - rightEye[3].x, 2) +
        Math.pow(rightEye[0].y - rightEye[3].y, 2)
    );

    const leftEAR = leftEyeHeight / (2 * leftEyeWidth);
    const rightEAR = rightEyeHeight / (2 * rightEyeWidth);

    return (leftEAR + rightEAR) / 2;
  } catch (error) {
    console.warn("⚠️ Eye aspect ratio calculation error:", error);
    return 0.3;
  }
};

const calculateHeadPose = (nose, faceBox) => {
  try {
    if (!nose || nose.length < 4 || !faceBox) {
      return { x: 0, y: 0, faceWidth: 100, faceHeight: 100 };
    }

    const noseTip = nose[3];
    const faceCenter = {
      x: faceBox.x + faceBox.width / 2,
      y: faceBox.y + faceBox.height / 2,
    };

    return {
      x: noseTip.x - faceCenter.x,
      y: noseTip.y - faceCenter.y,
      faceWidth: faceBox.width,
      faceHeight: faceBox.height,
    };
  } catch (error) {
    console.warn("⚠️ Head pose calculation error:", error);
    return { x: 0, y: 0, faceWidth: 100, faceHeight: 100 };
  }
};

const isLookingAway = (headPosition, faceBox) => {
  try {
    const horizontalThreshold = faceBox.width * 0.12;
    const verticalThreshold = faceBox.height * 0.1;

    return (
      Math.abs(headPosition.x) > horizontalThreshold ||
      Math.abs(headPosition.y) > verticalThreshold
    );
  } catch (error) {
    console.warn("⚠️ Looking away calculation error:", error);
    return false;
  }
};

const getPolygonCenter = (points) => {
  try {
    if (!points || points.length === 0) {
      return { x: 0, y: 0 };
    }

    const x = points.reduce((sum, p) => sum + (p.x || 0), 0) / points.length;
    const y = points.reduce((sum, p) => sum + (p.y || 0), 0) / points.length;
    return { x, y };
  } catch (error) {
    console.warn("⚠️ Polygon center calculation error:", error);
    return { x: 0, y: 0 };
  }
};

// SIMPLE: Clean overlay without all the bullshit
const drawInterviewOverlay = (canvas, detections, anomalies, videoElement) => {
  if (!canvas) return;

  try {
    const ctx = canvas.getContext("2d");
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Simple status in top corner
    drawSimpleStatus(ctx, detections, anomalies);

    if (detections.length === 0) {
      drawSimpleNoFace(ctx, canvas.width, canvas.height);
      return;
    }

    detections.forEach((detection, index) => {
      const { x, y, width, height } = detection.detection.box;
      const landmarks = detection.landmarks;
      const confidence = detection.detection.score;

      // Simple face box
      drawSimpleFaceBox(ctx, x, y, width, height, confidence, anomalies, detections.length > 1 ? index + 1 : null);

      // Draw face landmarks - eyes and jaw
      if (landmarks) {
        drawFaceLandmarks(ctx, landmarks, anomalies);
      }
    });

    // Simple anomaly alerts
    if (anomalies.length > 0) {
      drawSimpleAnomalies(ctx, anomalies, canvas.width);
    }

  } catch (error) {
    console.error("❌ Drawing error:", error);
  }
};

// Simple status indicator - FIXED
const drawSimpleStatus = (ctx, detections, anomalies) => {
  const criticalAnomalies = anomalies.filter(a => 
    ["multiple_people", "candidate_absent", "no_movement_detected"].includes(a.type)
  );

  let status = "Status: Normal";
  let color = "#00ff00";

  if (criticalAnomalies.length > 0 || detections.length > 1) {
    status = "Status: Anomaly";
    color = "#ff0000";
  }

  // Status background
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(10, 10, 160, 35);

  // Status border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 160, 35);

  // Status text
  ctx.fillStyle = color;
  ctx.font = "bold 14px Arial";
  ctx.fillText(status, 20, 32);
};

// Simple face box
const drawSimpleFaceBox = (ctx, x, y, width, height, confidence, anomalies, personNumber) => {
  // Box color based on issues
  let color = "#00ff00"; // Green = good
  
  if (confidence < 0.6) {
    color = "#ffff00"; // Yellow = poor quality
  }
  
  const criticalAnomalies = anomalies.filter(a => 
    ["multiple_people", "candidate_absent", "looking_away_extended", "eyes_closed_extended"].includes(a.type)
  );
  
  if (criticalAnomalies.length > 0) {
    color = "#ff0000"; // Red = problems
  }

  // Simple rectangle
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);

  // Confidence in corner
  ctx.fillStyle = color;
  ctx.font = "bold 14px Arial";
  ctx.fillText(`${(confidence * 100).toFixed(0)}%`, x + width - 50, y - 5);

  // Person number if multiple people
  if (personNumber) {
    ctx.fillStyle = "#ff0000";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`#${personNumber}`, x, y - 10);
  }
};

// FIXED: Face landmarks with dots and jaw line
const drawFaceLandmarks = (ctx, landmarks, anomalies) => {
  try {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const jawOutline = landmarks.getJawOutline();

    const eyesClosed = anomalies.some(a => a.type.includes("eyes_closed"));
    const eyeColor = eyesClosed ? "#ff0000" : "#00ff00";

    // Draw jaw line
    if (jawOutline && jawOutline.length > 0) {
      ctx.strokeStyle = "#00ffff"; // Cyan for jaw
      ctx.lineWidth = 2;
      ctx.beginPath();
      jawOutline.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();

      // Draw jaw dots
      ctx.fillStyle = "#00ffff";
      jawOutline.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Draw left eye dots
    if (leftEye && leftEye.length > 0) {
      ctx.fillStyle = eyeColor;
      leftEye.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Draw right eye dots
    if (rightEye && rightEye.length > 0) {
      ctx.fillStyle = eyeColor;
      rightEye.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

  } catch (error) {
    console.warn("⚠️ Landmark drawing failed:", error);
  }
};

// Simple no face message
const drawSimpleNoFace = (ctx, canvasWidth, canvasHeight) => {
  ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = "#ff0000";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("NO FACE DETECTED", canvasWidth / 2, canvasHeight / 2);
  ctx.textAlign = "left";
};

// Simple anomaly alerts
const drawSimpleAnomalies = (ctx, anomalies, canvasWidth) => {
  const importantAnomalies = anomalies.filter(a => 
    ["multiple_people", "candidate_absent", "looking_away_extended", "eyes_closed_extended"].includes(a.type)
  ).slice(0, 2);

  importantAnomalies.forEach((anomaly, index) => {
    const alertY = 70 + (index * 50);
    const alertX = canvasWidth - 300;

    // Alert background
    ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
    ctx.fillRect(alertX, alertY, 290, 40);

    // Alert border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(alertX, alertY, 290, 40);

    // Alert text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.fillText(`⚠ ${anomaly.type.replace("_", " ").toUpperCase()}`, alertX + 10, alertY + 15);
    
    ctx.font = "10px Arial";
    const desc = anomaly.description.substring(0, 35) + "...";
    ctx.fillText(desc, alertX + 10, alertY + 30);

    // Confidence
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 11px Arial";
    ctx.fillText(`${(anomaly.confidence * 100).toFixed(0)}%`, alertX + 250, alertY + 25);
  });
};

// Basic detection functions (unchanged)
const performBasicDetection = async ({
  videoElement,
  socketRef,
  interviewCode,
  onAnomalyDetected,
}) => {
  if (!videoElement || videoElement.paused || videoElement.ended) return;

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = Math.min(videoElement.videoWidth || 320, 320);
    canvas.height = Math.min(videoElement.videoHeight || 240, 240);

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (previousFrame) {
      const similarity = calculateFrameSimilarity(previousFrame, imageData);
      if (similarity > 0.95) {
        staticFrameCount++;
        if (staticFrameCount > 3) {
          const anomaly = {
            type: "no_movement_detected",
            confidence: 0.8,
            description: `No movement detected`,
            timestamp: new Date().toISOString(),
          };
          sendAnomalyIfCooldownPassed(anomaly, socketRef, interviewCode, onAnomalyDetected);
          staticFrameCount = 0;
        }
      } else {
        staticFrameCount = 0;
      }
    }

    const brightness = calculateBrightness(imageData);
    if (brightness < 45) {
      darkFrameCount++;
      if (darkFrameCount > 2) {
        const anomaly = {
          type: "poor_lighting",
          confidence: 0.9,
          description: `Poor lighting detected`,
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
    console.warn("⚠️ Basic detection error:", error);
  }
};

const sendAnomalyIfCooldownPassed = (anomaly, socketRef, interviewCode, onAnomalyDetected) => {
  const now = Date.now();
  if (now - lastDetectionTime > DETECTION_COOLDOWN) {
    lastDetectionTime = now;

    sendMalpracticeDetection(socketRef, anomaly.type, anomaly.confidence, interviewCode, anomaly.description);

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
  try {
    const data1 = frame1.data;
    const data2 = frame2.data;
    let differences = 0;
    const sampleRate = 4;

    for (let i = 0; i < data1.length; i += 4 * sampleRate) {
      const diff =
        Math.abs(data1[i] - data2[i]) +
        Math.abs(data1[i + 1] - data2[i + 1]) +
        Math.abs(data1[i + 2] - data2[i + 2]);
      if (diff > 25) differences++;
    }

    return 1 - differences / (data1.length / (4 * sampleRate));
  } catch (error) {
    console.warn("⚠️ Frame similarity calculation error:", error);
    return 0;
  }
};

const calculateBrightness = (imageData) => {
  try {
    const data = imageData.data;
    let total = 0;
    const sampleRate = 4;

    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }

    return total / (data.length / (4 * sampleRate));
  } catch (error) {
    console.warn("⚠️ Brightness calculation error:", error);
    return 100; // Return bright value on error
  }
};

// ADD THIS MISSING EXPORT
export const setupFaceDetectionCanvas = (videoElement, canvasElement) => {
  if (!videoElement || !canvasElement) return;

  const updateCanvasSize = () => {
    try {
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
    } catch (error) {
      console.warn("⚠️ Canvas setup error:", error);
    }
  };

  updateCanvasSize();

  videoElement.addEventListener("loadedmetadata", updateCanvasSize);
  videoElement.addEventListener("resize", updateCanvasSize);

  return () => {
    videoElement.removeEventListener("loadedmetadata", updateCanvasSize);
    videoElement.removeEventListener("resize", updateCanvasSize);
  };
};
