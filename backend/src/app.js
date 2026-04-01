const express = require('express');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(express.json()); // Enable JSON body parsing

// Base API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
