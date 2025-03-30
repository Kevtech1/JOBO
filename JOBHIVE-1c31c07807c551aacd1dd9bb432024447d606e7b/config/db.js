const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'Jobo';

let db = null;

async function connectDB() {
    try {
        console.log('Attempting to connect to MongoDB...');
        const client = await MongoClient.connect(url);
        db = client.db(dbName);
        console.log('Connected to MongoDB successfully');
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        throw error;
    }
}

module.exports = connectDB; 