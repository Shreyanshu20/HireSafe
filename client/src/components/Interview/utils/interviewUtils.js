import { toast } from "react-toastify";
import { getPermissions as getMeetingPermissions, getUserMedia as getMeetingUserMedia, initializeAudioContext } from "../../Meetings/utils/mediaUtils";
import faceDetectionService, { initializeFaceDetection } from './faceDetection';

// ✅ Reuse meeting permissions but add face detection initialization
export const getInterviewPermissions = async ({
  setVideoAvailable,
  setAudioAvailable,
  setScreenAvailable,
  setCameraStream,
  localVideoRef
}) => {
  // Use existing meeting permissions
  await getMeetingPermissions({
    setVideoAvailable,
    setAudioAvailable,
    setScreenAvailable,
    setCameraStream,
    localVideoRef
  });

  // ✅ ONLY for interviews: Initialize face detection
  try {
    const faceDetectionReady = await initializeFaceDetection();
    if (faceDetectionReady) {
      console.log('Face detection ready for interview mode');
    }
  } catch (error) {
    console.error('Face detection initialization failed:', error);
  }
};

// ✅ Reuse meeting getUserMedia (no changes needed)
export const getInterviewUserMedia = getMeetingUserMedia;

// ✅ NEW: Face detection functions (ONLY for interviews)
export const startMalpracticeMonitoring = (videoElement, options = {}) => {
  if (!videoElement) {
    console.warn('Video element not available for monitoring');
    return false;
  }

  try {
    const detectionOptions = {
      detectSuspiciousExpressions: options.detectExpressions || false,
      strictMode: options.strictMode || true,
      ...options
    };

    return faceDetectionService.startDetection(videoElement, detectionOptions);
  } catch (error) {
    console.error('Failed to start malpractice monitoring:', error);
    return false;
  }
};

export const stopMalpracticeMonitoring = () => {
  faceDetectionService.stopDetection();
};

export const configureMalpracticeDetection = (thresholds) => {
  faceDetectionService.updateThresholds(thresholds);
};

// Export face detection service for direct access
export { faceDetectionService, initializeAudioContext };