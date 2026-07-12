const db = require('./db');

console.log('Adding test vehicles...');

try {
    // Add test vehicles
    db.prepare(`
        INSERT INTO vehicles (registration_number, name, type, max_load_capacity, current_odometer, acquisition_cost, status)
        VALUES 
            ('GJ01AB1234', 'VAN-05', 'van', 500, 74000, 620000, 'available'),
            ('GJ01AB5678', 'TRUCK-11', 'truck', 5000, 152000, 2450000, 'available'),
            ('GJ01AB9012', 'MINI-03', 'mini', 1000, 66000, 410000, 'available')
    `).run();
    
    console.log('Test vehicles added successfully');
} catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
        console.log('Test data already exists, skipping...');
    } else {
        console.error('Error:', error.message);
    }
}

process.exit(0);
