import { toast } from "react-toastify";
import { getPermissions as getMeetingPermissions, getUserMedia as getMeetingUserMedia, initializeAudioContext } from "../../Meetings/utils/mediaUtils";
import faceDetectionService, { initializeFaceDetection } from './faceDetection';

// ✅ REMOVED: Face detection initialization from permissions
export const getInterviewPermissions = async ({
  setVideoAvailable,
  setAudioAvailable,
  setScreenAvailable,
  setCameraStream,
  localVideoRef
}) => {
  // ✅ Only get permissions, no face detection setup
  await getMeetingPermissions({
    setVideoAvailable,
    setAudioAvailable,
    setScreenAvailable,
    setCameraStream,
    localVideoRef
  });

  console.log('✅ Interview permissions ready');
};

export const getInterviewUserMedia = getMeetingUserMedia;

// ✅ Initialize and start monitoring together
export const startMalpracticeMonitoring = async (videoElement, options = {}) => {
  if (!videoElement) {
    console.warn('❌ Video element not available for monitoring');
    return false;
  }

  try {
    // ✅ Initialize face detection first
    console.log('🔄 Initializing face detection for monitoring...');
    const initialized = await initializeFaceDetection();
    
    if (!initialized) {
      console.warn('⚠️ Face detection failed to initialize, using fallback');
    }

    // ✅ Wait for video to be ready
    const waitForVideo = () => {
      return new Promise((resolve) => {
        const checkVideo = () => {
          if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            resolve();
          } else {
            setTimeout(checkVideo, 100);
          }
        };
        checkVideo();
      });
    };

    await waitForVideo();

    // ✅ Start detection with visualization
    const started = faceDetectionService.startDetection(videoElement, {
      detectExpressions: true,
      strictMode: true,
      showVisualization: true,
      ...options
    });

    if (started) {
      console.log('✅ Malpractice monitoring started with visualization');
      toast.success('Face detection monitoring active');
      return true;
    } else {
      console.warn('❌ Failed to start face detection');
      toast.warn('Monitoring unavailable');
      return false;
    }

  } catch (error) {
    console.error('❌ Failed to start malpractice monitoring:', error);
    toast.error('Failed to start monitoring');
    return false;
  }
};

export const stopMalpracticeMonitoring = () => {
  try {
    faceDetectionService.stopDetection();
    console.log('✅ Malpractice monitoring stopped');
  } catch (error) {
    console.error('Error stopping monitoring:', error);
  }
};

export const configureMalpracticeDetection = (thresholds) => {
  faceDetectionService.updateThresholds(thresholds);
};

export { faceDetectionService, initializeAudioContext };