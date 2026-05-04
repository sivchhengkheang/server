import Students from '../models/student-schema.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    proxy: true
  },
  async function(accessToken, refreshToken, profile, cb) {
      try {
          // Find or create student
          let student = await Students.findOne({ email: profile.emails[0].value });
          if (!student) {
              // Generate a random password since OAuth users don't need one, but schema requires it
              const randomPassword = Math.random().toString(36).slice(-10) + 'OAuth!';
              
              student = new Students({
                  firstName: (profile.name && profile.name.givenName) || profile.displayName || 'Google',
                  lastName: (profile.name && profile.name.familyName) || 'User',
                  email: profile.emails[0].value,
                  password: await bcryptjs.hash(randomPassword, 10),
                  role: 'user'
              });
              await student.save();
          }
          return cb(null, student);
      } catch(err) {
          return cb(err, null);
      }
  }
));

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
export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'], session: false });

export const googleAuthCallback = (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, student, info) => {
        if (err || !student) {
            return res.status(401).json({ message: 'Authentication failed' });
        }
        
        // Generate JWT
        const token = jwt.sign(
            { id: student._id, role: student.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        // Return token to the client. Alternatively, you could redirect to the frontend:
        const userObj = {
            id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            role: student.role
        };
        const userStr = encodeURIComponent(JSON.stringify(userObj));
        res.redirect(`https://portfolio-puce-chi-d0nzsuka1i.vercel.app?token=${token}&user=${userStr}`);
    })(req, res, next);
};

export const telegramAuthCallback = async (req, res) => {
    try {
        const data = req.query;
        const botToken = process.env.TELEGRAM_API_TOKEN;

        if (!botToken) {
            return res.status(500).json({ message: 'Telegram bot token not configured' });
        }

        const { hash, ...userData } = data;
        
        // Verify Telegram Auth
        const dataCheckArr = [];
        for (const key in userData) {
            if (userData[key] !== undefined && userData[key] !== null) {
                dataCheckArr.push(`${key}=${userData[key]}`);
            }
        }
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');
        
        const secretKey = crypto.createHash('sha256').update(botToken).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hash) {
            return res.status(401).json({ message: 'Telegram authentication failed' });
        }

        const now = Math.floor(Date.now() / 1000);
        const authDate = parseInt(userData.auth_date, 10);
        if (now - authDate > 86400) {
            return res.status(401).json({ message: 'Telegram auth data is outdated' });
        }

        let student = await Students.findOne({ email: `${userData.id}@telegram.user` });
        
        if (!student) {
            const randomPassword = Math.random().toString(36).slice(-10) + 'Telegram!';
            student = new Students({
                firstName: userData.first_name || userData.username || 'Telegram',
                lastName: userData.last_name || 'User',
                email: `${userData.id}@telegram.user`,
                password: await bcryptjs.hash(randomPassword, 10),
                role: 'user'
            });
            await student.save();
        }

        const token = jwt.sign(
            { id: student._id, role: student.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const userObj = {
            id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            role: student.role
        };
        const userStr = encodeURIComponent(JSON.stringify(userObj));
        res.redirect(`https://portfolio-puce-chi-d0nzsuka1i.vercel.app?token=${token}&user=${userStr}`);

    } catch (err) {
        console.error('Telegram auth error:', err);
        res.status(500).json({ message: 'Something went wrong during Telegram authentication' });
    }
};

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



