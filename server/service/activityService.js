import Activity from '../model/activity.model.js';
import mongoose from 'mongoose';

class ActivityService {
    async logActivity(userId, activityType, description, metadata = {}) {
        try {
            const now = new Date();
            const activity = new Activity({
                user_id: userId,
                activity_type: activityType,
                description,
                start_time: now,
                end_time: now,
                duration_minutes: 0,
                metadata
            });

            await activity.save();
            return activity;
        } catch (error) {
            console.error('Error logging activity:', error);
            throw error;
        }
    }

    async startSession(userId, activityType, description, metadata = {}) {
        try {
            const activity = new Activity({
                user_id: userId,
                activity_type: activityType,
                description,
                start_time: new Date(),
                metadata
            });

            await activity.save();
            return activity;
        } catch (error) {
            console.error('Error starting session:', error);
            throw error;
        }
    }

    async endSession(sessionId, additionalMetadata = {}) {
        try {
            const activity = await Activity.findById(sessionId);
            if (!activity) {
                throw new Error('Session not found');
            }

            const endTime = new Date();
            const durationMs = endTime - activity.start_time;
            const durationMinutes = Math.round(durationMs / (1000 * 60));

            activity.end_time = endTime;
            activity.duration_minutes = durationMinutes;
            activity.metadata = { ...activity.metadata, ...additionalMetadata };

            await activity.save();
            return activity;
        } catch (error) {
            console.error('Error ending session:', error);
            throw error;
        }
    }

    async getUserActivities(userId, page = 1, limit = 20, activityType = null) {
        try {
            const skip = (page - 1) * limit;

            const query = { 
                user_id: new mongoose.Types.ObjectId(userId)
            };
            
            if (activityType) {
                query.activity_type = activityType;
            }

            const activities = await Activity
                .find(query)
                .sort({ start_time: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user_id', 'username email')
                .lean();

            const totalCount = await Activity.countDocuments(query);
            const totalPages = Math.ceil(totalCount / limit);

            return {
                activities,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            console.error('Error fetching user activities:', error);
            throw error;
        }
    }

    async getActivityStats(userId) {
        try {
            const stats = await Activity.aggregate([
                { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
                {
                    $group: {
                        _id: '$activity_type',
                        count: { $sum: 1 },
                        totalMinutes: { $sum: '$duration_minutes' },
                        lastActivity: { $max: '$start_time' }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            const totalActivities = await Activity.countDocuments({ 
                user_id: new mongoose.Types.ObjectId(userId)
            });

            return {
                totalActivities,
                activityBreakdown: stats
            };
        } catch (error) {
            console.error('Error fetching activity stats:', error);
            throw error;
        }
    }
}

export default new ActivityService();