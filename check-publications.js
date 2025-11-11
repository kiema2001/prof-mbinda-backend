const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prof_mbinda.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 CHECKING PUBLICATIONS TABLE STRUCTURE\n');

// Check the exact column structure
db.all(`PRAGMA table_info(publications)`, (err, columns) => {
    if (err) {
        console.error('❌ Error checking publications table:', err.message);
        db.close();
        return;
    }

    console.log('📋 PUBLICATIONS TABLE COLUMNS:');
    if (columns.length === 0) {
        console.log('   ❌ No columns found in publications table!');
    } else {
        columns.forEach(col => {
            console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''} ${col.dflt_value ? 'DEFAULT: ' + col.dflt_value : ''}`);
        });
    }

    // Check if there are any publications
    console.log('\n📊 CURRENT PUBLICATIONS:');
    db.all('SELECT * FROM publications', (err, rows) => {
        if (err) {
            console.error('❌ Error reading publications:', err.message);
        } else {
            console.log(`   Total publications: ${rows.length}`);
            rows.forEach(row => {
                console.log(`   ID: ${row.id}, Title: "${row.title}", Year: ${row.year}`);
                console.log(`      Details: ${row.details}`);
                console.log(`      Link: ${row.link}`);
                console.log(`      Created: ${row.created_at}`);
            });
        }

        // Test an insert to see the exact error
        console.log('\n🧪 TESTING INSERT:');
        const testData = {
            title: 'Test Publication Debug',
            details: 'Test Authors for Debug',
            year: 2024,
            link: ''
        };

        console.log('   Data to insert:', testData);

        db.run(
            'INSERT INTO publications (title, details, year, link) VALUES (?, ?, ?, ?)',
            [testData.title, testData.details, testData.year, testData.link],
            function(err) {
                if (err) {
                    console.error('   ❌ INSERT FAILED:');
                    console.error('      Error:', err.message);
                    console.error('      Code:', err.code);
                    
                    // Try to get more specific error info
                    if (err.message.includes('no such table')) {
                        console.error('   💡 SOLUTION: Publications table does not exist');
                    } else if (err.message.includes('no such column')) {
                        console.error('   💡 SOLUTION: Missing column in publications table');
                    } else if (err.message.includes('NOT NULL')) {
                        console.error('   💡 SOLUTION: NULL value for NOT NULL column');
                    }
                } else {
                    console.log('   ✅ INSERT SUCCESSFUL!');
                    console.log('      Last ID:', this.lastID);
                    console.log('      Rows changed:', this.changes);
                }

                db.close();
                console.log('\n✅ Check completed');
            }
        );
    });
});