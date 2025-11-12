const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// MongoDB connection
const MONGODB_URL = 'mongodb+srv://henrykiema47:Henry1441@cluster0.a8qyrnm.mongodb.net/prof_mbinda?retryWrites=true&w=majority';

// Connect to MongoDB
let isConnected = false;
let connectionPromise = null;

async function connectDB() {
    if (isConnected) return;
    
    if (connectionPromise) {
        return connectionPromise;
    }
    
    connectionPromise = mongoose.connect(MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then((conn) => {
        isConnected = true;
        console.log('✅ Connected to MongoDB Atlas!');
        return conn;
    }).catch(err => {
        console.error('❌ MongoDB error:', err.message);
        connectionPromise = null;
        throw err;
    });
    
    return connectionPromise;
}

// Schemas
const userSchema = new mongoose.Schema({
    email: String, password_hash: String, full_name: String, created_at: { type: Date, default: Date.now }
});
const profileSchema = new mongoose.Schema({
    bio: String, contact: String, profile_photo: String, updated_at: { type: Date, default: Date.now }
});
const studentSchema = new mongoose.Schema({
    name: String, degree: String, type: String, research_focus: String, current_work: String, profile_photo: String, created_at: { type: Date, default: Date.now }
});
const publicationSchema = new mongoose.Schema({
    title: String, details: String, year: Number, link: String, document_path: String, created_at: { type: Date, default: Date.now }
});
const researchSchema = new mongoose.Schema({
    title: String, description: String, document_path: String, created_at: { type: Date, default: Date.now }
});
const notificationSchema = new mongoose.Schema({
    title: String, message: String, type: String, is_active: Boolean, created_at: { type: Date, default: Date.now }
});
const documentSchema = new mongoose.Schema({
    title: String, description: String, file_path: String, file_size: Number, file_type: String, created_at: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Profile = mongoose.model('Profile', profileSchema);
const Student = mongoose.model('Student', studentSchema);
const Publication = mongoose.model('Publication', publicationSchema);
const Research = mongoose.model('Research', researchSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Document = mongoose.model('Document', documentSchema);

// Initialize data
async function initializeData() {
    if (await User.countDocuments() === 0) {
        const hash = await bcrypt.hash('Admin@2025', 12);
        await User.create({ email: 'admin@mbindalab.com', password_hash: hash, full_name: 'Administrator' });
        console.log('✅ Admin user created: admin@mbindalab.com / Admin@2025');
    }
    if (await Profile.countDocuments() === 0) {
        await Profile.create({ bio: '', contact: '', profile_photo: '' });
        console.log('✅ Profile created');
    }
}

// Session simulation (using JWT-like approach for serverless)
const sessions = new Map();

function createSession(user) {
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const session = {
        id: sessionId,
        userId: user._id.toString(),
        userEmail: user.email,
        userName: user.full_name,
        createdAt: new Date()
    };
    sessions.set(sessionId, session);
    
    // Clean up old sessions (basic implementation)
    const now = Date.now();
    for (let [id, sess] of sessions.entries()) {
        if (now - sess.createdAt.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
            sessions.delete(id);
        }
    }
    
    return sessionId;
}

function getSession(sessionId) {
    return sessions.get(sessionId);
}

function destroySession(sessionId) {
    sessions.delete(sessionId);
}

// Auth middleware for serverless
function requireAuth(request) {
    const sessionId = request.headers['x-session-id'];
    if (!sessionId || !getSession(sessionId)) {
        throw new Error('Authentication required');
    }
    return getSession(sessionId);
}

// Main handler
exports.handler = async function(event, context) {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Connect to database
        await connectDB();
        
        const path = event.path.replace('/.netlify/functions/api', '');
        const method = event.httpMethod;
        
        console.log(`Processing: ${method} ${path}`);
        
        // Route handling
        if (path === '/health' && method === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    status: 'OK', 
                    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' 
                })
            };
        }
        
        if (path === '/data' && method === 'GET') {
            const [bio, students, publications, research, notifications, documents] = await Promise.all([
                Profile.findOne(),
                Student.find().sort({ name: 1 }),
                Publication.find().sort({ year: -1 }),
                Research.find().sort({ title: 1 }),
                Notification.find({ is_active: true }).sort({ created_at: -1 }),
                Document.find().sort({ created_at: -1 })
            ]);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    bio: bio || {}, 
                    students, 
                    publications, 
                    research, 
                    notifications, 
                    documents 
                })
            };
        }
        
        if (path === '/login' && method === 'POST') {
            const { email, password } = JSON.parse(event.body);
            
            if (!email || !password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Email and password required' })
                };
            }

            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user || !await bcrypt.compare(password, user.password_hash)) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Invalid credentials' })
                };
            }
            
            const sessionId = createSession(user);
            
            return {
                statusCode: 200,
                headers: {
                    ...headers,
                    'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=86400`
                },
                body: JSON.stringify({ 
                    success: true, 
                    message: 'Login successful', 
                    user: { 
                        id: user._id, 
                        email: user.email, 
                        name: user.full_name 
                    },
                    sessionId 
                })
            };
        }
        
        if (path === '/logout' && method === 'POST') {
            const sessionId = event.headers['x-session-id'];
            if (sessionId) {
                destroySession(sessionId);
            }
            
            return {
                statusCode: 200,
                headers: {
                    ...headers,
                    'Set-Cookie': 'sessionId=; HttpOnly; Path=/; Max-Age=0'
                },
                body: JSON.stringify({ success: true, message: 'Logout successful' })
            };
        }
        
        if (path === '/auth/status' && method === 'GET') {
            const sessionId = event.headers['x-session-id'];
            const session = sessionId ? getSession(sessionId) : null;
            
            if (session) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        authenticated: true, 
                        user: { 
                            id: session.userId, 
                            email: session.userEmail, 
                            name: session.userName 
                        } 
                    })
                };
            } else {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ authenticated: false })
                };
            }
        }
        
        // Protected routes
        if (path === '/data/bio' && method === 'POST') {
            try {
                const session = requireAuth(event);
                const { bio, contact, profile_photo } = JSON.parse(event.body);
                
                await Profile.findOneAndUpdate({}, { bio, contact, profile_photo }, { upsert: true });
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Bio updated' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path === '/data/student' && method === 'POST') {
            try {
                const session = requireAuth(event);
                const { name, degree, type, research_focus, current_work, profile_photo } = JSON.parse(event.body);
                
                const student = await Student.create({ name, degree, type, research_focus, current_work, profile_photo });
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Student added', studentId: student._id })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path.startsWith('/data/student/') && method === 'PUT') {
            try {
                const session = requireAuth(event);
                const id = path.split('/').pop();
                const { name, degree, type, research_focus, current_work, profile_photo } = JSON.parse(event.body);
                
                await Student.findByIdAndUpdate(id, { name, degree, type, research_focus, current_work, profile_photo });
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Student updated' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path.startsWith('/data/student/') && method === 'DELETE') {
            try {
                const session = requireAuth(event);
                const id = path.split('/').pop();
                
                await Student.findByIdAndDelete(id);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Student deleted' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path === '/data/publication' && method === 'POST') {
            try {
                const session = requireAuth(event);
                const { title, details, year, link } = JSON.parse(event.body);
                
                await Publication.create({ title, details, year, link });
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Publication added' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path.startsWith('/data/publication/') && method === 'PUT') {
            try {
                const session = requireAuth(event);
                const id = path.split('/').pop();
                const { title, details, year, link } = JSON.parse(event.body);
                
                await Publication.findByIdAndUpdate(id, { title, details, year, link });
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Publication updated' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path.startsWith('/data/publication/') && method === 'DELETE') {
            try {
                const session = requireAuth(event);
                const id = path.split('/').pop();
                
                await Publication.findByIdAndDelete(id);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Publication deleted' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path === '/data/research' && method === 'POST') {
            try {
                const session = requireAuth(event);
                const { title, description } = JSON.parse(event.body);
                
                await Research.create({ title, description });
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Research added' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path.startsWith('/data/research/') && method === 'PUT') {
            try {
                const session = requireAuth(event);
                const id = path.split('/').pop();
                const { title, description } = JSON.parse(event.body);
                
                await Research.findByIdAndUpdate(id, { title, description });
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Research updated' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path.startsWith('/data/research/') && method === 'DELETE') {
            try {
                const session = requireAuth(event);
                const id = path.split('/').pop();
                
                await Research.findByIdAndDelete(id);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Research deleted' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path === '/notifications' && method === 'POST') {
            try {
                const session = requireAuth(event);
                const { title, message, type } = JSON.parse(event.body);
                
                await Notification.create({ title, message, type: type || 'info', is_active: true });
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Notification added' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        if (path.startsWith('/notifications/') && method === 'DELETE') {
            try {
                const session = requireAuth(event);
                const id = path.split('/').pop();
                
                await Notification.findByIdAndDelete(id);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Notification deleted' })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        // File upload endpoint - store base64 directly
        if (path === '/upload' && method === 'POST') {
            try {
                const session = requireAuth(event);
                const { image, filename } = JSON.parse(event.body);
                
                if (!image) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ success: false, message: 'No image provided' })
                    };
                }
                
                // Create data URL from base64
                const fileUrl = `data:image/jpeg;base64,${image}`;
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        success: true, 
                        message: 'File uploaded successfully',
                        url: fileUrl
                    })
                };
            } catch (authError) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Authentication required' })
                };
            }
        }
        
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, message: 'Endpoint not found' })
        };
        
    } catch (error) {
        console.error('Error:', error);
        
        if (error.message === 'Authentication required') {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ success: false, message: 'Login required' })
            };
        }
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Server error: ' + error.message })
        };
    }
};
