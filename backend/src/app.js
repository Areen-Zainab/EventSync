const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { uploadsRoot } = require('./middleware/chatUploadMiddleware');

const app = express();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(express.json()); // Enable JSON body parsing
app.use('/uploads/chat', express.static(uploadsRoot));

// Base API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
