const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('prof_mbinda.db');

console.log('🔍 CHECKING TABLE STRUCTURES\n');

// Check researchers table structure
db.all("PRAGMA table_info(researchers)", (err, columns) => {
    if (err) {
        console.log('❌ researchers table error:', err.message);
    } else {
        console.log('🏷️ RESEARCHERS TABLE COLUMNS:');
        columns.forEach(col => {
            console.log(`   ${col.name} (${col.type})`);
        });
    }
    
    // Check students table (if it exists)
    db.all("PRAGMA table_info(students)", (err, columns) => {
        if (err) {
            console.log('\n❌ students table does not exist');
        } else {
            console.log('\n🏷️ STUDENTS TABLE COLUMNS:');
            columns.forEach(col => {
                console.log(`   ${col.name} (${col.type})`);
            });
        }
        
        db.close();
    });
});