import React, { useState, useEffect } from 'react';
import InterviewService from '../../services/interviewService'; // ✅ Use InterviewService

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
      message: eventData.message,
      confidence: eventData.confidence || 0.8
    };

    setEvents(prev => [newEvent, ...prev].slice(0, 20));

    // ✅ Use InterviewService to log malpractice
    try {
      await InterviewService.logMalpracticeDetection(
        meetingCode,
        eventData.type,
        eventData.confidence || 0.8,
        { 
          message: eventData.message,
          timestamp: eventData.timestamp,
          detected_by: 'interviewer_panel'
        }
      );
    } catch (error) {
      console.error('Log error:', error);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'face_missing': return '👻';
      case 'eyes_closed': return '😴';
      case 'looking_away': return '👀';
      case 'multiple_faces': return '👥';
      case 'suspicious_movement': return '⚠️';
      default: return '🚨';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'face_missing': return 'text-red-600 bg-red-50 border-red-200';
      case 'eyes_closed': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'looking_away': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'multiple_faces': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'suspicious_movement': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isInterviewer) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Monitoring Panel</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            events.length === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {events.length === 0 ? 'All Clear' : `${events.length} Issues`}
          </span>
          <button 
            onClick={() => setEvents([])}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm font-medium">No violations detected</p>
            <p className="text-xs text-gray-400 mt-1">Monitoring is active</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div 
                key={event.id} 
                className={`p-3 border rounded-lg ${getEventColor(event.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getEventIcon(event.type)}</span>
                    <div>
                      <div className="font-semibold text-sm capitalize">
                        {event.type.replace('_', ' ')}
                      </div>
                      <div className="text-xs opacity-75">
                        Confidence: {Math.round(event.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-xs opacity-75">
                    {event.timestamp}
                  </div>
                </div>
                <div className="text-sm mt-2 opacity-90">
                  {event.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MalpracticePanel;