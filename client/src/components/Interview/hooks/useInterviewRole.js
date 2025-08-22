import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';

export const useInterviewRole = (meetingData) => {
  const { userData } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [isInterviewer, setIsInterviewer] = useState(false);
  const [isInterviewee, setIsInterviewee] = useState(false);

  useEffect(() => {
    if (meetingData && userData) {
      const role = meetingData.userRole || 'participant';
      setUserRole(role);
      setIsInterviewer(role === 'interviewer');
      setIsInterviewee(role === 'interviewee');
    }
  }, [meetingData, userData]);

  return {
    userRole,
    isInterviewer,
    isInterviewee,
    canViewMalpractice: isInterviewer,
    canEditCode: true, // Both can edit for now
    canRecord: isInterviewer
  };
};