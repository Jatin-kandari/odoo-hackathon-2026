-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'dispatcher')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('truck', 'van', 'car', 'mini', 'bike')),
    max_load_capacity REAL NOT NULL,
    current_odometer REAL DEFAULT 0,
    acquisition_cost REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'on_trip', 'in_shop', 'retired')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    license_category TEXT NOT NULL,
    license_expiry_date DATE NOT NULL,
    contact_number TEXT NOT NULL,
    safety_score INTEGER DEFAULT 100 CHECK(safety_score >= 0 AND safety_score <= 100),
    trips_completed INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'on_trip', 'off_duty', 'suspended')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trips Table
CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_number TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    vehicle_id INTEGER,
    driver_id INTEGER,
    cargo_weight REAL NOT NULL,
    planned_distance REAL NOT NULL,
    actual_distance REAL,
    start_odometer REAL,
    end_odometer REAL,
    fuel_consumed REAL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'dispatched', 'completed', 'cancelled')),
    dispatched_at DATETIME,
    completed_at DATETIME,
    cancelled_at DATETIME,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Maintenance Table
CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    cost REAL NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- Fuel Logs Table
CREATE TABLE IF NOT EXISTS fuel_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER,
    vehicle_id INTEGER NOT NULL,
    liters REAL NOT NULL,
    cost_per_liter REAL NOT NULL,
    total_cost REAL NOT NULL,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER,
    vehicle_id INTEGER NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('toll', 'parking', 'insurance', 'repair', 'other')),
    amount REAL NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance(vehicle_id);
