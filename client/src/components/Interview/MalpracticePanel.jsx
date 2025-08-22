import React, { useState, useEffect } from 'react';
import ActivityService from '../../services/activityService';

const MalpracticePanel = ({ 
  socketRef, 
  meetingCode, 
  isInterviewer 
}) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (socketRef.current && isInterviewer) {
      socketRef.current.on('malpractice-detected', handleEvent);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('malpractice-detected');
      }
    };
  }, [socketRef, isInterviewer]);

  const handleEvent = async (eventData) => {
    const newEvent = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type: eventData.type,
      message: eventData.message
    };

    setEvents(prev => [newEvent, ...prev].slice(0, 20));

    try {
      await ActivityService.logMalpracticeDetection(
        meetingCode,
        eventData.type,
        eventData.confidence || 0.8,
        { message: eventData.message }
      );
    } catch (error) {
      console.error('Log error:', error);
    }
  };

  if (!isInterviewer) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Monitoring Panel</h3>
        <button 
          onClick={() => setEvents([])}
          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
        >
          Clear
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto border border-gray-300 rounded p-2">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-sm">No issues detected</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="p-2 border-b border-gray-200">
                <div className="font-semibold text-sm">{event.type}</div>
                <div className="text-xs text-gray-600">{event.message}</div>
                <div className="text-xs text-gray-500">{event.timestamp}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MalpracticePanel;