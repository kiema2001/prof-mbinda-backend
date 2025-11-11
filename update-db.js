const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prof_mbinda.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Updating database schema...');

// Add profile_photo column to students table if it doesn't exist
db.run(`ALTER TABLE students ADD COLUMN profile_photo TEXT`, function(err) {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('✅ profile_photo column already exists');
        } else {
            console.error('❌ Error adding profile_photo column:', err.message);
        }
    } else {
        console.log('✅ Added profile_photo column to students table');
    }
    
    db.close((err) => {
        if (err) {
            console.error('❌ Database closing error:', err.message);
        } else {
            console.log('✅ Database update complete!');
            console.log('🚀 You can now use profile photos for students.');
        }
    });
});