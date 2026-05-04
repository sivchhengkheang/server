import express from 'express';
import { signUp, signIn, signOut, googleAuth, googleAuthCallback, telegramAuthCallback } from '../controllers/authController.js';

const router = express.Router();

// Registration Route
router.post('/sign-up', signUp);

// Login Route
router.post('/sign-in', signIn);

// Sign-out Route
router.post('/sign-out', signOut);

// Google OAuth Routes
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

// Telegram OAuth Route
router.get('/telegram/callback', telegramAuthCallback);

export default router;
