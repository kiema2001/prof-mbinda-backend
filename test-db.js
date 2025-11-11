const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🧪 Starting database test...');

const dbPath = path.join(__dirname, 'prof_mbinda.db');

// Check if database file exists
if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found:', dbPath);
    console.log('💡 Run: node init-db.js');
    process.exit(1);
}

console.log('✅ Database file exists:', dbPath);

// Try to open the database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.log('💡 Try running: node init-db.js');
        process.exit(1);
    }
    console.log('✅ Database connected successfully!');
});

// Test all tables
const tablesToTest = [
    'users', 
    'professor_profile', 
    'students', 
    'publications', 
    'research_projects', 
    'gallery', 
    'documents'
];

let testsCompleted = 0;

function testTable(tableName) {
    db.all(`SELECT COUNT(*) as count FROM ${tableName}`, (err, result) => {
        if (err) {
            console.log(`❌ ${tableName}: Error - ${err.message}`);
        } else {
            console.log(`✅ ${tableName}: ${result[0].count} records`);
            
            // Show sample data for key tables
            if (tableName === 'users') {
                db.all(`SELECT email, role FROM ${tableName}`, (err, rows) => {
                    if (!err && rows.length > 0) {
                        console.log(`   👤 Sample user: ${rows[0].email} (${rows[0].role})`);
                    }
                });
            }
        }
        
        testsCompleted++;
        
        // Close database when all tests are done
        if (testsCompleted === tablesToTest.length) {
            console.log('\n📊 Database Test Summary:');
            console.log(`✅ All ${tablesToTest.length} tables checked`);
            console.log('\n🎉 Database is ready to use!');
            console.log('\n🚀 Next steps:');
            console.log('1. Start server: node server.js');
            console.log('2. Visit: http://localhost:3000');
            console.log('3. Admin: http://localhost:3000/admin.html');
            console.log('4. Login: admin@mbindalab.com / admin123');
            
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('🔒 Database connection closed.');
                }
            });
        }
    });
}

console.log('\n📋 Checking tables and data...');

// Test each table
tablesToTest.forEach(table => {
    testTable(table);
});