const db = require('../database/db');

// Get all KPIs for dashboard
exports.getKPIs = (req, res) => {
    try {
        // Active Vehicles (on trip)
        const activeVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'on_trip'").get().count;
        
        // Available Vehicles
        const availableVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'available'").get().count;
        
        // Vehicles in Maintenance
        const vehiclesInMaintenance = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'in_shop'").get().count;
        
        // Total Vehicles (excluding retired)
        const totalVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status != 'retired'").get().count;
        
        // Active Trips
        const activeTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'dispatched'").get().count;
        
        // Pending Trips
        const pendingTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'draft'").get().count;
        
        // Completed Trips
        const completedTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'completed'").get().count;
        
        // Drivers on Duty
        const driversOnDuty = db.prepare("SELECT COUNT(*) as count FROM drivers WHERE status = 'on_trip'").get().count;
        
        // Available Drivers
        const availableDrivers = db.prepare("SELECT COUNT(*) as count FROM drivers WHERE status = 'available'").get().count;
        
        // Fleet Utilization (%)
        const fleetUtilization = totalVehicles > 0 
            ? Math.round((activeVehicles / totalVehicles) * 100) 
            : 0;
        
        res.json({
            success: true,
            data: {
                activeVehicles,
                availableVehicles,
                vehiclesInMaintenance,
                totalVehicles,
                activeTrips,
                pendingTrips,
                completedTrips,
                driversOnDuty,
                availableDrivers,
                fleetUtilization
            }
        });
    } catch (error) {
        console.error('Get KPIs error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch KPIs' });
    }
};

// Get Fuel Efficiency
exports.getFuelEfficiency = (req, res) => {
    try {
        // Total distance from completed trips
        const distanceResult = db.prepare(`
            SELECT COALESCE(SUM(actual_distance), 0) as total 
            FROM trips 
            WHERE status = 'completed' AND actual_distance IS NOT NULL
        `).get();
        const totalDistance = distanceResult.total;
        
        // Total fuel consumed
        const fuelResult = db.prepare(`
            SELECT COALESCE(SUM(liters), 0) as total FROM fuel_logs
        `).get();
        const totalFuel = fuelResult.total;
        
        // Calculate efficiency
        const efficiency = totalFuel > 0 
            ? (totalDistance / totalFuel).toFixed(2) 
            : 0;
        
        res.json({
            success: true,
            data: {
                totalDistance,
                totalFuel,
                efficiency: parseFloat(efficiency),
                unit: 'km/l'
            }
        });
    } catch (error) {
        console.error('Get fuel efficiency error:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate fuel efficiency' });
    }
};

// Get Fleet Utilization
exports.getFleetUtilization = (req, res) => {
    try {
        const activeVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'on_trip'").get().count;
        const totalVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status != 'retired'").get().count;
        
        const utilization = totalVehicles > 0 
            ? Math.round((activeVehicles / totalVehicles) * 100) 
            : 0;
        
        res.json({
            success: true,
            data: {
                activeVehicles,
                totalVehicles,
                utilization,
                unit: '%'
            }
        });
    } catch (error) {
        console.error('Get utilization error:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate utilization' });
    }
};

// Get Operational Cost breakdown
exports.getOperationalCost = (req, res) => {
    try {
        const totalFuel = db.prepare('SELECT COALESCE(SUM(total_cost), 0) as total FROM fuel_logs').get().total;
        const totalMaintenance = db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM maintenance').get().total;
        const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get().total;
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
        console.error('Get cost error:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate operational cost' });
    }
};

