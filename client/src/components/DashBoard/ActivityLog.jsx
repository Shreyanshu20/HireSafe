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
      case 'LOGIN':
        return 'fa-solid fa-key';
      case 'MEETING':
        return 'fa-solid fa-video';
      case 'INTERVIEW':
        return 'fa-solid fa-briefcase';
      case 'PROFILE_UPDATE':
        return 'fa-solid fa-user-pen';
      default:
        return 'fa-solid fa-note-sticky';
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
      details.push(`${activity.metadata.malpractice_count || 0} violations`);
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
    <div className="p-6 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <i className="fa-solid fa-clock-rotate-left text-cyan-400 text-2xl"></i>
          Activity Log
        </h3>
        
        <div className="flex items-center gap-3">
          {/* Filter Dropdown */}
          <div className="relative">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-gray-700/50
                          hover:border-cyan-500/30 transition-all duration-300">
              <i className="fa-solid fa-filter text-cyan-400"></i>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-gray-300 text-sm focus:outline-none cursor-pointer"
              >
                <option value="">All Activities</option>
                <option value="LOGIN">Login Sessions</option>
                <option value="MEETING">Meetings</option>
                <option value="INTERVIEW">Interviews</option>
                <option value="PROFILE_UPDATE">Profile Updates</option>
              </select>
            </div>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={fetchActivities}
            disabled={loading}
            className="p-2 rounded-lg bg-black/20 border border-gray-700/50 text-cyan-400
                     hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all duration-300 
                     disabled:opacity-50 flex items-center gap-2"
          >
            <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
            <span className="text-sm">{loading ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-4 max-h-[calc(100vh-24rem)] overflow-y-auto custom-scrollbar pr-2">
        {activities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <i className="fa-solid fa-inbox text-4xl mb-3"></i>
            <p>No activities found</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity._id} 
                 className="p-5 rounded-xl bg-black/20 border border-gray-700/50
                          hover:border-cyan-500/30 hover:bg-cyan-500/5
                          transition-all duration-300 group">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg 
                                bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors duration-300">
                      <i className={`${getActivityIcon(activity.activity_type)} text-cyan-400 
                                  group-hover:scale-110 transition-transform duration-300`}></i>
                    </div>
                    <span className="font-medium text-white">
                      {getActivityTitle(activity)}
                    </span>
                  </div>
                  
                  <div className="text-gray-400 text-sm mb-2 ml-12">
                    {activity.description}
                  </div>
                  
                  {getActivityDetails(activity) && (
                    <div className="text-sm text-gray-500 flex items-center gap-2 ml-12">
                      {activity.metadata?.malpractice_detected && (
                        <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                      )}
                      <span className="flex items-center gap-2">
                        {activity.metadata?.meeting_code && (
                          <i className="fa-solid fa-hashtag text-cyan-400/50"></i>
                        )}
                        {activity.metadata?.user_role && (
                          <i className="fa-solid fa-user-tag text-cyan-400/50"></i>
                        )}
                        {getActivityDetails(activity)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 text-right shrink-0">
                  <div className="flex items-center gap-2">
                    <i className="fa-regular fa-clock text-cyan-400/70"></i>
                    {formatTimestamp(activity.start_time)}
                  </div>
                  {activity.end_time && (
                    <div className="flex items-center gap-2 mt-1.5 justify-end">
                      <i className="fa-solid fa-arrow-right text-[10px] text-cyan-400/50"></i>
                      {formatTimestamp(activity.end_time)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700/50">
          <div className="text-sm text-gray-400">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-4 py-2 rounded-lg bg-black/20 border border-gray-700/50 text-gray-300
                       hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all duration-300
                       disabled:opacity-50 disabled:hover:border-gray-700/50 disabled:hover:bg-black/20
                       flex items-center gap-2"
            >
              <i className="fa-solid fa-chevron-left"></i>
              <span className="text-sm">Previous</span>
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 rounded-lg bg-black/20 border border-gray-700/50 text-gray-300
                       hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all duration-300
                       disabled:opacity-50 disabled:hover:border-gray-700/50 disabled:hover:bg-black/20
                       flex items-center gap-2"
            >
              <span className="text-sm">Next</span>
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;