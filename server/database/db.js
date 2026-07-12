const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'transitops.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

console.log('Database initialized successfully');

module.exports = db;
