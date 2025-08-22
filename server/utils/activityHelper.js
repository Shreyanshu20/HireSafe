import ActivityService from '../service/activityService.js';

export const logActivity = async (req, activityType, description, additionalMetadata = {}) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) return null;

        const metadata = {
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent'),
            device_type: getDeviceType(req.get('User-Agent')),
            ...additionalMetadata
        };

        return await ActivityService.logActivity(userId, activityType, description, metadata);
    } catch (error) {
        console.error('Failed to log activity:', error);
        return null;
    }
};

export const startSession = async (req, activityType, description, additionalMetadata = {}) => {
    try {
        const userId = req.userId || req.user?.id;
        if (!userId) return null;

        const metadata = {
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent'),
            device_type: getDeviceType(req.get('User-Agent')),
            ...additionalMetadata
        };

        return await ActivityService.startSession(userId, activityType, description, metadata);
    } catch (error) {
        console.error('Failed to start session:', error);
        return null;
    }
};

export const endSession = async (sessionId, additionalMetadata = {}) => {
    try {
        return await ActivityService.endSession(sessionId, additionalMetadata);
    } catch (error) {
        console.error('Failed to end session:', error);
        return null;
    }
};

const getDeviceType = (userAgent) => {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        return 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        return 'tablet';
    } else {
        return 'desktop';
    }
};

export const ACTIVITY_TYPES = {
    LOGIN: 'LOGIN',
    MEETING: 'MEETING',
    INTERVIEW: 'INTERVIEW',
    PROFILE_UPDATE: 'PROFILE_UPDATE'
};