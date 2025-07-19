import { Router } from "express";
import { register, login, logout } from "../controller/auth.controller.js";

const router = Router();

//login
router.post('/login', login);

//logout
router.get('/logout', logout);

//register
router.post('/register', register);


export default router;