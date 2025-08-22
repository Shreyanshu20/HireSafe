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
import InterviewService from '../../services/interviewService'; // ✅ Use InterviewService

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
  const [sessionId, setSessionId] = useState(null);

  const {
    userRole,
    isInterviewer,
    isInterviewee,
    canViewMalpractice,
    canRecord
  } = useInterviewRole(meetingData);

  // Set session ID from meeting data
  useEffect(() => {
    if (meetingData?.sessionId) {
      setSessionId(meetingData.sessionId);
    }
  }, [meetingData]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setInterviewDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Video/Audio changes
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

          const handleMalpractice = async (event) => {
            console.log('Malpractice detected:', event);
            
            if (socketRef.current) {
              socketRef.current.emit('malpractice-detected', {
                meetingCode,
                type: event.type,
                confidence: event.confidence,
                message: event.message,
                timestamp: event.timestamp
              });
            }

            // ✅ Use InterviewService
            try {
              await InterviewService.logMalpracticeDetection(
                meetingCode,
                event.type,
                event.confidence,
                {
                  message: event.message,
                  user_role: userRole,
                  detection_data: event.data
                }
              );
            } catch (error) {
              console.error('Failed to log malpractice:', error);
            }
          };

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

    setIsRecording(!isRecording);
    toast.success(`Recording ${isRecording ? 'stopped' : 'started'}`);
  };

  const handleEndInterview = async () => {
    try {
      if (monitoringActive) {
        stopMalpracticeMonitoring();
        setMonitoringActive(false);
      }

      // ✅ Use InterviewService to end session
      if (sessionId) {
        await InterviewService.endInterviewSession(sessionId, 0);
      }

      if (cameraStream && cameraStream.getTracks) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      
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
      <div className="mb-4 w-full p-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-bold text-lg">Interview: {meetingCode}</span>
            {userRole && (
              <span className={`ml-3 px-2 py-1 rounded text-sm font-medium ${
                isInterviewer ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {userRole}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Duration: {formatTime(interviewDuration)}</span>
            {isRecording && (
              <span className="flex items-center text-red-600">
                <span className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                RECORDING
              </span>
            )}
            {monitoringActive && (
              <span className="flex items-center text-orange-600">
                <span className="w-2 h-2 bg-orange-600 rounded-full mr-2 animate-pulse"></span>
                MONITORING
              </span>
            )}
          </div>
        </div>
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
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-white p-3 rounded-lg shadow-lg border">
        <button
          onClick={handleVideo}
          className={`px-4 py-2 text-white rounded font-medium transition-colors ${
            video ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
          }`}
        >
          {video ? "Video On" : "Video Off"}
        </button>
        
        <button
          onClick={handleAudio}
          className={`px-4 py-2 text-white rounded font-medium transition-colors ${
            audio ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'
          }`}
        >
          {audio ? "Audio On" : "Audio Off"}
        </button>

        {canRecord && (
          <button
            onClick={handleRecording}
            className={`px-4 py-2 text-white rounded font-medium transition-colors ${
              isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>
        )}

        <button
          onClick={handleEndInterview}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors"
        >
          {isInterviewer ? "End Interview" : "Leave"}
        </button>
      </div>
    </div>
  );
};

export default InterviewRoom;