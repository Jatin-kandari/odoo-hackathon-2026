const db = require('../database/db');

// Get all maintenance records
exports.getAllMaintenance = (req, res) => {
    try {
        const maintenance = db.prepare(`
            SELECT 
                m.*,
                v.registration_number,
                v.name as vehicle_name
            FROM maintenance m
            LEFT JOIN vehicles v ON m.vehicle_id = v.id
            ORDER BY m.created_at DESC
        `).all();
        
        res.json({
            success: true,
            count: maintenance.length,
            data: maintenance
        });
    } catch (error) {
        console.error('Get maintenance error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch maintenance records' 
        });
    }
};

// Get maintenance by vehicle ID
exports.getMaintenanceByVehicle = (req, res) => {
    try {
        const { vehicleId } = req.params;
        
        const maintenance = db.prepare(`
            SELECT 
                m.*,
                v.registration_number,
                v.name as vehicle_name
            FROM maintenance m
            LEFT JOIN vehicles v ON m.vehicle_id = v.id
            WHERE m.vehicle_id = ?
            ORDER BY m.created_at DESC
        `).all(vehicleId);
        
        res.json({
            success: true,
            count: maintenance.length,
            data: maintenance
        });
    } catch (error) {
        console.error('Get maintenance error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch vehicle maintenance' 
        });
    }
};

// Get single maintenance record
exports.getMaintenanceById = (req, res) => {
    try {
        const { id } = req.params;
        
        const maintenance = db.prepare(`
            SELECT 
                m.*,
                v.registration_number,
                v.name as vehicle_name
            FROM maintenance m
            LEFT JOIN vehicles v ON m.vehicle_id = v.id
            WHERE m.id = ?
        `).get(id);
        
        if (!maintenance) {
            return res.status(404).json({ 
                success: false, 
                error: 'Maintenance record not found' 
            });
        }
        
        res.json({
            success: true,
            data: maintenance
        });
    } catch (error) {
        console.error('Get maintenance error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch maintenance' 
        });
    }
};

// Create new maintenance record
exports.createMaintenance = (req, res) => {
    try {
        const { 
            vehicle_id, 
            service_type, 
            description, 
            cost, 
            start_date 
        } = req.body;
        
        // Validation
        if (!vehicle_id || !service_type || !cost || !start_date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vehicle, service type, cost, and start date are required' 
            });
        }
        
        // Check if vehicle exists
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
        
        if (!vehicle) {
            return res.status(404).json({ 
                success: false, 
                error: 'Vehicle not found' 
            });
        }
        
        // Business Rule: Cannot maintain vehicle on trip
        if (vehicle.status === 'on_trip') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot start maintenance on a vehicle currently on trip' 
            });
        }
        
        // Business Rule: Cannot maintain retired vehicle
        if (vehicle.status === 'retired') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot maintain a retired vehicle' 
            });
        }
        
        // Create maintenance record
        const result = db.prepare(`
            INSERT INTO maintenance 
            (vehicle_id, service_type, description, cost, start_date, status) 
            VALUES (?, ?, ?, ?, ?, 'active')
        `).run(vehicle_id, service_type, description || '', cost, start_date);
        
        // Business Rule: Update vehicle status to 'in_shop'
        db.prepare('UPDATE vehicles SET status = ? WHERE id = ?')
          .run('in_shop', vehicle_id);
        
        // Get the created record
        const newMaintenance = db.prepare(`
            SELECT 
                m.*,
                v.registration_number,
                v.name as vehicle_name
            FROM maintenance m
            LEFT JOIN vehicles v ON m.vehicle_id = v.id
            WHERE m.id = ?
        `).get(result.lastInsertRowid);
        
        res.status(201).json({
            success: true,
            message: 'Maintenance record created. Vehicle status updated to In Shop.',
            data: newMaintenance
        });
    } catch (error) {
        console.error('Create maintenance error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create maintenance record' 
        });
    }
};

// Close maintenance (mark as completed)
exports.closeMaintenance = (req, res) => {
    try {
        const { id } = req.params;
        
        // Get maintenance record
        const maintenance = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(id);
        
        if (!maintenance) {
            return res.status(404).json({ 
                success: false, 
                error: 'Maintenance record not found' 
            });
        }
        
        if (maintenance.status === 'completed') {
            return res.status(400).json({ 
                success: false, 
                error: 'Maintenance already completed' 
            });
        }
        
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        // Update maintenance record
        db.prepare(`
            UPDATE maintenance 
            SET status = 'completed', end_date = ? 
            WHERE id = ?
        `).run(today, id);
        
        // Business Rule: Restore vehicle status to 'available'
        // But check if vehicle is retired first
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(maintenance.vehicle_id);
        
        if (vehicle && vehicle.status !== 'retired') {
            db.prepare('UPDATE vehicles SET status = ? WHERE id = ?')
              .run('available', maintenance.vehicle_id);
        }
        
        // Get updated record
        const updated = db.prepare(`
            SELECT 
                m.*,
                v.registration_number,
                v.name as vehicle_name
            FROM maintenance m
            LEFT JOIN vehicles v ON m.vehicle_id = v.id
            WHERE m.id = ?
        `).get(id);
        
        res.json({
            success: true,
            message: 'Maintenance closed. Vehicle status restored to Available.',
            data: updated
        });
    } catch (error) {
        console.error('Close maintenance error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to close maintenance' 
        });
    }
};

// Delete maintenance (only if completed)
exports.deleteMaintenance = (req, res) => {
    try {
        const { id } = req.params;
        
        const maintenance = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(id);
        
        if (!maintenance) {
            return res.status(404).json({ 
                success: false, 
                error: 'Maintenance record not found' 
            });
        }
        
        if (maintenance.status === 'active') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete active maintenance. Close it first.' 
            });
        }
        
        db.prepare('DELETE FROM maintenance WHERE id = ?').run(id);
        
        res.json({
            success: true,
            message: 'Maintenance record deleted'
        });
    } catch (error) {
        console.error('Delete maintenance error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete maintenance' 
        });
    }
};
