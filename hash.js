const bcrypt = require('bcryptjs');

// IMPORTANT: Use the synchronous function hashSync() for this purpose
const plainPassword = 'adminpassword123'; // CHANGE THIS TO YOUR DESIRED TEMPORARY PASSWORD
const saltRounds = 10;

try {
    // 1. Generate the hash synchronously
    const hash = bcrypt.hashSync(plainPassword, saltRounds);
    
    // 2. Log the hash immediately
    console.log('\n--- Copy this hash and paste it into server.js: ---');
    console.log(hash);
    console.log('-----------------------------------------------------\n');

} catch (error) {
    console.error('Error hashing password:', error);
}