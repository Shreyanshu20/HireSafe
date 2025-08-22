import React from 'react';

const InterviewVideoGrid = ({ 
  localVideoRef, 
  videos, 
  userRole, 
  isInterviewer
}) => {
  return (
    <div>
      <h3>You ({userRole})</h3>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="w-[300px] h-[200px] bg-gray-800 rounded mb-4"
      />

      {videos.map((video) => (
        <div key={video.socketId}>
          <h3>
            Participant 
            {isInterviewer && <span className="text-red-500"> (Monitored)</span>}
          </h3>
          <video
            ref={(ref) => {
              if (ref && video.stream) {
                ref.srcObject = video.stream;
              }
            }}
            autoPlay
            playsInline
            className="w-[300px] h-[200px] bg-gray-800 rounded"
          />
        </div>
      ))}

      {videos.length === 0 && (
        <div className="bg-gray-100 rounded p-4 text-center">
          <p className="text-gray-500">
            Waiting for {isInterviewer ? 'interviewee' : 'interviewer'}...
          </p>
        </div>
      )}
    </div>
  );
};

export default InterviewVideoGrid;