import { Router } from 'express';
import { login, logout, register } from '../controller/auth.controller.js';
import { userAuth } from '../middleware/userAuth.js';

const router = Router();

//login
router.post('/login', login);

//logout
router.get('/logout', userAuth, logout);

//register
router.post('/register', register);

export default router;