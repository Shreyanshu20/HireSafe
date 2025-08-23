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
    PROFILE_UPDATE: 'PROFILE_UPDATE',
    MALPRACTICE_DETECTION: 'MALPRACTICE_DETECTION'
};

export const validateActivityType = (type) => {
    return Object.values(ACTIVITY_TYPES).includes(type);
};

export const createMalpracticeActivity = (userId, sessionId, type, confidence, metadata = {}) => {
    return {
        user_id: userId,
        session_id: sessionId,
        activity_type: ACTIVITY_TYPES.MALPRACTICE_DETECTION,
        description: `Malpractice detected: ${type}`,
        metadata: {
            malpractice_type: type,
            confidence_score: confidence,
            detection_time: new Date().toISOString(),
            severity: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
            ...metadata
        }
    };
};

export const createInterviewMalpracticeActivity = (userId, sessionId, type, confidence, metadata = {}) => {
    return {
        user_id: userId,
        session_id: sessionId,
        activity_type: ACTIVITY_TYPES.MALPRACTICE_DETECTION,
        description: `Interview malpractice detected: ${type}`,
        metadata: {
            malpractice_type: type,
            confidence_score: confidence,
            detection_time: new Date().toISOString(),
            severity: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
            interview_context: true,
            ...metadata
        }
    };
};

export default {
    ACTIVITY_TYPES,
    validateActivityType,
    createMalpracticeActivity
};