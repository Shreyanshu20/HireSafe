import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import CodeEditor from './CodeEditor';
import InterviewVideoGrid from './InterviewVideoGrid';
import MalpracticePanel from './MalpracticePanel';
import { useInterviewRole } from './hooks/useInterviewRole';
import { 
  getInterviewUserMedia, 
  initializeAudioContext,
  startMalpracticeMonitoring,
  stopMalpracticeMonitoring,
  faceDetectionService
} from './utils/interviewUtils';
import ActivityService, { ACTIVITY_TYPES } from '../../services/activityService';

const InterviewRoom = ({
  meetingCode,
  meetingData,
  localVideoRef,
  videos,
  video,
  setVideo,
  audio,
  setAudio,
  cameraStream,
  setCameraStream,
  videoAvailable,
  audioAvailable,
  socketRef,
  socketIdRef,
  onLeaveInterview
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [interviewDuration, setInterviewDuration] = useState(0);
  const [monitoringActive, setMonitoringActive] = useState(false);

  const {
    userRole,
    isInterviewer,
    isInterviewee,
    canViewMalpractice,
    canRecord
  } = useInterviewRole(meetingData);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setInterviewDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Video/Audio changes - use interview utils
  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getInterviewUserMedia({
        video,
        audio,
        videoAvailable,
        audioAvailable,
        cameraStream,
        setCameraStream,
        screen: false,
        screenStream: null,
        socketRef,
        socketIdRef,
        localVideoRef
      });
    }
  }, [audio, video]);

  // ✅ Start malpractice monitoring ONLY for interviewees
  useEffect(() => {
    if (isInterviewee && video && localVideoRef.current && !monitoringActive) {
      const startMonitoring = async () => {
        try {
          // Wait for video to be ready
          await new Promise(resolve => {
            const checkVideo = () => {
              if (localVideoRef.current?.videoWidth > 0) {
                resolve();
              } else {
                setTimeout(checkVideo, 100);
              }
            };
            checkVideo();
          });

          // Set up malpractice detection callback
          const handleMalpractice = (event) => {
            console.log('Malpractice detected:', event);
            
            // Emit to socket for interviewer
            if (socketRef.current) {
              socketRef.current.emit('malpractice-detected', {
                meetingCode,
                type: event.type,
                confidence: event.confidence,
                message: event.message,
                timestamp: event.timestamp
              });
            }

            // Log to activity service
            ActivityService.logMalpracticeDetection(
              meetingCode,
              event.type,
              event.confidence,
              {
                message: event.message,
                user_role: userRole,
                detection_data: event.data
              }
            ).catch(error => {
              console.error('Failed to log malpractice:', error);
            });
          };

          // Register callback and start monitoring
          faceDetectionService.onMalpracticeDetected(handleMalpractice);
          
          const started = startMalpracticeMonitoring(localVideoRef.current, {
            detectExpressions: true,
            strictMode: true
          });

          if (started) {
            setMonitoringActive(true);
            console.log('Malpractice monitoring started for interviewee');
          }

        } catch (error) {
          console.error('Failed to start monitoring:', error);
        }
      };

      startMonitoring();
    }

    // Cleanup
    return () => {
      if (monitoringActive) {
        stopMalpracticeMonitoring();
        setMonitoringActive(false);
      }
    };
  }, [isInterviewee, video, localVideoRef.current, monitoringActive]);

  const handleVideo = () => {
    initializeAudioContext();
    setVideo(!video);
  };

  const handleAudio = () => {
    initializeAudioContext();
    setAudio(!audio);
  };

  const handleRecording = async () => {
    if (!canRecord) {
      toast.error('Only interviewers can control recording');
      return;
    }

    try {
      setIsRecording(!isRecording);
      
      const activityType = isRecording 
        ? ACTIVITY_TYPES.INTERVIEW_RECORDING_STOPPED 
        : ACTIVITY_TYPES.INTERVIEW_RECORDING_STARTED;
      
      await ActivityService.logInterviewActivity(
        meetingCode,
        activityType,
        `Recording ${isRecording ? 'stopped' : 'started'}`,
        { user_role: userRole }
      );

      toast.success(`Recording ${isRecording ? 'stopped' : 'started'}`);
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Recording failed');
    }
  };

  const handleEndInterview = async () => {
    try {
      // Stop monitoring
      if (monitoringActive) {
        stopMalpracticeMonitoring();
        setMonitoringActive(false);
      }

      // Log activity
      await ActivityService.logInterviewActivity(
        meetingCode,
        ACTIVITY_TYPES.INTERVIEW_ENDED,
        `Interview ${isInterviewer ? 'ended' : 'left'} by ${userRole}`,
        { user_role: userRole, duration_seconds: interviewDuration }
      );

      // Stop media tracks
      if (cameraStream && cameraStream.getTracks) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      onLeaveInterview();
      toast.success('Left interview');
    } catch (error) {
      console.error('End interview error:', error);
      onLeaveInterview();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full min-h-screen p-4">
      {/* Header */}
      <div className="mb-4 w-full">
        <span className="font-bold">Interview Code: {meetingCode}</span>
        {userRole && <span> | Role: {userRole}</span>}
        <span> | Duration: {formatTime(interviewDuration)}</span>
        {isRecording && <span className="text-red-500"> | RECORDING</span>}
        {monitoringActive && <span className="text-orange-500"> | MONITORING</span>}
      </div>

      {/* Main Layout */}
      <div className="w-full h-screen flex">
        {/* Left - Code Editor */}
        <div className="w-1/2 h-full border-r border-gray-300">
          <CodeEditor
            socketRef={socketRef}
            meetingCode={meetingCode}
            userRole={userRole}
          />
        </div>

        {/* Right - Video + Monitoring */}
        <div className="w-1/2 h-full flex flex-col">
          {/* Video Section */}
          <div className="flex-1 p-4">
            <InterviewVideoGrid
              localVideoRef={localVideoRef}
              videos={videos}
              userRole={userRole}
              isInterviewer={isInterviewer}
              monitoringActive={monitoringActive}
            />
          </div>

          {/* Malpractice Panel (Interviewer Only) */}
          {canViewMalpractice && (
            <div className="h-64 border-t border-gray-300 p-4">
              <MalpracticePanel
                socketRef={socketRef}
                meetingCode={meetingCode}
                isInterviewer={isInterviewer}
              />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-white p-2 rounded shadow-lg">
        <button
          onClick={handleVideo}
          className={`px-4 py-2 text-white rounded ${video ? 'bg-blue-500' : 'bg-gray-500'}`}
        >
          {video ? "Video On" : "Video Off"}
        </button>
        
        <button
          onClick={handleAudio}
          className={`px-4 py-2 text-white rounded ${audio ? 'bg-green-500' : 'bg-gray-500'}`}
        >
          {audio ? "Audio On" : "Audio Off"}
        </button>

        {canRecord && (
          <button
            onClick={handleRecording}
            className={`px-4 py-2 text-white rounded ${isRecording ? 'bg-red-500' : 'bg-orange-500'}`}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>
        )}

        <button
          onClick={handleEndInterview}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          {isInterviewer ? "End Interview" : "Leave"}
        </button>
      </div>
    </div>
  );
};

export default InterviewRoom;