// Get Vehicle ROI
exports.getVehicleROI = (req, res) => {
    try {
        // Get all vehicles with their costs
        const vehicles = db.prepare(`
            SELECT 
                v.id,
                v.name,
                v.registration_number,
                v.acquisition_cost,
                COALESCE((SELECT SUM(total_cost) FROM fuel_logs WHERE vehicle_id = v.id), 0) as fuel_cost,
                COALESCE((SELECT SUM(cost) FROM maintenance WHERE vehicle_id = v.id), 0) as maintenance_cost,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE vehicle_id = v.id), 0) as other_expenses,
                COALESCE((SELECT COUNT(*) FROM trips WHERE vehicle_id = v.id AND status = 'completed'), 0) as completed_trips
            FROM vehicles v
            WHERE v.status != 'retired'
        `).all();
        
        // Calculate ROI for each vehicle
        // Simulated revenue: 5000 per completed trip
        const REVENUE_PER_TRIP = 5000;
        
        const vehicleROIs = vehicles.map(v => {
            const revenue = v.completed_trips * REVENUE_PER_TRIP;
            const totalCosts = v.fuel_cost + v.maintenance_cost + v.other_expenses;
            const roi = v.acquisition_cost > 0 
                ? ((revenue - totalCosts) / v.acquisition_cost * 100).toFixed(2)
                : 0;
            
            return {
                ...v,
                revenue,
                total_costs: totalCosts,
                roi: parseFloat(roi)
            };
        });
        
        // Average ROI
        const avgROI = vehicleROIs.length > 0
            ? (vehicleROIs.reduce((sum, v) => sum + v.roi, 0) / vehicleROIs.length).toFixed(2)
            : 0;
        
        res.json({
            success: true,
            data: {
                averageROI: parseFloat(avgROI),
                vehicles: vehicleROIs
            }
        });
    } catch (error) {
        console.error('Get ROI error:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate ROI' });
    }
};

// Get Monthly Revenue (last 6 months)
exports.getMonthlyRevenue = (req, res) => {
    try {
        // Get last 6 months
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const monthName = date.toLocaleString('default', { month: 'short' });
            
            months.push({ year, month, monthName, yearMonth: `${year}-${month}` });
        }
        
        // For each month, count completed trips and calculate revenue
        const REVENUE_PER_TRIP = 5000;
        
        const monthlyData = months.map(m => {
            const trips = db.prepare(`
                SELECT COUNT(*) as count FROM trips
                WHERE status = 'completed'
                AND strftime('%Y-%m', completed_at) = ?
            `).get(m.yearMonth).count;
            
            return {
                month: m.monthName,
                yearMonth: m.yearMonth,
                trips,
                revenue: trips * REVENUE_PER_TRIP
            };
        });
        
        res.json({
            success: true,
            data: monthlyData
        });
    } catch (error) {
        console.error('Get monthly revenue error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch monthly revenue' });
    }
};

// Get Top Costliest Vehicles
exports.getTopCostliestVehicles = (req, res) => {
    try {
        const vehicles = db.prepare(`
            SELECT 
                v.id,
                v.name,
                v.registration_number,
                COALESCE((SELECT SUM(total_cost) FROM fuel_logs WHERE vehicle_id = v.id), 0) as fuel_cost,
                COALESCE((SELECT SUM(cost) FROM maintenance WHERE vehicle_id = v.id), 0) as maintenance_cost,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE vehicle_id = v.id), 0) as other_expenses
            FROM vehicles v
            WHERE v.status != 'retired'
        `).all();
        
        // Calculate total cost and sort
        const withTotals = vehicles.map(v => ({
            ...v,
            total_cost: v.fuel_cost + v.maintenance_cost + v.other_expenses
        }))
        .sort((a, b) => b.total_cost - a.total_cost)
        .slice(0, 5); // Top 5
        
        res.json({
            success: true,
            data: withTotals
        });
    } catch (error) {
        console.error('Get top vehicles error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch top vehicles' });
    }
};

// Get Vehicle Status Distribution
exports.getVehicleStatusDistribution = (req, res) => {
    try {
        const distribution = db.prepare(`
            SELECT status, COUNT(*) as count 
            FROM vehicles 
            GROUP BY status
        `).all();
        
        res.json({
            success: true,
            data: distribution
        });
    } catch (error) {
        console.error('Get distribution error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch distribution' });
    }
};

// Get Recent Trips
exports.getRecentTrips = (req, res) => {
    try {
        const trips = db.prepare(`
            SELECT 
                t.*,
                v.registration_number,
                v.name as vehicle_name,
                d.name as driver_name
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            ORDER BY t.created_at DESC
            LIMIT 10
        `).all();
        
        res.json({
            success: true,
            data: trips
        });
    } catch (error) {
        console.error('Get recent trips error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch recent trips' });
    }
};
