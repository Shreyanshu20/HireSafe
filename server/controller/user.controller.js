import { User } from '../model/user.model.js';
import bcrypt from 'bcrypt';
import ActivityService from '../service/activityService.js';
import { logActivity, ACTIVITY_TYPES, validateActivityType } from '../utils/activityHelper.js';

const getUserProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);

    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

const changePassword = async (req, res) => {
    try {
        const userId = req.userId;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Old and new passwords are required" });
        }

        const user = await User.findById(userId);

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long" });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Old password is incorrect" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        // Log activity using simplified method
        await logActivity(req, ACTIVITY_TYPES.PROFILE_UPDATE, 'User changed password');

        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

const deleteAccount = async (req, res) => {
    try {
        const userId = req.userId;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ message: "Password is required to delete account" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Password is incorrect" });
        }

        // Log activity before deletion
        await logActivity(req, ACTIVITY_TYPES.PROFILE_UPDATE, 'User deleted account');

        await User.findByIdAndDelete(userId);

        res.clearCookie('userToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
        });

        return res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
        console.error("Error deleting account:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

const logUserActivity = async (req, res) => {
    try {
        const userId = req.userId;
        const { activity_type, description, metadata = {} } = req.body;

        console.log('📋 Logging activity:', { userId, activity_type, description, metadata });

        if (!activity_type || !description) {
            return res.status(400).json({
                success: false,
                message: "Activity type and description are required"
            });
        }

        if (!validateActivityType(activity_type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid activity type"
            });
        }

        let enhancedMetadata = { ...metadata };

        const activity = await ActivityService.logActivity(
            userId, 
            activity_type, 
            description, 
            enhancedMetadata
        );


        res.status(201).json({
            success: true,
            message: "Activity logged successfully",
            activity: {
                id: activity._id,
                activity_type: activity.activity_type,
                description: activity.description,
                start_time: activity.start_time
            }
        });

    } catch (error) {
        console.error("❌ Error logging activity:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

const getActivities = async (req, res) => {
    try {
        const userId = req.userId;

        const {
            page = 1,
            limit = 20,
            activity_type = null,
            stats = false
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        // Validate pagination parameters
        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters"
            });
        }

        const result = await ActivityService.getUserActivities(userId, pageNum, limitNum, activity_type);

        let activityStats = null;
        if (stats === 'true') {
            activityStats = await ActivityService.getActivityStats(userId);
        }

        const responseData = {
            success: true,
            message: "Activities retrieved successfully",
            data: {
                activities: result.activities,
                pagination: result.pagination,
                stats: activityStats
            }
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error fetching activities:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

export { getUserProfile, changePassword, deleteAccount, logUserActivity, getActivities };