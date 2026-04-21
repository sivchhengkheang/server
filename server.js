import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routers/auth-router.js';
import userRouter from './routers/user-router.js';
import connectDB from './database/mongodb.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.use('/api/auth', authRouter);
app.use('/api/students', userRouter);

// Port Configuration
const PORT = process.env.PORT || 5000;

// Connect to Database and Start Server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // Even if DB fails, we still start the server as per previous behavior
    app.listen(PORT, () => {
      console.log(`Server is running on port http://localhost:${PORT} (Database connection failed)`);
    });
  });
