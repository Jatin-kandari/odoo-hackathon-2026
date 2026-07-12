const db = require('../database/db');

// Helper: Generate trip number
function generateTripNumber() {
    const lastTrip = db.prepare('SELECT trip_number FROM trips ORDER BY id DESC LIMIT 1').get();
    
    if (!lastTrip) return 'TR001';
    
    // Extract number from last trip (TR001 -> 1)
    const lastNum = parseInt(lastTrip.trip_number.replace('TR', ''));
    const nextNum = lastNum + 1;
    return `TR${String(nextNum).padStart(3, '0')}`;
}

// Helper: Check if license is expired
function isLicenseExpired(expiryDate) {
    return new Date(expiryDate) < new Date();
}

// Get all trips
exports.getAllTrips = (req, res) => {
    try {
        const trips = db.prepare(`
            SELECT 
                t.*,
                v.registration_number,
                v.name as vehicle_name,
                v.max_load_capacity,
                d.name as driver_name,
                d.license_number,
                d.contact_number as driver_contact
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            ORDER BY t.created_at DESC
        `).all();
        
        res.json({ success: true, count: trips.length, data: trips });
    } catch (error) {
        console.error('Get trips error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch trips' });
    }
};

// Get trip by ID
exports.getTripById = (req, res) => {
    try {
        const { id } = req.params;
        const trip = db.prepare(`
            SELECT 
                t.*,
                v.registration_number,
                v.name as vehicle_name,
                v.max_load_capacity,
                d.name as driver_name,
                d.license_number
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            WHERE t.id = ?
        `).get(id);
        
        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }
        
        res.json({ success: true, data: trip });
    } catch (error) {
        console.error('Get trip error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch trip' });
    }
};

// Create new trip (Draft status)
exports.createTrip = (req, res) => {
    try {
        const {
            source,
            destination,
            vehicle_id,
            driver_id,
            cargo_weight,
            planned_distance
        } = req.body;
        
        // Basic validation
        if (!source || !destination || !cargo_weight || !planned_distance) {
            return res.status(400).json({ 
                success: false, 
                error: 'Source, destination, cargo weight, and distance are required' 
            });
        }
        
        if (cargo_weight <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cargo weight must be greater than 0' 
            });
        }
        
        if (planned_distance <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Planned distance must be greater than 0' 
            });
        }
        
        // Validate vehicle if provided
        if (vehicle_id) {
            const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
            
            if (!vehicle) {
                return res.status(404).json({ success: false, error: 'Vehicle not found' });
            }
            
            // Business Rule: Vehicle must be available
            if (vehicle.status !== 'available') {
                return res.status(400).json({ 
                    success: false, 
                    error: `Vehicle is currently ${vehicle.status.replace('_', ' ')}. Cannot assign.` 
                });
            }
            
            // Business Rule: Cargo weight must not exceed capacity
            if (cargo_weight > vehicle.max_load_capacity) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Cargo weight (${cargo_weight}kg) exceeds vehicle capacity (${vehicle.max_load_capacity}kg) by ${cargo_weight - vehicle.max_load_capacity}kg` 
                });
            }
        }
        
        // Validate driver if provided
        if (driver_id) {
            const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driver_id);
            
            if (!driver) {
                return res.status(404).json({ success: false, error: 'Driver not found' });
            }
            
            // Business Rule: Driver must be available
            if (driver.status !== 'available') {
                return res.status(400).json({ 
                    success: false, 
                    error: `Driver is currently ${driver.status.replace('_', ' ')}. Cannot assign.` 
                });
            }
            
            // Business Rule: License must not be expired
            if (isLicenseExpired(driver.license_expiry_date)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Driver license has expired. Cannot assign.' 
                });
            }
        }
        
        // Generate trip number
        const trip_number = generateTripNumber();
        
        // Create trip in draft status
        const result = db.prepare(`
            INSERT INTO trips 
            (trip_number, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
        `).run(
            trip_number,
            source,
            destination,
            vehicle_id || null,
            driver_id || null,
            cargo_weight,
            planned_distance
        );
        
        // Get the created trip with details
        const newTrip = db.prepare(`
            SELECT 
                t.*,
                v.registration_number,
                v.name as vehicle_name,
                d.name as driver_name
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            WHERE t.id = ?
        `).get(result.lastInsertRowid);
        
        res.status(201).json({
            success: true,
            message: `Trip ${trip_number} created successfully`,
            data: newTrip
        });
    } catch (error) {
        console.error('Create trip error:', error);
        res.status(500).json({ success: false, error: 'Failed to create trip' });
    }
};

// Dispatch trip (Draft -> Dispatched)
exports.dispatchTrip = (req, res) => {
    try {
        const { id } = req.params;
        
        const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
        
        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }
        
        if (trip.status !== 'draft') {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot dispatch trip with status: ${trip.status}` 
            });
        }
        
        // Verify vehicle and driver are assigned
        if (!trip.vehicle_id || !trip.driver_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vehicle and driver must be assigned before dispatch' 
            });
        }
        
        // Re-verify vehicle is still available
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(trip.vehicle_id);
        if (vehicle.status !== 'available') {
            return res.status(400).json({ 
                success: false, 
                error: `Vehicle is no longer available (${vehicle.status})` 
            });
        }
        
        // Re-verify driver is still available
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(trip.driver_id);
        if (driver.status !== 'available') {
            return res.status(400).json({ 
                success: false, 
                error: `Driver is no longer available (${driver.status})` 
            });
        }
        
        if (isLicenseExpired(driver.license_expiry_date)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Driver license has expired' 
            });
        }
        
        const now = new Date().toISOString();
        
        // Update trip
        db.prepare(`
            UPDATE trips 
            SET status = 'dispatched', 
                dispatched_at = ?, 
                start_odometer = ?
            WHERE id = ?
        `).run(now, vehicle.current_odometer, id);
        
        // Business Rule: Update vehicle status to on_trip
        db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run('on_trip', trip.vehicle_id);
        
        // Business Rule: Update driver status to on_trip
        db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run('on_trip', trip.driver_id);
        
        const updated = db.prepare(`
            SELECT 
                t.*,
                v.registration_number,
                v.name as vehicle_name,
                d.name as driver_name
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            WHERE t.id = ?
        `).get(id);
        
        res.json({
            success: true,
            message: `Trip ${trip.trip_number} dispatched. Vehicle and driver marked as On Trip.`,
            data: updated
        });
    } catch (error) {
        console.error('Dispatch trip error:', error);
        res.status(500).json({ success: false, error: 'Failed to dispatch trip' });
    }
};

