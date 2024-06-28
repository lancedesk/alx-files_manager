// Import necessary modules
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const crypto = require('crypto');

// UsersController class definition
class UsersController {
    // POST /users endpoint
    static async postNew(req, res) {
        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Missing email' });
        }

        if (!password) {
            return res.status(400).json({ error: 'Missing password' });
        }

        const usersCollection = dbClient.db.collection('users');
        const existingUser = await usersCollection.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ error: 'Already exist' });
        }

        const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
        const newUser = await usersCollection.insertOne({ email: email, password: hashedPassword });

        return res.status(201).json({ id: newUser.insertedId, email: email });
    }

    // GET /users/me endpoint
    static async getMe(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const tokenKey = `auth_${token}`;
        const userId = await redisClient.get(tokenKey);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const usersCollection = dbClient.db.collection('users');
        const user = await usersCollection.findOne({ _id: dbClient.ObjectId(userId) });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        return res.status(200).json({ id: user._id, email: user.email });
    }
}

// Export the UsersController
module.exports = UsersController;
