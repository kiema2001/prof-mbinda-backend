console.log('🚀 Starting database check...');

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbPath = './prof_mbinda.db';

// Check if file exists
if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file does not exist!');
    process.exit(1);
}

console.log('✅ Database file exists');

// Try to open database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log('❌ Cannot open database:', err.message);
        process.exit(1);
    }
    console.log('✅ Database opened successfully');
});

// Simple query to list tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.log('❌ Error querying tables:', err.message);
        db.close();
        return;
    }
    
    console.log('\n📋 TABLES FOUND:');
    console.log('----------------');
    
    if (tables.length === 0) {
        console.log('No tables found!');
    } else {
        tables.forEach(table => {
            console.log(`- ${table.name}`);
        });
    }
    
    db.close();
    console.log('\n✅ Check complete');
});