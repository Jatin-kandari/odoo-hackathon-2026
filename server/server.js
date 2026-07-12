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
app.use('/api/fuel-logs', require('./routes/fuelRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.listen(PORT, () => {
    console.log('====================================');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('====================================');
});

// Keep process alive
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server');
});
