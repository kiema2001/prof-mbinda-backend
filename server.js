const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const PORT = 3000;

// Database setup
const dbPath = path.join(__dirname, 'prof_mbinda.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('❌ Database error:', err.message);
    } else {
        console.log('✅ Database connected');
        initializeDatabase();
    }
});

// Session store
const sessionStore = new SQLiteStore({
    db: 'sessions.db',
    dir: __dirname
});

// Session configuration
app.use(session({
    store: sessionStore,
    secret: 'prof-mbinda-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir;
        if (file.fieldname === 'profile_photo' || file.fieldname === 'student_photo') {
            dir = path.join(__dirname, 'uploads');
        } else {
            dir = path.join(__dirname, 'documents');
        }
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF) and documents (PDF, DOC, DOCX) are allowed'));
        }
    }
});

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const documentsDir = path.join(__dirname, 'documents');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(documentsDir)) fs.mkdirSync(documentsDir, { recursive: true });

// Initialize database with required tables and default data
function initializeDatabase() {
    console.log('🔍 Initializing database...');
    
    // First, let's check if we need to alter the students table
    db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='students'`, (err, row) => {
        if (err) {
            console.error('❌ Error checking students table:', err);
            createTables();
            return;
        }
        
        if (row && row.sql) {
            console.log('📋 Current students table schema:', row.sql);
            
            // Check if the table has the old constraint
            if (row.sql.includes("type IN ('phd', 'masters', 'alumni')")) {
                console.log('🔄 Updating students table constraint...');
                
                // Create a temporary table without the constraint
                db.serialize(() => {
                    db.run(`CREATE TABLE students_temp (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        degree TEXT NOT NULL,
                        type TEXT NOT NULL,
                        research_focus TEXT,
                        current_work TEXT,
                        profile_photo TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )`);
                    
                    // Copy data
                    db.run(`INSERT INTO students_temp SELECT * FROM students`);
                    
                    // Drop old table
                    db.run(`DROP TABLE students`);
                    
                    // Rename temp table
                    db.run(`ALTER TABLE students_temp RENAME TO students`);
                    
                    console.log('✅ Students table updated successfully');
                    createTables();
                });
            } else {
                createTables();
            }
        } else {
            createTables();
        }
    });
}

function createTables() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS professor_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            bio TEXT,
            contact TEXT,
            profile_photo TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            degree TEXT NOT NULL,
            type TEXT NOT NULL,
            research_focus TEXT,
            current_work TEXT,
            profile_photo TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS publications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            details TEXT NOT NULL,
            year INTEGER NOT NULL,
            link TEXT,
            document_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS research_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            document_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1
        )`,
        
        `CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            file_type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    // Create tables sequentially
    const createTable = (index) => {
        if (index >= tables.length) {
            initializeDefaultData();
            return;
        }
        
        db.run(tables[index], (err) => {
            if (err) {
                console.error(`❌ Error creating table ${index + 1}:`, err.message);
            } else {
                console.log(`✅ Table ${index + 1} created/verified`);
            }
            createTable(index + 1);
        });
    };
    
    createTable(0);
}

function initializeDefaultData() {
    // Create default user with new credentials
    const defaultEmail = 'Wmbinda';
    const defaultPassword = 'Mbinda@2025';
    const defaultName = 'Professor Wilton Mbinda';
    
    db.get('SELECT id FROM users WHERE email = ?', [defaultEmail], (err, row) => {
        if (err) {
            console.error('❌ Error checking default user:', err);
            return;
        }
        
        if (!row) {
            bcrypt.hash(defaultPassword, 10, (err, hash) => {
                if (err) {
                    console.error('❌ Error hashing password:', err);
                    return;
                }
                
                db.run(
                    'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
                    [defaultEmail, hash, defaultName],
                    function(err) {
                        if (err) {
                            console.error('❌ Error creating default user:', err);
                        } else {
                            console.log('✅ Default user created:', defaultEmail);
                        }
                    }
                );
            });
        } else {
            console.log('✅ Default user already exists');
        }
    });

    // Create default professor profile
    db.get('SELECT id FROM professor_profile WHERE id = 1', (err, row) => {
        if (err) {
            console.error('❌ Error checking professor profile:', err);
            return;
        }
        
        if (!row) {
            const defaultBio = `Professor Wilton Mbinda is the Registrar of Research and Extension at Pwani University and a distinguished Principal Investigator at the Pwani University Bioscience Research Center (PUBREC).

With extensive research experience in molecular biology, genetic engineering, and biotechnology, his work focuses on developing innovative solutions for sustainable agriculture and improving crop resilience.

Professor Mbinda leads a dynamic research team at PUBREC, focusing on plant stress biology, genome editing, and biofortification.`;

            const defaultContact = `Email: w.mbinda@pu.ac.ke
Phone: +254 (0) 20 123 4567
Office: Research and Extension Building
Pwani University, Kilifi, Kenya`;

            db.run(
                'INSERT INTO professor_profile (id, bio, contact) VALUES (1, ?, ?)',
                [defaultBio, defaultContact],
                function(err) {
                    if (err) {
                        console.error('❌ Error creating professor profile:', err);
                    } else {
                        console.log('✅ Default professor profile created');
                    }
                }
            );
        } else {
            console.log('✅ Professor profile already exists');
        }
    });

    // Add some sample students if none exist
    db.get('SELECT COUNT(*) as count FROM students', (err, row) => {
        if (err) {
            console.error('❌ Error checking students count:', err);
            return;
        }
        
        if (row.count === 0) {
            console.log('📝 Adding sample students...');
            const sampleStudents = [
                ['John Doe', 'PhD in Molecular Biology', 'phd', 'Plant Biotechnology', 'Working on CRISPR gene editing'],
                ['Jane Smith', 'MSc in Biochemistry', 'masters', 'Protein Engineering', 'Research on enzyme optimization'],
                ['Mike Johnson', 'BSc in Biotechnology', 'alumni', 'Genetic Engineering', 'Currently at Biotech Inc.']
            ];
            
            sampleStudents.forEach((student, index) => {
                db.run(
                    'INSERT INTO students (name, degree, type, research_focus, current_work) VALUES (?, ?, ?, ?, ?)',
                    student,
                    function(err) {
                        if (err) {
                            console.error(`❌ Error adding sample student ${index + 1}:`, err);
                        } else {
                            console.log(`✅ Sample student ${index + 1} added`);
                        }
                    }
                );
            });
        }
    });
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Authentication required' });
    }
}

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));
app.use('/documents', express.static(documentsDir));

// Debug endpoint
app.get('/api/debug', (req, res) => {
    res.json({
        status: 'API is working!',
        database: 'Connected',
        timestamp: new Date().toISOString()
    });
});

// Get all data (public route)
app.get('/api/data', (req, res) => {
    console.log('📥 GET /api/data');
    
    const data = {
        bio: { bio: '', contact: '', profile_photo: '' },
        students: [],
        publications: [],
        research: [],
        notifications: [],
        documents: []
    };
    
    // Get professor profile
    db.get('SELECT bio, contact, profile_photo FROM professor_profile WHERE id = 1', (err, bioRow) => {
        if (err) {
            console.error('❌ Bio query error:', err.message);
        } else if (bioRow) {
            data.bio = bioRow;
            console.log('✅ Bio data loaded');
        }

        // Get students
        db.all('SELECT * FROM students ORDER BY name', (err, students) => {
            if (err) {
                console.error('❌ Students query error:', err.message);
            } else {
                data.students = students || [];
                console.log(`✅ ${data.students.length} students loaded`);
            }
            
            // Get publications
            db.all('SELECT * FROM publications ORDER BY year DESC, title', (err, publications) => {
                if (err) {
                    console.error('❌ Publications query error:', err.message);
                } else {
                    data.publications = publications || [];
                    console.log(`✅ ${data.publications.length} publications loaded`);
                }
                
                // Get research
                db.all('SELECT * FROM research_projects ORDER BY title', (err, research) => {
                    if (err) {
                        console.error('❌ Research query error:', err.message);
                    } else {
                        data.research = research || [];
                        console.log(`✅ ${data.research.length} research projects loaded`);
                    }
                    
                    // Get notifications
                    db.all('SELECT * FROM notifications WHERE is_active = 1 ORDER BY created_at DESC', (err, notifications) => {
                        if (err) {
                            console.error('❌ Notifications query error:', err.message);
                        } else {
                            data.notifications = notifications || [];
                            console.log(`✅ ${data.notifications.length} notifications loaded`);
                        }
                        
                        // Get documents
                        db.all('SELECT * FROM documents ORDER BY created_at DESC', (err, documents) => {
                            if (err) {
                                console.error('❌ Documents query error:', err.message);
                            } else {
                                data.documents = documents || [];
                                console.log(`✅ ${data.documents.length} documents loaded`);
                            }
                            
                            console.log('📤 Sending complete data to client');
                            res.json(data);
                        });
                    });
                });
            });
        });
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error('❌ Login database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user) {
            console.log('❌ Login failed: User not found');
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password_hash, (err, result) => {
            if (err) {
                console.error('❌ Password comparison error:', err);
                return res.status(500).json({ success: false, message: 'Authentication error' });
            }

            if (result) {
                req.session.userId = user.id;
                req.session.userEmail = user.email;
                req.session.userName = user.full_name;
                
                console.log('✅ Login successful for:', email);
                res.json({ 
                    success: true, 
                    message: 'Login successful',
                    user: { id: user.id, email: user.email, name: user.full_name }
                });
            } else {
                console.log('❌ Login failed: Invalid password for:', email);
                res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        });
    });
});

// Logout
app.post('/api/logout', requireAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Logout error:', err);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        
        console.log('✅ Logout successful');
        res.json({ success: true, message: 'Logout successful' });
    });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            success: true, 
            authenticated: true,
            user: {
                id: req.session.userId,
                email: req.session.userEmail,
                name: req.session.userName
            }
        });
    } else {
        res.json({ success: true, authenticated: false });
    }
});

// Update bio with file upload (protected)
app.post('/api/data/bio', requireAuth, upload.single('profile_photo'), (req, res) => {
    console.log('📝 POST /api/data/bio');
    const { bio, contact } = req.body;
    let profile_photo = null;

    if (req.file) {
        profile_photo = `/uploads/${req.file.filename}`;
        console.log('✅ New profile photo uploaded:', profile_photo);
    }

    db.run(
        'INSERT OR REPLACE INTO professor_profile (id, bio, contact, profile_photo) VALUES (1, ?, ?, ?)',
        [bio, contact, profile_photo],
        function(err) {
            if (err) {
                console.error('❌ Bio update error:', err);
                return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
            }
            
            console.log('✅ Bio updated successfully');
            res.json({ 
                success: true, 
                message: 'Bio updated successfully',
                profile_photo: profile_photo
            });
        }
    );
});

// Get professor bio
app.get('/api/data/bio', (req, res) => {
    db.get('SELECT bio, contact, profile_photo FROM professor_profile WHERE id = 1', (err, row) => {
        if (err) {
            console.error('❌ Bio fetch error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (row) {
            res.json({ success: true, bio: row });
        } else {
            res.json({ success: true, bio: { bio: '', contact: '', profile_photo: '' } });
        }
    });
});

// Student CRUD operations
app.post('/api/data/student', requireAuth, upload.single('profile_photo'), (req, res) => {
    console.log('👨‍🎓 POST /api/data/student', req.body);
    const { name, degree, type, research_focus, current_work } = req.body;
    let profile_photo = null;

    // Map the type to valid database values
    let validType = 'phd'; // default
    if (type === 'PhD' || type === 'PhD Student') validType = 'phd';
    else if (type === 'MSc' || type === 'MSc Student' || type === 'Masters') validType = 'masters';
    else if (type === 'BSc' || type === 'BSc Student') validType = 'bsc';
    else if (type === 'Postdoc' || type === 'Postdoctoral Fellow') validType = 'postdoc';
    else if (type === 'Alumni') validType = 'alumni';
    else validType = type.toLowerCase(); // fallback

    if (req.file) {
        profile_photo = `/uploads/${req.file.filename}`;
    }

    if (!name || !degree || !type) {
        return res.status(400).json({ success: false, message: 'Name, degree and type are required' });
    }

    db.run(
        'INSERT INTO students (name, degree, type, research_focus, current_work, profile_photo) VALUES (?, ?, ?, ?, ?, ?)',
        [name, degree, validType, research_focus || '', current_work || '', profile_photo],
        function(err) {
            if (err) {
                console.error('❌ Student add error:', err);
                return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
            }
            
            console.log(`✅ Student added: ${name} (ID: ${this.lastID})`);
            res.json({ 
                success: true, 
                message: 'Student added successfully',
                studentId: this.lastID
            });
        }
    );
});

// Update student with file upload
app.put('/api/data/student/:id', requireAuth, upload.single('profile_photo'), (req, res) => {
    const { id } = req.params;
    console.log('✏️ PUT /api/data/student/' + id, req.body);
    const { name, degree, type, research_focus, current_work } = req.body;
    
    // Map the type to valid database values
    let validType = 'phd'; // default
    if (type === 'PhD' || type === 'PhD Student') validType = 'phd';
    else if (type === 'MSc' || type === 'MSc Student' || type === 'Masters') validType = 'masters';
    else if (type === 'BSc' || type === 'BSc Student') validType = 'bsc';
    else if (type === 'Postdoc' || type === 'Postdoctoral Fellow') validType = 'postdoc';
    else if (type === 'Alumni') validType = 'alumni';
    else validType = type.toLowerCase(); // fallback

    // First get current student data
    db.get('SELECT * FROM students WHERE id = ?', [id], (err, student) => {
        if (err) {
            console.error('❌ Student fetch error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        let profile_photo = student.profile_photo; // Keep current photo by default

        if (req.file) {
            profile_photo = `/uploads/${req.file.filename}`;
            console.log('✅ New student photo uploaded:', profile_photo);
        }

        if (!name || !degree || !type) {
            return res.status(400).json({ success: false, message: 'Name, degree and type are required' });
        }

        db.run(
            'UPDATE students SET name = ?, degree = ?, type = ?, research_focus = ?, current_work = ?, profile_photo = ? WHERE id = ?',
            [name, degree, validType, research_focus || '', current_work || '', profile_photo, id],
            function(err) {
                if (err) {
                    console.error('❌ Student update error:', err);
                    return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
                }
                
                console.log(`✅ Student updated: ${name} (ID: ${id})`);
                res.json({ 
                    success: true, 
                    message: 'Student updated successfully'
                });
            }
        );
    });
});

// Get single student
app.get('/api/data/student/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM students WHERE id = ?', [id], (err, student) => {
        if (err) {
            console.error('❌ Student fetch error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        res.json({ success: true, student });
    });
});

// Delete student
app.delete('/api/data/student/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    console.log('🗑️ DELETE /api/data/student/' + id);

    db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Student delete error:', err);
            return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        console.log(`✅ Student deleted: ID ${id}`);
        res.json({ 
            success: true, 
            message: 'Student deleted successfully'
        });
    });
});

// Publication CRUD operations
app.post('/api/data/publication', requireAuth, upload.single('document'), (req, res) => {
    console.log('📄 POST /api/data/publication');
    const { title, details, year, link } = req.body;
    let document_path = null;

    if (req.file) {
        document_path = `/documents/${req.file.filename}`;
    }

    if (!title || !details || !year) {
        return res.status(400).json({ success: false, message: 'Title, details and year are required' });
    }

    db.run(
        'INSERT INTO publications (title, details, year, link, document_path) VALUES (?, ?, ?, ?, ?)',
        [title, details, year, link || '', document_path],
        function(err) {
            if (err) {
                console.error('❌ Publication add error:', err);
                return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
            }
            
            console.log(`✅ Publication added: ${title} (ID: ${this.lastID})`);
            res.json({ 
                success: true, 
                message: 'Publication added successfully'
            });
        }
    );
});

// Update publication
app.put('/api/data/publication/:id', requireAuth, upload.single('document'), (req, res) => {
    const { id } = req.params;
    console.log('✏️ PUT /api/data/publication/' + id);
    const { title, details, year, link } = req.body;
    
    db.get('SELECT * FROM publications WHERE id = ?', [id], (err, publication) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!publication) {
            return res.status(404).json({ success: false, message: 'Publication not found' });
        }

        let document_path = publication.document_path;

        if (req.file) {
            document_path = `/documents/${req.file.filename}`;
        }

        db.run(
            'UPDATE publications SET title = ?, details = ?, year = ?, link = ?, document_path = ? WHERE id = ?',
            [title, details, year, link || '', document_path, id],
            function(err) {
                if (err) {
                    console.error('❌ Publication update error:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                
                console.log(`✅ Publication updated: ${title} (ID: ${id})`);
                res.json({ 
                    success: true, 
                    message: 'Publication updated successfully'
                });
            }
        );
    });
});

// Get single publication
app.get('/api/data/publication/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM publications WHERE id = ?', [id], (err, publication) => {
        if (err) {
            console.error('❌ Publication fetch error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!publication) {
            return res.status(404).json({ success: false, message: 'Publication not found' });
        }
        
        res.json({ success: true, publication });
    });
});

// Delete publication
app.delete('/api/data/publication/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    console.log('🗑️ DELETE /api/data/publication/' + id);

    db.run('DELETE FROM publications WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Publication delete error:', err);
            return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Publication not found' });
        }
        
        console.log(`✅ Publication deleted: ID ${id}`);
        res.json({ 
            success: true, 
            message: 'Publication deleted successfully'
        });
    });
});

// Research CRUD operations
app.post('/api/data/research', requireAuth, upload.single('document'), (req, res) => {
    console.log('🔬 POST /api/data/research');
    const { title, description } = req.body;
    let document_path = null;

    if (req.file) {
        document_path = `/documents/${req.file.filename}`;
    }

    if (!title || !description) {
        return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    db.run(
        'INSERT INTO research_projects (title, description, document_path) VALUES (?, ?, ?)',
        [title, description, document_path],
        function(err) {
            if (err) {
                console.error('❌ Research add error:', err);
                return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
            }
            
            console.log(`✅ Research project added: ${title} (ID: ${this.lastID})`);
            res.json({ 
                success: true, 
                message: 'Research project added successfully'
            });
        }
    );
});

// Update research
app.put('/api/data/research/:id', requireAuth, upload.single('document'), (req, res) => {
    const { id } = req.params;
    console.log('✏️ PUT /api/data/research/' + id);
    const { title, description } = req.body;
    
    db.get('SELECT * FROM research_projects WHERE id = ?', [id], (err, research) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!research) {
            return res.status(404).json({ success: false, message: 'Research project not found' });
        }

        let document_path = research.document_path;

        if (req.file) {
            document_path = `/documents/${req.file.filename}`;
        }

        db.run(
            'UPDATE research_projects SET title = ?, description = ?, document_path = ? WHERE id = ?',
            [title, description, document_path, id],
            function(err) {
                if (err) {
                    console.error('❌ Research update error:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                
                console.log(`✅ Research project updated: ${title} (ID: ${id})`);
                res.json({ 
                    success: true, 
                    message: 'Research project updated successfully'
                });
            }
        );
    });
});

// Get single research
app.get('/api/data/research/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM research_projects WHERE id = ?', [id], (err, research) => {
        if (err) {
            console.error('❌ Research fetch error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!research) {
            return res.status(404).json({ success: false, message: 'Research project not found' });
        }
        
        res.json({ success: true, research });
    });
});

// Delete research project
app.delete('/api/data/research/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    console.log('🗑️ DELETE /api/data/research/' + id);

    db.run('DELETE FROM research_projects WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Research delete error:', err);
            return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Research project not found' });
        }
        
        console.log(`✅ Research project deleted: ID ${id}`);
        res.json({ 
            success: true, 
            message: 'Research project deleted successfully'
        });
    });
});

// Upload document
app.post('/api/upload/document', requireAuth, upload.single('document'), (req, res) => {
    console.log('📄 Document upload request');
    
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { title, description } = req.body;
    const filePath = `/documents/${req.file.filename}`;
    
    db.run(
        'INSERT INTO documents (title, description, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?)',
        [title, description, filePath, req.file.size, req.file.mimetype],
        function(err) {
            if (err) {
                console.error('❌ Document insert error:', err);
                return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
            }
            
            console.log(`✅ Document uploaded: ${title}`);
            res.json({ 
                success: true, 
                message: 'Document uploaded successfully',
                documentId: this.lastID
            });
        }
    );
});

// Notifications endpoints
app.get('/api/notifications', (req, res) => {
    db.all('SELECT * FROM notifications WHERE is_active = 1 ORDER BY created_at DESC', (err, notifications) => {
        if (err) {
            console.error('❌ Notifications fetch error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, notifications: notifications || [] });
    });
});

app.post('/api/notifications', requireAuth, (req, res) => {
    const { title, message, type } = req.body;
    
    if (!title || !message) {
        return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    db.run(
        'INSERT INTO notifications (title, message, type, is_active) VALUES (?, ?, ?, 1)',
        [title, message, type || 'info'],
        function(err) {
            if (err) {
                console.error('❌ Notification add error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            console.log(`✅ Notification added: ${title}`);
            res.json({ 
                success: true, 
                message: 'Notification added successfully',
                notificationId: this.lastID
            });
        }
    );
});

app.delete('/api/notifications/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.run('UPDATE notifications SET is_active = 0 WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Notification delete error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        console.log(`✅ Notification deleted: ID ${id}`);
        res.json({ 
            success: true, 
            message: 'Notification deleted successfully'
        });
    });
});

// Documents endpoints
app.get('/api/documents', (req, res) => {
    db.all('SELECT * FROM documents ORDER BY created_at DESC', (err, documents) => {
        if (err) {
            console.error('❌ Documents fetch error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, documents: documents || [] });
    });
});

app.delete('/api/documents/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT file_path FROM documents WHERE id = ?', [id], (err, doc) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (doc && doc.file_path) {
            const filePath = path.join(__dirname, doc.file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        db.run('DELETE FROM documents WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('❌ Document delete error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            console.log(`✅ Document deleted: ID ${id}`);
            res.json({ 
                success: true, 
                message: 'Document deleted successfully'
            });
        });
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        database: 'Connected',
        timestamp: new Date().toISOString()
    });
});

// Serve website.html as the default page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'website.html'));
});

// Serve admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    console.log(`❌ API 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        success: false, 
        message: 'API endpoint not found',
        requested: `${req.method} ${req.originalUrl}`
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
        }
    }
    console.error('❌ Server error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log('🌐 Website: http://localhost:3000');
    console.log('🔒 Admin: http://localhost:3000/admin');
    console.log('🐛 Debug: http://localhost:3000/api/debug');
    console.log('❤️ Health: http://localhost:3000/api/health');
    console.log('📊 Login: Wmbinda / Mbinda@2025');
    console.log('\n💡 Make sure to install dependencies: npm install multer express-session connect-sqlite3 bcryptjs\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('❌ Database close error:', err.message);
        } else {
            console.log('✅ Database connection closed.');
        }
        process.exit(0);
    });
});