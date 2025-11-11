const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// Test all possible endpoint variations
app.post('/api/data/student', (req, res) => {
    console.log('✅ SUCCESS: Reached /api/data/student');
    res.json({ success: true, message: 'Student endpoint working!' });
});

app.post('/api/student', (req, res) => {
    console.log('✅ SUCCESS: Reached /api/student');
    res.json({ success: true, message: 'Alternative student endpoint working!' });
});

app.post('/student', (req, res) => {
    console.log('✅ SUCCESS: Reached /student');
    res.json({ success: true, message: 'Simple student endpoint working!' });
});

// Catch all other routes
app.all('*', (req, res) => {
    console.log(`📨 Received: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        error: 'Not found',
        received: `${req.method} ${req.originalUrl}`,
        available: ['POST /api/data/student', 'POST /api/student', 'POST /student']
    });
});

app.listen(PORT, () => {
    console.log(`🔬 Test server running on http://localhost:${PORT}`);
    console.log('📝 Test by visiting: http://localhost:3000/api/data/student');
});