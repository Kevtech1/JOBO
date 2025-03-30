const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = 'mongodb://localhost:27017';
const dbName = 'Jobo'; // Keep the original database name

// Create a new MongoClient
const client = new MongoClient(uri);

// Function to connect to MongoDB
async function connectDB() {
    try {
        // Connect to MongoDB
        await client.connect();
        console.log('Connected to MongoDB successfully');

        // Get the database
        const database = client.db(dbName);
        
        // Test the connection by listing collections
        const collections = await database.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));

        return database;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

// Export the connection function
module.exports = connectDB; 