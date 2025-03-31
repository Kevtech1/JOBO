const bcrypt = require('bcryptjs');

// Admin credentials
const adminCredentials = {
    username: 'admin',
    email: 'kavata1723@gmail.com',
    password: 'Kavata*1723', // This is the plain password that will be hashed
    role: 'admin'
};

// Function to hash password
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
}

// Function to create admin document
async function createAdminDocument() {
    try {
        const hashedPassword = await hashPassword(adminCredentials.password);
        
        const adminDocument = {
            username: adminCredentials.username,
            email: adminCredentials.email,
            password: hashedPassword,
            role: adminCredentials.role,
            createdAt: new Date(),
            lastLogin: null
        };

        console.log('Admin document created successfully:');
        console.log(JSON.stringify(adminDocument, null, 2));
        
        return adminDocument;
    } catch (error) {
        console.error('Error creating admin document:', error);
        throw error;
    }
}

// Function to verify password
async function verifyPassword(plainPassword, hashedPassword) {
    try {
        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        return isMatch;
    } catch (error) {
        console.error('Error verifying password:', error);
        throw error;
    }
}

// Export functions
module.exports = {
    createAdminDocument,
    verifyPassword,
    adminCredentials
}; 