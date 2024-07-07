// Import MongoDB module
import { MongoClient } from 'mongodb';


const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.BD_PORT || 27017;
const DATABASE = process.env.DB_DATABASE || 'files_manager';
const URI = `mongodb://${HOST}:${PORT}`;

class DBClient {
  // DBClient
  constructor() {
    this.mongoClient = new MongoClient(URI, { useUnifiedTopology: true });
    this.mongoClient.connect((error) => {
      if (!error) this.db = this.mongoClient.db(DATABASE);
    });
  }

  //Function to check if MongoDB connection is alive
  isAlive() {
    return this.mongoClient.isConnected();
  }

  // Collection retriever
  getCollection(collectionName) {
    const collection = this.db.collection(collectionName);
    return collection;
  }

  // Asynchronous function to count documents in the 'users' collection
  async nbUsers() {
    const usersCollection = this.getCollection('users');
    const numberOfUsers = await usersCollection.countDocuments();
    return numberOfUsers;
  }

  // Asynchronous function to count documents in the 'files' collection
  async nbFiles() {
    const filesCollection = this.getCollection('files');
    const numberOfFiles = await filesCollection.countDocuments();
    return numberOfFiles;
  }

  // Close database connection
  async close() {
    await this.mongoClient.close();
  }
}

// Export an instance of DBClient
const dbClient = new DBClient();
export default dbClient;