// Complete trip (Dispatched -> Completed)
exports.completeTrip = (req, res) => {
    try {
        const { id } = req.params;
        const { end_odometer, fuel_consumed, actual_distance } = req.body;
        
        const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
        
        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }
        
        if (trip.status !== 'dispatched') {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot complete trip with status: ${trip.status}` 
            });
        }
        
        // Validation
        if (!end_odometer || end_odometer <= trip.start_odometer) {
            return res.status(400).json({ 
                success: false, 
                error: `End odometer must be greater than start odometer (${trip.start_odometer})` 
            });
        }
        
        if (!fuel_consumed || fuel_consumed <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Fuel consumed is required' 
            });
        }
        
        // Calculate actual distance if not provided
        const distance = actual_distance || (end_odometer - trip.start_odometer);
        
        const now = new Date().toISOString();
        
        // Update trip
        db.prepare(`
            UPDATE trips 
            SET status = 'completed',
                completed_at = ?,
                end_odometer = ?,
                fuel_consumed = ?,
                actual_distance = ?
            WHERE id = ?
        `).run(now, end_odometer, fuel_consumed, distance, id);
        
        // Business Rule: Restore vehicle to available
        db.prepare('UPDATE vehicles SET status = ?, current_odometer = ? WHERE id = ?')
          .run('available', end_odometer, trip.vehicle_id);
        
        // Business Rule: Restore driver to available and increment trip count
        db.prepare('UPDATE drivers SET status = ?, trips_completed = trips_completed + 1 WHERE id = ?')
          .run('available', trip.driver_id);
        
        const updated = db.prepare(`
            SELECT 
                t.*,
                v.registration_number,
                v.name as vehicle_name,
                d.name as driver_name
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            WHERE t.id = ?
        `).get(id);
        
        res.json({
            success: true,
            message: `Trip ${trip.trip_number} completed. Vehicle and driver restored to Available.`,
            data: updated
        });
    } catch (error) {
        console.error('Complete trip error:', error);
        res.status(500).json({ success: false, error: 'Failed to complete trip' });
    }
};

// Cancel trip
exports.cancelTrip = (req, res) => {
    try {
        const { id } = req.params;
        
        const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
        
        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }
        
        if (trip.status === 'completed' || trip.status === 'cancelled') {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot cancel ${trip.status} trip` 
            });
        }
        
        const wasDispatched = trip.status === 'dispatched';
        const now = new Date().toISOString();
        
        // Update trip status
        db.prepare(`
            UPDATE trips 
            SET status = 'cancelled', cancelled_at = ?
            WHERE id = ?
        `).run(now, id);
        
        // Business Rule: If dispatched, restore vehicle and driver
        if (wasDispatched) {
            if (trip.vehicle_id) {
                db.prepare('UPDATE vehicles SET status = ? WHERE id = ?')
                  .run('available', trip.vehicle_id);
            }
            if (trip.driver_id) {
                db.prepare('UPDATE drivers SET status = ? WHERE id = ?')
                  .run('available', trip.driver_id);
            }
        }
        
        const updated = db.prepare(`
            SELECT 
                t.*,
                v.registration_number,
                v.name as vehicle_name,
                d.name as driver_name
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            WHERE t.id = ?
        `).get(id);
        
        const message = wasDispatched 
            ? `Trip ${trip.trip_number} cancelled. Vehicle and driver restored to Available.`
            : `Trip ${trip.trip_number} cancelled.`;
        
        res.json({
            success: true,
            message: message,
            data: updated
        });
    } catch (error) {
        console.error('Cancel trip error:', error);
        res.status(500).json({ success: false, error: 'Failed to cancel trip' });
    }
};

