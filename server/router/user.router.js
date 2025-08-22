import { Router } from 'express';
import { getUserProfile, changePassword, deleteAccount, logUserActivity, getActivities } from '../controller/user.controller.js';
import { userAuth } from '../middleware/userAuth.js';

const router = Router();

// Get user profile
router.get('/profile', userAuth, getUserProfile);

// Change password
router.post('/change-password', userAuth, changePassword);

// Delete account
router.delete('/delete-account', userAuth, deleteAccount);

// Log activity
router.post('/log-activity', userAuth, logUserActivity);

// Get activities
router.get('/activities', userAuth, getActivities);

export default router;