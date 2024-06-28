// Import necessary modules
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

// AppController class definition
class AppController {
    // GET /status endpoint
    static getStatus(req, res) {
        res.status(200).json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
    }

    // GET /stats endpoint
    static async getStats(req, res) {
        const users = await dbClient.nbUsers();
        const files = await dbClient.nbFiles();
        res.status(200).json({ users: users, files: files });
    }
}

// Export the AppController
module.exports = AppController;