// Update trip (only if in draft)
exports.updateTrip = (req, res) => {
    try {
        const { id } = req.params;
        const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
        
        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }
        
        if (trip.status !== 'draft') {
            return res.status(400).json({ 
                success: false, 
                error: 'Only draft trips can be updated' 
            });
        }
        
        const {
            source,
            destination,
            vehicle_id,
            driver_id,
            cargo_weight,
            planned_distance
        } = req.body;
        
        // Same validations as create
        if (vehicle_id) {
            const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
            if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
            if (vehicle.status !== 'available') {
                return res.status(400).json({ 
                    success: false, 
                    error: `Vehicle is currently ${vehicle.status.replace('_', ' ')}` 
                });
            }
            if (cargo_weight && cargo_weight > vehicle.max_load_capacity) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Cargo weight exceeds vehicle capacity by ${cargo_weight - vehicle.max_load_capacity}kg` 
                });
            }
        }
        
        if (driver_id) {
            const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driver_id);
            if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });
            if (driver.status !== 'available') {
                return res.status(400).json({ 
                    success: false, 
                    error: `Driver is currently ${driver.status.replace('_', ' ')}` 
                });
            }
            if (isLicenseExpired(driver.license_expiry_date)) {
                return res.status(400).json({ success: false, error: 'Driver license has expired' });
            }
        }
        
        db.prepare(`
            UPDATE trips 
            SET source = ?, destination = ?, vehicle_id = ?, driver_id = ?, 
                cargo_weight = ?, planned_distance = ?
            WHERE id = ?
        `).run(
            source || trip.source,
            destination || trip.destination,
            vehicle_id || trip.vehicle_id,
            driver_id || trip.driver_id,
            cargo_weight || trip.cargo_weight,
            planned_distance || trip.planned_distance,
            id
        );
        
        const updated = db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
        
        res.json({
            success: true,
            message: 'Trip updated successfully',
            data: updated
        });
    } catch (error) {
        console.error('Update trip error:', error);
        res.status(500).json({ success: false, error: 'Failed to update trip' });
    }
};

// Delete trip (only draft or cancelled)
exports.deleteTrip = (req, res) => {
    try {
        const { id } = req.params;
        const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
        
        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }
        
        if (trip.status === 'dispatched') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete dispatched trip. Cancel it first.' 
            });
        }
        
        if (trip.status === 'completed') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete completed trip (kept for records)' 
            });
        }
        
        db.prepare('DELETE FROM trips WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Trip deleted successfully' });
    } catch (error) {
        console.error('Delete trip error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete trip' });
    }
};
