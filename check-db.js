const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('prof_mbinda.db');

console.log('🔍 CHECKING DATABASE...\n');

// 1. Check tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.log('❌ Error checking tables:', err.message);
        return;
    }
    
    console.log('📊 TABLES:');
    tables.forEach(t => console.log(' -', t.name));
    
    // 2. Check publications table structure
    db.all("PRAGMA table_info(publications)", (err, cols) => {
        console.log('\n📋 PUBLICATIONS COLUMNS:');
        if (err) {
            console.log('❌ Error:', err.message);
        } else if (cols.length === 0) {
            console.log('❌ Publications table has no columns or does not exist');
        } else {
            cols.forEach(c => console.log(' -', c.name, '(', c.type, ')'));
        }
        
        // 3. Try to insert
        console.log('\n🧪 TEST INSERT:');
        db.run("INSERT INTO publications (title, details, year, link) VALUES (?, ?, ?, ?)", 
            ['Test', 'Test Details', 2024, ''], 
            function(err) {
                if (err) {
                    console.log('❌ Insert failed:', err.message);
                } else {
                    console.log('✅ Insert successful! ID:', this.lastID);
                }
                
                // 4. Count publications
                console.log('\n📈 PUBLICATION COUNT:');
                db.get("SELECT COUNT(*) as count FROM publications", (err, row) => {
                    if (err) {
                        console.log('❌ Count error:', err.message);
                    } else {
                        console.log('Count:', row.count);
                    }
                    
                    db.close();
                    console.log('\n✅ Check completed');
                });
            }
        );
    });
});