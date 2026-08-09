import express from 'express';
import { register, login, adminLogin, getMe } from '../controllers/authController.js';
import { verifyAnyAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.get('/me', verifyAnyAuth, getMe);

export default router;
