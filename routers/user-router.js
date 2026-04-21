import express from 'express';
import { getStudents, getProfile, updateProfile } from '../controllers/userController.js';

const router = express.Router();

// Get all students
router.get("/", getStudents)

// Get Student Profile
router.get('/profile/:id', getProfile);

// Update Student Profile
router.put('/profile/:id', updateProfile);

export default router;

