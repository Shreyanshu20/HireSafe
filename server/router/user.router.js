import { Router } from 'express';
import { userAuth } from '../middleware/userAuth.js';
import { getUserProfile, changePassword, deleteAccount, logActivity, getActivities } from '../controller/user.controller.js';

const router = Router();

router.use(userAuth);

//get user profile
router.get('/profile', getUserProfile);

//change password
router.post('/change-password', changePassword)

//delete account
router.delete('/delete-account', deleteAccount)

//log activities
router.post('/log-activity', logActivity);

//get activities
router.get('/activities', getActivities);

export default router;

