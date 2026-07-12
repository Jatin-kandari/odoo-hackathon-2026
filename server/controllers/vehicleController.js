const db = require('../database/db');

// Get all vehicles
exports.getAllVehicles = (req, res) => {
    try {
        const vehicles = db.prepare(`
            SELECT * FROM vehicles 
            ORDER BY created_at DESC
        `).all();
        
        res.json({ success: true, count: vehicles.length, data: vehicles });
    } catch (error) {
        console.error('Get vehicles error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch vehicles' });
    }
};

// Get available vehicles only (for trip creation)
exports.getAvailableVehicles = (req, res) => {
    try {
        const vehicles = db.prepare(`
            SELECT * FROM vehicles 
            WHERE status = 'available'
            ORDER BY name
        `).all();
        
        res.json({ success: true, count: vehicles.length, data: vehicles });
    } catch (error) {
        console.error('Get available vehicles error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch available vehicles' });
    }
};

// Get single vehicle by ID
exports.getVehicleById = (req, res) => {
    try {
        const { id } = req.params;
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
        
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }
        
        res.json({ success: true, data: vehicle });
    } catch (error) {
        console.error('Get vehicle error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch vehicle' });
    }
};

// Create new vehicle
exports.createVehicle = (req, res) => {
    try {
        const { 
            registration_number, 
            name, 
            type, 
            max_load_capacity, 
            current_odometer, 
            acquisition_cost,
            status 
        } = req.body;
        
        // Validation
        if (!registration_number || !name || !type || !max_load_capacity || !acquisition_cost) {
            return res.status(400).json({ 
                success: false, 
                error: 'Registration number, name, type, capacity, and cost are required' 
            });
        }
        
        // Check unique registration number
        const existing = db.prepare('SELECT id FROM vehicles WHERE registration_number = ?').get(registration_number);
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                error: 'Registration number already exists. Must be unique.' 
            });
        }
        
        // Valid types
        const validTypes = ['truck', 'van', 'car', 'mini', 'bike'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid type. Must be: truck, van, car, mini, or bike' 
            });
        }
        
        // Valid statuses
        const validStatuses = ['available', 'in_shop', 'retired'];
        const vehicleStatus = status || 'available';
        if (!validStatuses.includes(vehicleStatus)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid status' 
            });
        }
        
        // Insert vehicle
        const result = db.prepare(`
            INSERT INTO vehicles 
            (registration_number, name, type, max_load_capacity, current_odometer, acquisition_cost, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            registration_number.toUpperCase(),
            name,
            type,
            max_load_capacity,
            current_odometer || 0,
            acquisition_cost,
            vehicleStatus
        );
        
        const newVehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
        
        res.status(201).json({
            success: true,
            message: 'Vehicle registered successfully',
            data: newVehicle
        });
    } catch (error) {
        console.error('Create vehicle error:', error);
        res.status(500).json({ success: false, error: 'Failed to create vehicle' });
    }
};

// Update vehicle
exports.updateVehicle = (req, res) => {
    try {
        const { id } = req.params;
        const { 
            registration_number, 
            name, 
            type, 
            max_load_capacity, 
            current_odometer, 
            acquisition_cost,
            status 
        } = req.body;
        
        // Check vehicle exists
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }
        
        // Business rule: Cannot change status of vehicle on trip
        if (vehicle.status === 'on_trip' && status && status !== 'on_trip') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot change status of vehicle currently on trip' 
            });
        }
        
        // If updating registration number, check uniqueness
        if (registration_number && registration_number !== vehicle.registration_number) {
            const existing = db.prepare('SELECT id FROM vehicles WHERE registration_number = ? AND id != ?')
                .get(registration_number, id);
            if (existing) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Registration number already exists' 
                });
            }
        }
        
        // Update vehicle
        db.prepare(`
            UPDATE vehicles 
            SET registration_number = ?, name = ?, type = ?, max_load_capacity = ?, 
                current_odometer = ?, acquisition_cost = ?, status = ?
            WHERE id = ?
        `).run(
            (registration_number || vehicle.registration_number).toUpperCase(),
            name || vehicle.name,
            type || vehicle.type,
            max_load_capacity || vehicle.max_load_capacity,
            current_odometer !== undefined ? current_odometer : vehicle.current_odometer,
            acquisition_cost || vehicle.acquisition_cost,
            status || vehicle.status,
            id
        );
        
        const updated = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
        
        res.json({
            success: true,
            message: 'Vehicle updated successfully',
            data: updated
        });
    } catch (error) {
        console.error('Update vehicle error:', error);
        res.status(500).json({ success: false, error: 'Failed to update vehicle' });
    }
};

// Delete vehicle
exports.deleteVehicle = (req, res) => {
    try {
        const { id } = req.params;
        
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }
        
        // Business rule: Cannot delete vehicle on trip
        if (vehicle.status === 'on_trip') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete vehicle currently on trip' 
            });
        }
        
        // Check if vehicle has related records
        const trips = db.prepare('SELECT COUNT(*) as count FROM trips WHERE vehicle_id = ?').get(id).count;
        if (trips > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot delete vehicle with ${trips} trip records. Retire it instead.` 
            });
        }
        
        db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Vehicle deleted successfully' });
    } catch (error) {
        console.error('Delete vehicle error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete vehicle' });
    }
};