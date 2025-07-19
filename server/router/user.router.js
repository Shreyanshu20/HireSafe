import { Router } from 'express';
import { userAuth } from '../middleware/userAuth.js';
import { getUserProfile, changePassword, deleteAccount, logActivity, getActivities } from '../controller/user.controller.js';

const router = Router();


//get user profile
router.get('/profile', userAuth, getUserProfile);

//change password
router.post('/change-password', userAuth, changePassword)

//delete account
router.delete('/delete-account', userAuth, deleteAccount)

//log activities
router.post('/log-activity', userAuth, logActivity);

//get activities
router.get('/activities', userAuth, getActivities);

export default router;

