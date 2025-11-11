const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'prof_mbinda.db');
console.log('🔍 Database path:', dbPath);

// Check if file exists
if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file does not exist!');
    process.exit(1);
}

console.log('✅ Database file exists');
console.log('📏 File size:', fs.statSync(dbPath).size, 'bytes');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Cannot open database:', err.message);
        process.exit(1);
    }
    console.log('✅ Database opened successfully\n');
});

// Comprehensive check
db.serialize(() => {
    // 1. Check all tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('❌ Error listing tables:', err.message);
            return;
        }

        console.log('📊 TABLES FOUND:');
        if (tables.length === 0) {
            console.log('   No tables found! Database is empty.');
            db.close();
            return;
        }

        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });

        // 2. Check publications table specifically
        console.log('\n🔍 CHECKING PUBLICATIONS TABLE:');
        db.all(`PRAGMA table_info(publications)`, (err, columns) => {
            if (err) {
                console.log('   ❌ Publications table does not exist or error:', err.message);
            } else if (columns.length === 0) {
                console.log('   ❌ Publications table exists but has no columns');
            } else {
                console.log('   ✅ Publications table columns:');
                columns.forEach(col => {
                    console.log(`        ${col.name} (${col.type}) ${col.pk ? 'PRIMARY KEY' : ''}`);
                });
            }

            // 3. Try a test insert
            console.log('\n🧪 TESTING INSERT INTO PUBLICATIONS:');
            const testData = {
                title: 'Test Publication',
                details: 'Test Authors',
                year: 2024,
                link: ''
            };

            db.run(
                'INSERT INTO publications (title, details, year, link) VALUES (?, ?, ?, ?)',
                [testData.title, testData.details, testData.year, testData.link],
                function(err) {
                    if (err) {
                        console.log('   ❌ INSERT FAILED:', err.message);
                        console.log('   💡 Error details:', err);
                    } else {
                        console.log('   ✅ INSERT SUCCESSFUL!');
                        console.log('      Last ID:', this.lastID);
                        console.log('      Rows changed:', this.changes);
                    }

                    // 4. Show current publications
                    console.log('\n📋 CURRENT PUBLICATIONS:');
                    db.all('SELECT * FROM publications', (err, rows) => {
                        if (err) {
                            console.log('   ❌ Error reading publications:', err.message);
                        } else {
                            console.log(`   Total publications: ${rows.length}`);
                            rows.forEach(row => {
                                console.log(`      ID: ${row.id}, Title: "${row.title}", Year: ${row.year}`);
                            });
                        }

                        db.close();
                        console.log('\n✅ Debug completed');
                    });
                }
            );
        });
    });
});