// Import necessary modules
const crypto = require('crypto');
const dbClient = require('../utils/db');

// UsersController class definition
class UsersController {
    // POST /users endpoint
    static async postNew(req, res) {
        const { email, password } = req.body;

        // Check if email is provided
        if (!email) {
            return res.status(400).json({ error: 'Missing email' });
        }

        // Check if password is provided
        if (!password) {
            return res.status(400).json({ error: 'Missing password' });
        }

        // Check if email already exists in DB
        const usersCollection = dbClient.db.collection('users');
        const existingUser = await usersCollection.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ error: 'Already exist' });
        }

        // Hash the password using SHA1
        const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

        // Insert the new user into the users collection
        const newUser = await usersCollection.insertOne({
            email: email,
            password: hashedPassword
        });

        // Return the new user with only the email and id
        return res.status(201).json({ id: newUser.insertedId, email: email });
    }
}

// Export the UsersController
module.exports = UsersController;
