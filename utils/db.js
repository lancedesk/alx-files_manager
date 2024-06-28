// Import MongoDB module
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables from a .env file if present
dotenv.config();

// DBClient class definition
class DBClient {
    constructor() {
        // MongoDB connection parameters
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';
        const url = `mongodb://${host}:${port}`;
        
        // Create MongoDB client and connect
        this.client = new MongoClient(url, { useUnifiedTopology: true });
        this.client.connect((err) => {
            if (err) {
                console.error('MongoDB client connection error:', err);
            } else {
                this.db = this.client.db(database);
                console.log('Connected to MongoDB');
            }
        });
    }

    // Function to check if MongoDB connection is alive
    isAlive() {
        return this.client && this.client.isConnected();
    }

    // Asynchronous function to count documents in the 'users' collection
    async nbUsers() {
        const usersCollection = this.db.collection('users');
        return usersCollection.countDocuments();
    }

    // Asynchronous function to count documents in the 'files' collection
    async nbFiles() {
        const filesCollection = this.db.collection('files');
        return filesCollection.countDocuments();
    }
}

// Export an instance of DBClient
const dbClient = new DBClient();
module.exports = dbClient;
