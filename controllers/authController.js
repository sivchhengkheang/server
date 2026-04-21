import Students from '../models/student-schema.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// signUp: Create a new student
export const signUp = async (req, res) => {
    console.log('SignUp Request Received:', req.body);
    const { firstName, lastName, email, password, role } = req.body;

    try {
        // Check if student already exists
        console.log('Checking existence for email:', email);
        const existingStudent = await Students.findOne({ email });
        console.log('Existing Student matching email:', existingStudent ? 'FOUND' : 'NOT FOUND');
        if (existingStudent) {
            return res.status(400).json({ message: 'Student already exists with this email' });
        }

        // Hash password
        const hashedPassword = await bcryptjs.hash(password, 12);

        // Create student
        const newStudent = new Students({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: role || 'user'
        });

        await newStudent.save();

        // Generate JWT for auto-login
        const token = jwt.sign(
            { id: newStudent._id, role: newStudent.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'Student account created successfully',
            token,
            students: {
                id: newStudent._id,
                firstName: newStudent.firstName,
                lastName: newStudent.lastName,
                email: newStudent.email,
                role: newStudent.role
            }
        });
    } catch (err) {
        console.error('register error:', err);
        res.status(500).json({ message: 'Something went wrong during registration' });
    }
};

// signIn: Authenticate student and return token
export const signIn = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find student by email
        const student = await Students.findOne({ email });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check password
        const isPasswordCorrect = await bcryptjs.compare(password, student.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Update lastLogin and updatedAt
        student.lastLogin = new Date();
        await student.save();

        // Generate JWT
        const token = jwt.sign(
            { id: student._id, role: student.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Signed in successfully',
            token,
            students: {
                id: student._id,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
                role: student.role,
                updatedAt: student.updatedAt,
                lastLogin: student.lastLogin
            }
        });
    } catch (err) {
        console.error('login error:', err);
        res.status(500).json({ message: 'Something went wrong during sign-in' });
    }
};

// signOut: Placeholder for sign-out logic
export const signOut = (req, res) => {
    res.status(200).json({ message: 'Student signed out successfully' });
};

