const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

// MongoDB connection URI
const uri = 'mongodb://localhost:27017';
const dbName = 'Jobo';

async function createAdmin() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(dbName);

        // Create admins collection if it doesn't exist
        await db.createCollection('admins').catch(() => {});

        // Check if admin already exists
        const existingAdmin = await db.collection('admins').findOne({ email: 'kavata1723@gmail.com' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('Kavata*1723', 10);

        // Create admin document
        const adminDoc = {
            email: 'kavata1723@gmail.com',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date()
        };

        // Insert admin document
        const result = await db.collection('admins').insertOne(adminDoc);
        console.log('Admin user created successfully:', result.insertedId);

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the script
createAdmin(); 