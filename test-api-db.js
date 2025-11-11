const sqlite3 = require('sqlite3').verbose();

console.log('🔗 TESTING API-DATABASE COMMUNICATION');
console.log('='.repeat(50));

const db = new sqlite3.Database('prof_mbinda.db', (err) => {
    if (err) {
        console.log('❌ Cannot connect to database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to database');
});

// Test 1: Check if all required tables exist
console.log('\n📋 1. Checking required tables...');
const requiredTables = ['users', 'professor_profile', 'students', 'publications', 'research_projects', 'gallery', 'documents'];

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.log('❌ Error checking tables:', err.message);
        return;
    }

    const existingTables = tables.map(t => t.name);
    console.log('Found tables:', existingTables);

    requiredTables.forEach(table => {
        if (existingTables.includes(table)) {
            console.log(`   ✅ ${table}`);
        } else {
            console.log(`   ❌ ${table} - MISSING`);
        }
    });

    // Test 2: Test student operations (what the API needs)
    console.log('\n👨‍🎓 2. Testing student operations...');
    
    // Test INSERT (what admin dashboard does)
    db.run(
        "INSERT INTO students (name, degree, type, research_focus) VALUES (?, ?, ?, ?)",
        ['Test Student API', 'PhD Test', 'phd', 'API Testing'],
        function(err) {
            if (err) {
                console.log('❌ INSERT failed:', err.message);
            } else {
                console.log('✅ INSERT successful - ID:', this.lastID);
                
                // Test SELECT (what website needs)
                db.all("SELECT * FROM students", (err, students) => {
                    if (err) {
                        console.log('❌ SELECT failed:', err.message);
                    } else {
                        console.log('✅ SELECT successful - Found', students.length, 'students');
                        
                        // Test DELETE (what admin needs)
                        db.run("DELETE FROM students WHERE name = ?", ['Test Student API'], (err) => {
                            if (err) {
                                console.log('❌ DELETE failed:', err.message);
                            } else {
                                console.log('✅ DELETE successful');
                                console.log('\n🎉 ALL API-DATABASE TESTS PASSED!');
                            }
                            db.close();
                        });
                    }
                });
            }
        }
    );
});