import React, { useState, useEffect } from 'react';
import ActivityService from '../../services/activityService';

const ActivityLog = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [currentPage, filterType]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      const response = await ActivityService.getActivities(
        currentPage, 
        15, 
        filterType || null, 
        false
      );

      if (response.success) {
        setActivities(response.data.activities);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'LOGIN': return '🔐';
      case 'MEETING': return '📹';
      case 'INTERVIEW': return '💼';
      case 'PROFILE_UPDATE': return '👤';
      default: return '📝';
    }
  };

  const getActivityTitle = (activity) => {
    switch (activity.activity_type) {
      case 'LOGIN':
        return 'Login Session';
      case 'MEETING':
        return 'Meeting Session';
      case 'INTERVIEW':
        return 'Interview Session';
      case 'PROFILE_UPDATE':
        return 'Profile Updated';
      default:
        return activity.activity_type;
    }
  };

  const getActivityDetails = (activity) => {
    const details = [];
    
    if (activity.metadata?.meeting_code) {
      details.push(`Code: ${activity.metadata.meeting_code}`);
    }
    
    if (activity.metadata?.user_role) {
      details.push(`Role: ${activity.metadata.user_role}`);
    }
    
    if (activity.metadata?.malpractice_detected) {
      details.push(`⚠️ ${activity.metadata.malpractice_count || 0} violations`);
    }
    
    return details.join(' • ');
  };

  if (loading && activities.length === 0) {
    return (
      <div className="p-4 border rounded">
        <div className="text-center">Loading activities...</div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Activity Log</h3>
        
        <div className="flex items-center space-x-2">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All Activities</option>
            <option value="LOGIN">Login Sessions</option>
            <option value="MEETING">Meetings</option>
            <option value="INTERVIEW">Interviews</option>
            <option value="PROFILE_UPDATE">Profile Updates</option>
          </select>
          
          <button
            onClick={fetchActivities}
            disabled={loading}
            className="px-3 py-1 rounded text-sm border disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No activities found</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity._id} className="border rounded p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getActivityIcon(activity.activity_type)}</span>
                    <span className="font-medium text-sm">
                      {getActivityTitle(activity)}
                    </span>
                  </div>
                  
                  <div className="text-gray-600 text-sm mb-1">
                    {activity.description}
                  </div>
                  
                  {getActivityDetails(activity) && (
                    <div className="text-xs text-gray-500">
                      {getActivityDetails(activity)}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 text-right">
                  <div>{formatTimestamp(activity.start_time)}</div>
                  {activity.end_time && (
                    <div className="text-xs">
                      to {formatTimestamp(activity.end_time)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;