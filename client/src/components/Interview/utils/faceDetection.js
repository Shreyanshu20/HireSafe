import * as faceapi from 'face-api.js';

class FaceDetectionService {
  constructor() {
    this.isInitialized = false;
    this.isDetecting = false;
    this.detectionInterval = null;
    this.detectionCallbacks = [];
    
    // Detection thresholds
    this.thresholds = {
      eyeAspectRatio: 0.19,
      eyesClosedDuration: 2000, // 2 seconds
      faceMissingDuration: 3000, // 3 seconds
      lookingAwayAngle: 25, // degrees
      lookingAwayDuration: 2000, // 2 seconds
      detectionInterval: 500 // 500ms between detections
    };

    // Detection state tracking
    this.detectionState = {
      lastFaceDetectedTime: Date.now(),
      eyesClosedStartTime: null,
      lookingAwayStartTime: null,
      currentFaceCount: 0,
      isEyesClosed: false,
      isLookingAway: false,
      isFaceMissing: false
    };
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('Initializing face detection models...');
      
      const MODEL_URL = '/models'; // Place models in public/models/
      
      // Load required models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);

      this.isInitialized = true;
      console.log('Face detection models loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize face detection:', error);
      return false;
    }
  }

  startDetection(videoElement, options = {}) {
    if (!this.isInitialized) {
      console.warn('Face detection not initialized');
      return false;
    }

    if (this.isDetecting) {
      this.stopDetection();
    }

    this.isDetecting = true;
    this.resetDetectionState();

    console.log('Starting face detection...');

    this.detectionInterval = setInterval(async () => {
      try {
        await this.performDetection(videoElement, options);
      } catch (error) {
        console.error('Detection error:', error);
      }
    }, this.thresholds.detectionInterval);

    return true;
  }

  stopDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    this.isDetecting = false;
    this.resetDetectionState();
    console.log('Face detection stopped');
  }

  async performDetection(videoElement, options = {}) {
    if (!videoElement || videoElement.videoWidth === 0) return;

    try {
      // Detect faces with landmarks and expressions
      const detections = await faceapi
        .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      // Update face count
      this.detectionState.currentFaceCount = detections.length;

      if (detections.length === 0) {
        this.handleNoFaceDetected();
      } else {
        this.detectionState.lastFaceDetectedTime = Date.now();
        this.detectionState.isFaceMissing = false;

        if (detections.length > 1) {
          this.triggerMalpracticeEvent('multiple_faces', {
            faceCount: detections.length,
            confidence: 0.9,
            message: `${detections.length} faces detected in frame`
          });
        }

        // Analyze primary face (largest detection)
        const primaryFace = this.getPrimaryFace(detections);
        if (primaryFace) {
          await this.analyzeFace(primaryFace, videoElement, options);
        }
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }
  }

  handleNoFaceDetected() {
    const now = Date.now();
    const timeSinceLastFace = now - this.detectionState.lastFaceDetectedTime;

    if (timeSinceLastFace > this.thresholds.faceMissingDuration && !this.detectionState.isFaceMissing) {
      this.detectionState.isFaceMissing = true;
      this.triggerMalpracticeEvent('face_missing', {
        confidence: 0.8,
        duration: timeSinceLastFace,
        message: `No face detected for ${Math.round(timeSinceLastFace / 1000)} seconds`
      });
    }
  }

  getPrimaryFace(detections) {
    if (!detections || detections.length === 0) return null;
    
    // Return the largest face detection
    return detections.reduce((largest, current) => {
      const currentArea = current.detection.box.width * current.detection.box.height;
      const largestArea = largest.detection.box.width * largest.detection.box.height;
      return currentArea > largestArea ? current : largest;
    });
  }

  async analyzeFace(faceDetection, videoElement, options = {}) {
    const { landmarks, expressions } = faceDetection;
    
    // Analyze eyes (closed detection)
    this.analyzeEyes(landmarks);
    
    // Analyze head pose (looking away detection)
    this.analyzeHeadPose(landmarks, videoElement);
    
    // Optional: Analyze suspicious expressions
    if (options.detectSuspiciousExpressions) {
      this.analyzeExpressions(expressions);
    }
  }

  analyzeEyes(landmarks) {
    if (!landmarks) return;

    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const leftEAR = this.calculateEyeAspectRatio(leftEye);
    const rightEAR = this.calculateEyeAspectRatio(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    const now = Date.now();

    if (avgEAR < this.thresholds.eyeAspectRatio) {
      // Eyes appear closed
      if (!this.detectionState.eyesClosedStartTime) {
        this.detectionState.eyesClosedStartTime = now;
      } else {
        const closedDuration = now - this.detectionState.eyesClosedStartTime;
        
        if (closedDuration > this.thresholds.eyesClosedDuration && !this.detectionState.isEyesClosed) {
          this.detectionState.isEyesClosed = true;
          this.triggerMalpracticeEvent('eyes_closed', {
            confidence: 0.7,
            eyeAspectRatio: avgEAR,
            duration: closedDuration,
            message: `Eyes closed for ${Math.round(closedDuration / 1000)} seconds`
          });
        }
      }
    } else {
      // Eyes are open
      this.detectionState.eyesClosedStartTime = null;
      this.detectionState.isEyesClosed = false;
    }
  }

  calculateEyeAspectRatio(eyePoints) {
    if (!eyePoints || eyePoints.length < 6) return 1;

    // Calculate eye aspect ratio using landmark points
    const vertical1 = this.euclideanDistance(eyePoints[1], eyePoints[5]);
    const vertical2 = this.euclideanDistance(eyePoints[2], eyePoints[4]);
    const horizontal = this.euclideanDistance(eyePoints[0], eyePoints[3]);

    const ear = (vertical1 + vertical2) / (2 * horizontal);
    return ear;
  }

  analyzeHeadPose(landmarks, videoElement) {
    if (!landmarks) return;

    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Calculate head pose angles
    const angles = this.calculateHeadPoseAngles(nose, leftEye, rightEye, videoElement);
    
    const isLookingAway = Math.abs(angles.yaw) > this.thresholds.lookingAwayAngle ||
                         Math.abs(angles.pitch) > this.thresholds.lookingAwayAngle;

    const now = Date.now();

    if (isLookingAway) {
      if (!this.detectionState.lookingAwayStartTime) {
        this.detectionState.lookingAwayStartTime = now;
      } else {
        const awayDuration = now - this.detectionState.lookingAwayStartTime;
        
        if (awayDuration > this.thresholds.lookingAwayDuration && !this.detectionState.isLookingAway) {
          this.detectionState.isLookingAway = true;
          this.triggerMalpracticeEvent('looking_away', {
            confidence: 0.6,
            yawAngle: angles.yaw,
            pitchAngle: angles.pitch,
            duration: awayDuration,
            message: `Looking away from camera for ${Math.round(awayDuration / 1000)} seconds`
          });
        }
      }
    } else {
      this.detectionState.lookingAwayStartTime = null;
      this.detectionState.isLookingAway = false;
    }
  }

  calculateHeadPoseAngles(nose, leftEye, rightEye, videoElement) {
    // Simplified head pose estimation
    const noseTip = nose[3]; // Nose tip point
    const leftEyeCenter = this.getCenterPoint(leftEye);
    const rightEyeCenter = this.getCenterPoint(rightEye);
    
    const eyeCenter = {
      x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: (leftEyeCenter.y + rightEyeCenter.y) / 2
    };

    // Calculate relative to video center
    const videoCenterX = videoElement.videoWidth / 2;
    const videoCenterY = videoElement.videoHeight / 2;

    // Simplified angle calculation (in degrees)
    const yaw = ((noseTip.x - videoCenterX) / videoCenterX) * 45;
    const pitch = ((noseTip.y - videoCenterY) / videoCenterY) * 30;

    return { yaw, pitch, roll: 0 };
  }

  analyzeExpressions(expressions) {
    if (!expressions) return;

    // Check for suspicious expressions (optional feature)
    const { surprised, fearful, angry } = expressions;
    
    if (surprised > 0.7 || fearful > 0.7 || angry > 0.7) {
      this.triggerMalpracticeEvent('suspicious_movement', {
        confidence: Math.max(surprised, fearful, angry),
        expressions: expressions,
        message: 'Suspicious facial expression detected'
      });
    }
  }

  triggerMalpracticeEvent(type, data) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      confidence: data.confidence || 0.5,
      message: data.message || `${type} detected`,
      data
    };

    console.warn('Malpractice detected:', event);

    // Notify all registered callbacks
    this.detectionCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Callback error:', error);
      }
    });
  }

  // Utility methods
  euclideanDistance(point1, point2) {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
  }

  getCenterPoint(points) {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  }

  resetDetectionState() {
    this.detectionState = {
      lastFaceDetectedTime: Date.now(),
      eyesClosedStartTime: null,
      lookingAwayStartTime: null,
      currentFaceCount: 0,
      isEyesClosed: false,
      isLookingAway: false,
      isFaceMissing: false
    };
  }

  // Public API methods
  onMalpracticeDetected(callback) {
    if (typeof callback === 'function') {
      this.detectionCallbacks.push(callback);
    }
  }

  removeCallback(callback) {
    const index = this.detectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.detectionCallbacks.splice(index, 1);
    }
  }

  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  getDetectionState() {
    return { ...this.detectionState };
  }

  isDetectionActive() {
    return this.isDetecting;
  }
}

// Export singleton instance
const faceDetectionService = new FaceDetectionService();
export default faceDetectionService;

// Export named functions for direct use
export const initializeFaceDetection = () => faceDetectionService.initialize();
export const startFaceDetection = (video, options) => faceDetectionService.startDetection(video, options);
export const stopFaceDetection = () => faceDetectionService.stopDetection();
export const onMalpracticeDetected = (callback) => faceDetectionService.onMalpracticeDetected(callback);