const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

require('./database/db');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Serve frontend files
app.use(express.static(path.join(__dirname, '../client')));

// API health
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// API root
app.get('/api', (req, res) => {
    res.json({
        message: 'TransitOps API is running',
        version: '1.0.0'
    });
});

// Routes
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));

// Send frontend index.html for browser requests
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
    console.log('====================================');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('====================================');
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server');
});