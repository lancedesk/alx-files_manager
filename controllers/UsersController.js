// Import necessary modules
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const userQueue = require('../worker');
const bcrypt = require('bcrypt');

// UsersController class definition
class UsersController {
    // POST /users endpoint
    static async postNew(req, res) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        const usersCollection = dbClient.db.collection('users');
        const existingUser = await usersCollection.findOne({ email: email });
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10
            const newUser = await usersCollection.insertOne({ email: email, password: hashedPassword });
            return res.status(201).json({ id: newUser.insertedId, email: email });
        } catch (error) {
            console.error('Error creating user:', error);
            return res.status(500).json({ error: 'Server error' });
        }
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
        try {
            const user = await usersCollection.findOne({ _id: dbClient.ObjectId(userId) });
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            return res.status(200).json({ id: user._id, email: user.email });
        } catch (error) {
            console.error('Error retrieving user:', error);
            return res.status(500).json({ error: 'Server error' });
        }
    }

    // POST /users endpoint to add user and send welcome email asynchronously
    static async postUser(req, res) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10
            const newUser = {
                email,
                password: hashedPassword,
            };

            const result = await dbClient.db.collection('users').insertOne(newUser);
            const userId = result.insertedId;

            // Add job to userQueue to send welcome email
            userQueue.add({ userId });

            return res.status(201).json({
                id: userId,
                email,
            });
        } catch (error) {
            console.error('Error creating user:', error);
            return res.status(500).json({ error: 'Server error' });
        }
    }
}

// Export the UsersController
module.exports = UsersController;
