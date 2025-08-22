import * as faceapi from 'face-api.js';

class FaceDetectionService {
  constructor() {
    this.isInitialized = false;
    this.isDetecting = false;
    this.detectionInterval = null;
    this.detectionCallbacks = [];
    this.canvas = null;
    this.displaySize = null;
    
    // Detection thresholds
    this.thresholds = {
      eyeAspectRatio: 0.2,
      eyesClosedDuration: 3000,
      faceMissingDuration: 2000,
      lookingAwayAngle: 30,
      lookingAwayDuration: 3000,
      detectionInterval: 500 // Faster for better visualization
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
      console.log('🔄 Loading face-api models...');
      
      // ✅ Load models from public folder
      const MODEL_PATH = '/models';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_PATH)
      ]);

      this.isInitialized = true;
      console.log('✅ Face-API models loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load face-api models:', error);
      console.log('🔄 Trying CDN models...');
      
      try {
        // ✅ Fallback to CDN
        const CDN_PATH = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(CDN_PATH),
          faceapi.nets.faceLandmark68Net.loadFromUri(CDN_PATH)
        ]);

        this.isInitialized = true;
        console.log('✅ Face-API CDN models loaded');
        return true;
      } catch (cdnError) {
        console.error('❌ CDN models also failed:', cdnError);
        this.useFallbackDetection = true;
        this.isInitialized = true;
        return true;
      }
    }
  }

  setupCanvas(videoElement) {
    if (!videoElement) return null;

    // ✅ Create canvas overlay for detection visualization
    const videoContainer = videoElement.parentElement;
    if (!videoContainer) return null;

    // Remove existing canvas
    const existingCanvas = videoContainer.querySelector('.detection-canvas');
    if (existingCanvas) {
      existingCanvas.remove();
    }

    // Create new canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'detection-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '10';
    
    // ✅ Match video size
    const rect = videoElement.getBoundingClientRect();
    this.canvas.width = videoElement.videoWidth || rect.width;
    this.canvas.height = videoElement.videoHeight || rect.height;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.displaySize = { width: this.canvas.width, height: this.canvas.height };
    
    // Position relative to video
    videoContainer.style.position = 'relative';
    videoContainer.appendChild(this.canvas);

    console.log('✅ Detection canvas created:', this.displaySize);
    return this.canvas;
  }

  startDetection(videoElement, options = {}) {
    if (!videoElement) {
      console.warn('❌ No video element provided');
      return false;
    }

    // Wait for video to be ready
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      console.log('🔄 Video not ready, retrying...');
      setTimeout(() => this.startDetection(videoElement, options), 1000);
      return false;
    }

    if (this.isDetecting) {
      this.stopDetection();
    }

    // ✅ Setup canvas for visualization
    this.setupCanvas(videoElement);
    if (!this.canvas) {
      console.warn('❌ Failed to setup detection canvas');
      return false;
    }

    this.isDetecting = true;
    this.resetDetectionState();

    console.log('✅ Starting face detection with visualization');

    this.detectionInterval = setInterval(async () => {
      try {
        if (this.useFallbackDetection) {
          await this.performFallbackDetection(videoElement);
        } else {
          await this.performDetection(videoElement, options);
        }
      } catch (error) {
        console.error('Detection error:', error);
      }
    }, this.thresholds.detectionInterval);

    return true;
  }

  async performDetection(videoElement, options = {}) {
    if (!this.isInitialized || !videoElement || !this.canvas) return;

    try {
      const detectionOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.3
      });

      // ✅ Detect faces with landmarks and expressions
      const detections = await faceapi
        .detectAllFaces(videoElement, detectionOptions)
        .withFaceLandmarks()
        .withFaceExpressions();

      // ✅ Clear previous drawings
      const ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // ✅ Resize detections to match canvas
      const resizedDetections = faceapi.resizeResults(detections, this.displaySize);

      // ✅ Draw face boxes
      resizedDetections.forEach((detection, index) => {
        // Draw face box
        const box = detection.detection.box;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw face index
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px Arial';
        ctx.fillText(`Face ${index + 1}`, box.x, box.y - 5);

        // ✅ Draw landmarks (eyes, nose, mouth)
        if (detection.landmarks) {
          this.drawLandmarks(ctx, detection.landmarks);
        }

        // ✅ Draw expressions
        if (detection.expressions) {
          this.drawExpressions(ctx, detection.expressions, box);
        }
      });

      // ✅ Process detections for malpractice
      this.processDetections(resizedDetections, videoElement);

    } catch (error) {
      console.error('Face detection error:', error);
      await this.performFallbackDetection(videoElement);
    }
  }

  drawLandmarks(ctx, landmarks) {
    // ✅ Draw eye points
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();

    // Draw eyes
    ctx.fillStyle = '#ff0000';
    [...leftEye, ...rightEye].forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw nose
    ctx.fillStyle = '#0000ff';
    nose.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw mouth
    ctx.fillStyle = '#ff00ff';
    mouth.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  drawExpressions(ctx, expressions, box) {
    // ✅ Show top expression
    const topExpression = Object.keys(expressions).reduce((a, b) => 
      expressions[a] > expressions[b] ? a : b
    );

    ctx.fillStyle = '#ffff00';
    ctx.font = '12px Arial';
    ctx.fillText(
      `${topExpression}: ${(expressions[topExpression] * 100).toFixed(1)}%`,
      box.x, 
      box.y + box.height + 15
    );
  }

  processDetections(detections, videoElement) {
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
          message: `${detections.length} faces detected`
        });
      }

      // Analyze primary face
      const primaryFace = detections[0];
      if (primaryFace && primaryFace.landmarks) {
        this.analyzeFace(primaryFace, videoElement);
      }
    }
  }

  analyzeFace(faceDetection, videoElement) {
    const { landmarks, expressions } = faceDetection;

    try {
      // ✅ Eye analysis
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      if (leftEye && rightEye) {
        const leftEAR = this.calculateEyeAspectRatio(leftEye);
        const rightEAR = this.calculateEyeAspectRatio(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2;

        if (avgEAR < this.thresholds.eyeAspectRatio) {
          this.handleEyesClosed();
        } else {
          this.detectionState.eyesClosedStartTime = null;
          this.detectionState.isEyesClosed = false;
        }
      }

      // ✅ Head pose analysis
      this.checkHeadPose(landmarks, videoElement);

      // ✅ Expression analysis
      if (expressions) {
        this.analyzeExpressions(expressions);
      }

    } catch (error) {
      console.error('Face analysis error:', error);
    }
  }

  calculateEyeAspectRatio(eyePoints) {
    if (!eyePoints || eyePoints.length < 6) return 1;

    const height1 = Math.abs(eyePoints[1].y - eyePoints[5].y);
    const height2 = Math.abs(eyePoints[2].y - eyePoints[4].y);
    const width = Math.abs(eyePoints[0].x - eyePoints[3].x);
    
    return (height1 + height2) / (2 * width);
  }

  handleEyesClosed() {
    const now = Date.now();
    
    if (!this.detectionState.eyesClosedStartTime) {
      this.detectionState.eyesClosedStartTime = now;
    } else {
      const closedDuration = now - this.detectionState.eyesClosedStartTime;
      
      if (closedDuration > this.thresholds.eyesClosedDuration && !this.detectionState.isEyesClosed) {
        this.detectionState.isEyesClosed = true;
        this.triggerMalpracticeEvent('eyes_closed', {
          confidence: 0.8,
          duration: closedDuration,
          message: `Eyes closed for ${Math.round(closedDuration / 1000)} seconds`
        });
      }
    }
  }

  checkHeadPose(landmarks, videoElement) {
    try {
      const nose = landmarks.getNose();
      if (!nose || nose.length === 0) return;

      const noseTip = nose[nose.length - 1];
      const centerX = videoElement.videoWidth / 2;
      const centerY = videoElement.videoHeight / 2;

      const offsetX = Math.abs(noseTip.x - centerX);
      const offsetY = Math.abs(noseTip.y - centerY);

      const maxOffset = Math.min(videoElement.videoWidth, videoElement.videoHeight) * 0.25;

      if (offsetX > maxOffset || offsetY > maxOffset) {
        this.handleLookingAway(offsetX, offsetY);
      } else {
        this.detectionState.lookingAwayStartTime = null;
        this.detectionState.isLookingAway = false;
      }
    } catch (error) {
      console.error('Head pose check error:', error);
    }
  }

  handleLookingAway(offsetX, offsetY) {
    const now = Date.now();
    
    if (!this.detectionState.lookingAwayStartTime) {
      this.detectionState.lookingAwayStartTime = now;
    } else {
      const awayDuration = now - this.detectionState.lookingAwayStartTime;
      
      if (awayDuration > this.thresholds.lookingAwayDuration && !this.detectionState.isLookingAway) {
        this.detectionState.isLookingAway = true;
        this.triggerMalpracticeEvent('looking_away', {
          confidence: 0.7,
          offsetX,
          offsetY,
          duration: awayDuration,
          message: `Looking away for ${Math.round(awayDuration / 1000)} seconds`
        });
      }
    }
  }

  analyzeExpressions(expressions) {
    // Check for suspicious expressions
    if (expressions.surprised > 0.7) {
      this.triggerMalpracticeEvent('suspicious_expression', {
        confidence: expressions.surprised,
        expression: 'surprised',
        message: 'High surprise expression detected'
      });
    }
  }

  handleNoFaceDetected() {
    const now = Date.now();
    const timeSinceLastFace = now - this.detectionState.lastFaceDetectedTime;

    if (timeSinceLastFace > this.thresholds.faceMissingDuration && !this.detectionState.isFaceMissing) {
      this.detectionState.isFaceMissing = true;
      this.triggerMalpracticeEvent('face_missing', {
        confidence: 0.9,
        duration: timeSinceLastFace,
        message: `No face detected for ${Math.round(timeSinceLastFace / 1000)} seconds`
      });
    }
  }

  async performFallbackDetection(videoElement) {
    // ✅ Simple fallback - just draw a message
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      ctx.fillStyle = '#ff9800';
      ctx.font = '16px Arial';
      ctx.fillText('Face detection unavailable - using basic monitoring', 10, 30);
    }
  }

  stopDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    
    this.isDetecting = false;
    this.resetDetectionState();
    console.log('✅ Face detection stopped');
  }

  triggerMalpracticeEvent(type, data) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      confidence: data.confidence || 0.5,
      message: data.message || `${type} detected`,
      data
    };

    console.warn('🚨 Malpractice detected:', event);

    this.detectionCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Callback error:', error);
      }
    });
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

  getDetectionState() {
    return { ...this.detectionState };
  }

  isDetectionActive() {
    return this.isDetecting;
  }
}

const faceDetectionService = new FaceDetectionService();
export default faceDetectionService;

export const initializeFaceDetection = () => faceDetectionService.initialize();
export const startFaceDetection = (video, options) => faceDetectionService.startDetection(video, options);
export const stopFaceDetection = () => faceDetectionService.stopDetection();
export const onMalpracticeDetected = (callback) => faceDetectionService.onMalpracticeDetected(callback);