require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// CORS Configuration
// const corsOptions = {
//   origin: ['http://localhost:3000', 'https://medremapp.onrender.com'], // Remove trailing slash
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true
// };

// Middleware
// app.use(cors({
//   origin: (origin, callback) => {
//     callback(null, origin || '*');
//   },
//   credentials: true,
// })); // Use the configured CORS options

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://uhealth-reminder.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const medicationRoutes = require('./routes/medications');
const reminderRoutes = require('./routes/reminders');

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Medication Reminder API',
    status: 'operational',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      medications: '/api/medications',
      reminders: '/api/reminders'
    },
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/reminders', reminderRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/medications'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));