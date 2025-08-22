import React, { useState } from 'react';
import { startMalpracticeMonitoring, stopMalpracticeMonitoring } from './utils/interviewUtils';

const InterviewVideoGrid = ({ 
  localVideoRef, 
  videos, 
  userRole, 
  isInterviewer,
  monitoringActive
}) => {
  const [testMode, setTestMode] = useState(false);

  const testDetection = async () => {
    if (!testMode) {
      console.log('🧪 Starting test detection...');
      const started = await startMalpracticeMonitoring(localVideoRef.current, { testMode: true });
      setTestMode(started);
    } else {
      console.log('🛑 Stopping test detection...');
      stopMalpracticeMonitoring();
      setTestMode(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <h3>You ({userRole})</h3>
        {/* ✅ Debug button */}
        <button 
          onClick={testDetection}
          style={{ 
            padding: '5px 10px', 
            fontSize: '12px',
            backgroundColor: testMode ? '#ff4444' : '#44ff44',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {testMode ? 'Stop Detection' : 'Start Detection'}
        </button>
        {(monitoringActive || testMode) && (
          <span style={{ 
            backgroundColor: '#ff9800', 
            color: 'white', 
            padding: '2px 8px', 
            borderRadius: '12px', 
            fontSize: '10px' 
          }}>
            MONITORING
          </span>
        )}
      </div>
      
      {/* ✅ Video container for canvas overlay */}
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ 
            width: '400px', 
            height: '300px', 
            backgroundColor: '#333', 
            borderRadius: '8px',
            display: 'block'
          }}
        />
        {/* Canvas will be added here by face detection service */}
      </div>

      {videos.map((video) => (
        <div key={video.socketId}>
          <h3>
            Participant 
            {isInterviewer && <span style={{ color: '#f44336' }}> (Monitored)</span>}
          </h3>
          <video
            ref={(ref) => {
              if (ref && video.stream) {
                ref.srcObject = video.stream;
              }
            }}
            autoPlay
            playsInline
            style={{ width: '400px', height: '300px', backgroundColor: '#333', borderRadius: '8px' }}
          />
        </div>
      ))}

      {videos.length === 0 && (
        <div style={{ backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          <p style={{ color: '#666', margin: 0 }}>
            Waiting for {isInterviewer ? 'interviewee' : 'interviewer'}...
          </p>
        </div>
      )}
    </div>
  );
};

export default InterviewVideoGrid;