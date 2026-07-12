const db = require('../database/db');

// Get all fuel logs
exports.getAllFuelLogs = (req, res) => {
    try {
        const logs = db.prepare(`
            SELECT 
                f.*,
                v.registration_number,
                v.name as vehicle_name,
                t.trip_number
            FROM fuel_logs f
            LEFT JOIN vehicles v ON f.vehicle_id = v.id
            LEFT JOIN trips t ON f.trip_id = t.id
            ORDER BY f.date DESC, f.created_at DESC
        `).all();
        
        res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        console.error('Get fuel logs error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fuel logs' });
    }
};

// Get fuel logs by vehicle
exports.getFuelLogsByVehicle = (req, res) => {
    try {
        const { vehicleId } = req.params;
        
        const logs = db.prepare(`
            SELECT 
                f.*,
                v.registration_number,
                v.name as vehicle_name
            FROM fuel_logs f
            LEFT JOIN vehicles v ON f.vehicle_id = v.id
            WHERE f.vehicle_id = ?
            ORDER BY f.date DESC
        `).all(vehicleId);
        
        res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        console.error('Get fuel logs error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch vehicle fuel logs' });
    }
};

// Create fuel log
exports.createFuelLog = (req, res) => {
    try {
        const { vehicle_id, trip_id, liters, cost_per_liter, date } = req.body;
        
        // Validation
        if (!vehicle_id || !liters || !cost_per_liter || !date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vehicle, liters, cost per liter, and date are required' 
            });
        }
        
        if (liters <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Liters must be greater than 0' 
            });
        }
        
        if (cost_per_liter <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cost per liter must be greater than 0' 
            });
        }
        
        // Check if vehicle exists
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }
        
        // Calculate total cost
        const total_cost = liters * cost_per_liter;
        
        // Insert fuel log
        const result = db.prepare(`
            INSERT INTO fuel_logs (trip_id, vehicle_id, liters, cost_per_liter, total_cost, date)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(trip_id || null, vehicle_id, liters, cost_per_liter, total_cost, date);
        
        // Get the created log
        const newLog = db.prepare(`
            SELECT 
                f.*,
                v.registration_number,
                v.name as vehicle_name
            FROM fuel_logs f
            LEFT JOIN vehicles v ON f.vehicle_id = v.id
            WHERE f.id = ?
        `).get(result.lastInsertRowid);
        
        res.status(201).json({
            success: true,
            message: 'Fuel log created successfully',
            data: newLog
        });
    } catch (error) {
        console.error('Create fuel log error:', error);
        res.status(500).json({ success: false, error: 'Failed to create fuel log' });
    }
};

// Delete fuel log
exports.deleteFuelLog = (req, res) => {
    try {
        const { id } = req.params;
        
        const log = db.prepare('SELECT * FROM fuel_logs WHERE id = ?').get(id);
        if (!log) {
            return res.status(404).json({ success: false, error: 'Fuel log not found' });
        }
        
        db.prepare('DELETE FROM fuel_logs WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Fuel log deleted' });
    } catch (error) {
        console.error('Delete fuel log error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete fuel log' });
    }
};
