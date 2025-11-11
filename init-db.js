const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'prof_mbinda.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Initializing database...');

// Create tables with proper schema
db.serialize(() => {
    // Drop tables if they exist (clean start)
    db.run(`DROP TABLE IF EXISTS users`);
    db.run(`DROP TABLE IF EXISTS professor_profile`);
    db.run(`DROP TABLE IF EXISTS students`);
    db.run(`DROP TABLE IF EXISTS publications`);
    db.run(`DROP TABLE IF EXISTS research_projects`);
    db.run(`DROP TABLE IF EXISTS notifications`);
    db.run(`DROP TABLE IF EXISTS documents`);

    console.log('🗑️ Cleaned existing tables');

    // Users table
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ Users table error:', err);
        else console.log('✅ Users table created');
    });

    // Professor profile table
    db.run(`CREATE TABLE professor_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        bio TEXT,
        contact TEXT,
        profile_photo TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ Professor profile table error:', err);
        else console.log('✅ Professor profile table created');
    });

    // Students table
    db.run(`CREATE TABLE students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        degree TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('phd', 'masters', 'alumni')),
        research_focus TEXT,
        current_work TEXT,
        profile_photo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ Students table error:', err);
        else console.log('✅ Students table created');
    });

    // Publications table
    db.run(`CREATE TABLE publications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        details TEXT NOT NULL,
        year INTEGER NOT NULL,
        link TEXT,
        document_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ Publications table error:', err);
        else console.log('✅ Publications table created');
    });

    // Research projects table
    db.run(`CREATE TABLE research_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        document_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ Research projects table error:', err);
        else console.log('✅ Research projects table created');
    });

    // Notifications table
    db.run(`CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    )`, (err) => {
        if (err) console.error('❌ Notifications table error:', err);
        else console.log('✅ Notifications table created');
    });

    // Documents table
    db.run(`CREATE TABLE documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('❌ Documents table error:', err);
        else console.log('✅ Documents table created');
    });

    // Wait for tables to be created, then insert data
    setTimeout(() => {
        // Create default admin user
        bcrypt.hash('admin123', 10, (err, hash) => {
            if (err) {
                console.error('❌ Error hashing password:', err);
                return;
            }

            db.run(`INSERT INTO users (email, password_hash, full_name) 
                    VALUES (?, ?, ?)`, 
                    ['admin@mbindalab.com', hash, 'Administrator'], 
                    function(err) {
                if (err) {
                    console.error('❌ Error creating admin user:', err);
                } else {
                    console.log('✅ Admin user created');
                }
            });
        });

        // Insert initial professor profile
        const defaultBio = `Professor Wilton Mbinda is the Registrar of Research and Extension at Pwani University and a distinguished Principal Investigator at the Pwani University Bioscience Research Center (PUBREC). With extensive research experience in molecular biology, genetic engineering, and biotechnology, his work focuses on developing innovative solutions for sustainable agriculture and improving crop resilience.

Professor Mbinda leads a dynamic research team at PUBREC, focusing on plant stress biology, genome editing, and biofortification. His research has contributed significantly to understanding molecular mechanisms of drought tolerance in staple crops and developing CRISPR-based technologies for crop improvement.

With over 15 years of academic leadership, Professor Mbinda has supervised numerous graduate students and published widely in high-impact journals. His research has attracted significant funding from national and international grant agencies.`;

        const defaultContact = `Email: w.mbinda@pu.ac.ke
Phone: +254 (0) 20 123 4567
Office: Research and Extension Building, Pwani University
Address: Pwani University Bioscience Research Center (PUBREC), Pwani University, Kilifi, Kenya`;

        db.run(`INSERT INTO professor_profile (id, bio, contact, profile_photo) 
                VALUES (1, ?, ?, ?)`, 
                [defaultBio, defaultContact, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'], 
                function(err) {
            if (err) {
                console.error('❌ Error creating professor profile:', err);
            } else {
                console.log('✅ Professor profile created');
            }
        });

        // Insert sample students
        const sampleStudents = [
            ['Dennis Mukhebi', 'PhD Candidate in Biotechnology', 'phd', 'Molecular characterization of drought-tolerant genes in maize', 'Gene expression analysis under water stress conditions', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
            ['Allan Mutua', 'Research Assistant', 'phd', 'Bioinformatics and genomic data analysis', 'Developing computational pipelines for NGS data', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
            ['Pauline Gachanja', 'Research Assistant', 'masters', 'Plant tissue culture and transformation', 'Optimizing regeneration protocols for cassava', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
            ['Eugene Mwanza', 'PhD Candidate in Biotechnology', 'phd', 'CRISPR-based genome editing for disease resistance', 'Developing CRISPR tools for banana bacterial wilt resistance', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
            ['Steven Biko', 'PhD Candidate in Molecular Biology', 'phd', 'Epigenetic regulation of stress responses', 'DNA methylation patterns in drought-stressed plants', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
            ['Isaya Adongo', 'PhD Candidate in Plant Biotechnology', 'phd', 'Metabolic engineering for biofortification', 'Enhancing iron content in sorghum', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
            ['Mputhia Milka', 'Postdoctoral Researcher', 'alumni', 'Molecular mechanisms of salt tolerance', 'Postdoctoral Fellow, University of Cambridge, UK', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80']
        ];

        sampleStudents.forEach((student) => {
            db.run(`INSERT INTO students (name, degree, type, research_focus, current_work, profile_photo) 
                    VALUES (?, ?, ?, ?, ?, ?)`, student, function(err) {
                if (err) {
                    console.error('❌ Error inserting sample student:', err);
                } else {
                    console.log(`✅ Sample student added: ${student[0]}`);
                }
            });
        });

        // Insert sample publications
        const samplePublications = [
            ['Genetic mechanisms of drought resistance in cereal crops', 'Mbinda, W., Mukhebi, D., Mutua, A. (2023). Nature Plants, 15(3), 245-256.', 2023, 'https://doi.org/10.1038/s41477-023-01465-2'],
            ['CRISPR-based genome editing for crop improvement', 'Mbinda, W., Mwanza, E., Gachanja, P. (2022). Plant Biotechnology Journal, 20(8), 1501-1515.', 2022, 'https://doi.org/10.1111/pbi.13845'],
            ['Novel approaches to sustainable agriculture', 'Mbinda, W., Biko, S., Adongo, I. (2023). International Journal of Plant Biology, 12(1), 45-58.', 2023, 'https://doi.org/10.3390/ijpb12010045']
        ];

        samplePublications.forEach((pub) => {
            db.run(`INSERT INTO publications (title, details, year, link) 
                    VALUES (?, ?, ?, ?)`, pub, function(err) {
                if (err) {
                    console.error('❌ Error inserting sample publication:', err);
                } else {
                    console.log(`✅ Sample publication added: ${pub[0]}`);
                }
            });
        });

        // Insert sample research projects
        const sampleResearch = [
            ['Climate-Resilient Crops', 'Developing crop varieties with enhanced tolerance to drought, heat, and salinity through genetic engineering and traditional breeding approaches. This project focuses on identification of stress-responsive genes, field trials of modified varieties, and collaboration with international research centers.'],
            ['Precision Gene Editing', 'Advancing CRISPR-based technologies for precise genome modifications in plants to improve traits without introducing foreign DNA. Research includes development of novel editing tools, application in major food crops, and regulatory framework assessment.'],
            ['Nutritional Biofortification', 'Enhancing the nutritional content of staple crops through metabolic engineering to address micronutrient deficiencies in vulnerable populations. Work includes iron and zinc enrichment in cereals, vitamin A enhancement in cassava, and partnership with nutrition research institutes.']
        ];

        sampleResearch.forEach((research) => {
            db.run(`INSERT INTO research_projects (title, description) 
                    VALUES (?, ?)`, research, function(err) {
                if (err) {
                    console.error('❌ Error inserting sample research:', err);
                } else {
                    console.log(`✅ Sample research project added: ${research[0]}`);
                }
            });
        });

        // Insert sample notifications
        const sampleNotifications = [
            ['New Publication Alert', 'Our latest research on genetic mechanisms of drought resistance has been published in Nature Plants.', 'success'],
            ['Research Grant Awarded', 'The lab has been awarded a new research grant from the National Research Fund for climate-resilient crops project.', 'info'],
            ['Upcoming Conference', 'Professor Mbinda will be presenting at the International Plant Biology Conference next month.', 'warning']
        ];

        sampleNotifications.forEach((notification) => {
            db.run(`INSERT INTO notifications (title, message, type) 
                    VALUES (?, ?, ?)`, notification, function(err) {
                if (err) {
                    console.error('❌ Error inserting sample notification:', err);
                } else {
                    console.log(`✅ Sample notification added: ${notification[0]}`);
                }
            });
        });

        // Final message
        setTimeout(() => {
            console.log('\n🎉 Database initialization complete!');
            console.log('📊 You can now use the system with:');
            console.log('   🌐 Website: http://localhost:3000');
            console.log('   🔒 Admin: http://localhost:3000/admin.html');
            console.log('   🔑 Login: admin@mbindalab.com / admin123');
            console.log('\n📝 Sample data includes:');
            console.log('   - Professor profile with photo');
            console.log('   - 7 students with photos');
            console.log('   - 3 publications');
            console.log('   - 3 research projects');
            console.log('   - 3 notifications');
            
            db.close((err) => {
                if (err) {
                    console.error('❌ Database closing error:', err.message);
                } else {
                    console.log('✅ Database connection closed.');
                }
            });
        }, 1000);

    }, 500);
});