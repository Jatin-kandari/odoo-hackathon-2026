const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize database
require('./database/db');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
    res.json({ 
        message: 'TransitOps API is running',
        version: '1.0.0',
        status: 'active'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Import routes (we'll add these later)
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/vehicles', require('./routes/vehicleRoutes'));
// app.use('/api/drivers', require('./routes/driverRoutes'));
// app.use('/api/trips', require('./routes/tripRoutes'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong' });
});

// Start server
app.listen(PORT, () => {
    console.log(`TransitOps server running on http://localhost:${PORT}`);
});
