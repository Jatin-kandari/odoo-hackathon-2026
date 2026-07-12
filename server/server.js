const express = require('express');
const cors = require('cors');
require('dotenv').config();

require('./database/db');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'TransitOps API is running',
        version: '1.0.0'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.use('/api/maintenance', require('./routes/maintenanceRoutes'));

app.listen(PORT, () => {
    console.log('====================================');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('====================================');
});

// Keep process alive
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server');
});
