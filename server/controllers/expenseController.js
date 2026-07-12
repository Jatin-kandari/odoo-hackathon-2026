const db = require('../database/db');

// Get all expenses
exports.getAllExpenses = (req, res) => {
    try {
        const expenses = db.prepare(`
            SELECT 
                e.*,
                v.registration_number,
                v.name as vehicle_name,
                t.trip_number
            FROM expenses e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            LEFT JOIN trips t ON e.trip_id = t.id
            ORDER BY e.date DESC, e.created_at DESC
        `).all();
        
        res.json({ success: true, count: expenses.length, data: expenses });
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
    }
};

// Get expenses by vehicle
exports.getExpensesByVehicle = (req, res) => {
    try {
        const { vehicleId } = req.params;
        
        const expenses = db.prepare(`
            SELECT 
                e.*,
                v.registration_number,
                v.name as vehicle_name
            FROM expenses e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            WHERE e.vehicle_id = ?
            ORDER BY e.date DESC
        `).all(vehicleId);
        
        res.json({ success: true, count: expenses.length, data: expenses });
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch vehicle expenses' });
    }
};

// Create expense
exports.createExpense = (req, res) => {
    try {
        const { vehicle_id, trip_id, category, amount, description, date } = req.body;
        
        // Validation
        if (!vehicle_id || !category || !amount || !date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vehicle, category, amount, and date are required' 
            });
        }
        
        if (amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Amount must be greater than 0' 
            });
        }
        
        // Valid categories
        const validCategories = ['toll', 'parking', 'insurance', 'repair', 'other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid category. Must be: toll, parking, insurance, repair, or other' 
            });
        }
        
        // Check if vehicle exists
        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }
        
        // Insert expense
        const result = db.prepare(`
            INSERT INTO expenses (trip_id, vehicle_id, category, amount, description, date)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(trip_id || null, vehicle_id, category, amount, description || '', date);
        
        // Get the created expense
        const newExpense = db.prepare(`
            SELECT 
                e.*,
                v.registration_number,
                v.name as vehicle_name
            FROM expenses e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            WHERE e.id = ?
        `).get(result.lastInsertRowid);
        
        res.status(201).json({
            success: true,
            message: 'Expense recorded successfully',
            data: newExpense
        });
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ success: false, error: 'Failed to create expense' });
    }
};

// Delete expense
exports.deleteExpense = (req, res) => {
    try {
        const { id } = req.params;
        
        const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
        if (!expense) {
            return res.status(404).json({ success: false, error: 'Expense not found' });
        }
        
        db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
        
        res.json({ success: true, message: 'Expense deleted' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete expense' });
    }
};

// Get total operational cost summary
exports.getOperationalCost = (req, res) => {
    try {
        // Total fuel cost
        const fuelResult = db.prepare('SELECT COALESCE(SUM(total_cost), 0) as total FROM fuel_logs').get();
        const totalFuel = fuelResult.total;
        
        // Total maintenance cost
        const maintenanceResult = db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM maintenance').get();
        const totalMaintenance = maintenanceResult.total;
        
        // Total other expenses
        const expenseResult = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get();
        const totalExpenses = expenseResult.total;
        
        // Grand total
        const total = totalFuel + totalMaintenance + totalExpenses;
        
        res.json({
            success: true,
            data: {
                totalFuel,
                totalMaintenance,
                totalExpenses,
                total
            }
        });
    } catch (error) {
        console.error('Get operational cost error:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate operational cost' });
    }
};
