const db = require('../database/db');

// Helper: Check if license is expired
function isLicenseExpired(expiryDate) {
    return new Date(expiryDate) < new Date();
}

// Get all drivers
exports.getAllDrivers = (req, res) => {
    try {
        const drivers = db.prepare(`
            SELECT * FROM drivers 
            ORDER BY created_at DESC
        `).all();
        
        // Add license_expired flag to each driver
        const driversWithFlags = drivers.map(d => ({
            ...d,
            license_expired: isLicenseExpired(d.license_expiry_date)
        }));
        
        res.json({ 
            success: true, 
            count: driversWithFlags.length, 
            data: driversWithFlags 
        });
    } catch (error) {
        console.error('Get drivers error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
    }
};

// Get available drivers (for trip assignment)
exports.getAvailableDrivers = (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const drivers = db.prepare(`
            SELECT * FROM drivers 
            WHERE status = 'available' 
            AND license_expiry_date >= ?
            ORDER BY name
        `).all(today);
        
        res.json({ 
            success: true, 
            count: drivers.length, 
            data: drivers 
        });
    } catch (error) {
        console.error('Get available drivers error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch available drivers' });
    }
};

// Get driver by ID
exports.getDriverById = (req, res) => {
    try {
        const { id } = req.params;
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id);
        
        if (!driver) {
            return res.status(404).json({ success: false, error: 'Driver not found' });
        }
        
        driver.license_expired = isLicenseExpired(driver.license_expiry_date);
        
        res.json({ success: true, data: driver });
    } catch (error) {
        console.error('Get driver error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch driver' });
    }
};

// Create new driver
exports.createDriver = (req, res) => {
    try {
        const {
            name,
            license_number,
            license_category,
            license_expiry_date,
            contact_number,
            safety_score,
            status
        } = req.body;
        
        // Validation
        if (!name || !license_number || !license_category || !license_expiry_date || !contact_number) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, license number, category, expiry date, and contact are required' 
            });
        }
        
        // Check unique license number
        const existing = db.prepare('SELECT id FROM drivers WHERE license_number = ?').get(license_number);
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                error: 'License number already exists' 
            });
        }
        
        // Validate status
        const validStatuses = ['available', 'off_duty', 'suspended'];
        const driverStatus = status || 'available';
        if (!validStatuses.includes(driverStatus)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid status' 
            });
        }
        
        // Validate safety score
        const score = safety_score !== undefined ? parseInt(safety_score) : 100;
        if (score < 0 || score > 100) {
            return res.status(400).json({ 
                success: false, 
                error: 'Safety score must be between 0 and 100' 
            });
        }
        
        // Insert driver
        const result = db.prepare(`
            INSERT INTO drivers 
            (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            name,
            license_number.toUpperCase(),
            license_category.toUpperCase(),
            license_expiry_date,
            contact_number,
            score,
            driverStatus
        );
        
        const newDriver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(result.lastInsertRowid);
        newDriver.license_expired = isLicenseExpired(newDriver.license_expiry_date);
        
        res.status(201).json({
            success: true,
            message: 'Driver added successfully',
            data: newDriver
        });
    } catch (error) {
        console.error('Create driver error:', error);
        res.status(500).json({ success: false, error: 'Failed to create driver' });
    }
};

// Update driver
exports.updateDriver = (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            license_number,
            license_category,
            license_expiry_date,
            contact_number,
            safety_score,
            status
        } = req.body;
        
        // Check driver exists
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id);
        if (!driver) {
            return res.status(404).json({ success: false, error: 'Driver not found' });
        }
        
        // Cannot change status of driver on trip
        if (driver.status === 'on_trip' && status && status !== 'on_trip') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot change status of driver currently on trip' 
            });
        }
        
        // Check unique license if changing
        if (license_number && license_number !== driver.license_number) {
            const existing = db.prepare('SELECT id FROM drivers WHERE license_number = ? AND id != ?')
                .get(license_number, id);
            if (existing) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'License number already exists' 
                });
            }
        }
        
        // Validate safety score
        const score = safety_score !== undefined ? parseInt(safety_score) : driver.safety_score;
        if (score < 0 || score > 100) {
            return res.status(400).json({ 
                success: false, 
                error: 'Safety score must be between 0 and 100' 
            });
        }
        
        // Update driver
        db.prepare(`
            UPDATE drivers 
            SET name = ?, license_number = ?, license_category = ?, license_expiry_date = ?,
                contact_number = ?, safety_score = ?, status = ?
            WHERE id = ?
        `).run(
            name || driver.name,
            (license_number || driver.license_number).toUpperCase(),
            (license_category || driver.license_category).toUpperCase(),
            license_expiry_date || driver.license_expiry_date,
            contact_number || driver.contact_number,
            score,
            status || driver.status,
            id
        );
        
        const updated = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id);
        updated.license_expired = isLicenseExpired(updated.license_expiry_date);
        
        res.json({
            success: true,
            message: 'Driver updated successfully',
            data: updated
        });
    } catch (error) {
        console.error('Update driver error:', error);
        res.status(500).json({ success: false, error: 'Failed to update driver' });
    }
};

// Delete driver
exports.deleteDriver = (req, res) => {
    try {
        const { id } = req.params;
        
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id);
        if (!driver) {
            return res.status(404).json({ success: false, error: 'Driver not found' });
        }
        
        if (driver.status === 'on_trip') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete driver currently on trip' 
            });
        }
        
        // Check if driver has trip history
        const trips = db.prepare('SELECT COUNT(*) as count FROM trips WHERE driver_id = ?').get(id).count;
        if (trips > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot delete driver with ${trips} trip records. Set to off duty instead.` 
            });
        }
        
        db.prepare('DELETE FROM drivers WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Driver deleted successfully' });
    } catch (error) {
        console.error('Delete driver error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete driver' });
    }
};

// Toggle driver status (quick action)
exports.toggleStatus = (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id);
        if (!driver) {
            return res.status(404).json({ success: false, error: 'Driver not found' });
        }
        
        if (driver.status === 'on_trip') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot change status of driver on trip' 
            });
        }
        
        const validStatuses = ['available', 'off_duty', 'suspended'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid status' 
            });
        }
        
        db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run(status, id);
        
        const updated = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id);
        
        res.json({
            success: true,
            message: `Driver status changed to ${status.replace('_', ' ')}`,
            data: updated
        });
    } catch (error) {
        console.error('Toggle status error:', error);
        res.status(500).json({ success: false, error: 'Failed to change status' });
    }
};

