// Import necessary modules
import UserCollection from '../utils/users';
import redisClient from '../utils/redis';
import mongodb from 'mongodb';
import Queue from 'bull';
import sha1 from 'sha1';

const usersQue = new Queue('Welcome Email');


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

    const user = await UserCollection.findOne({ email });

    if (user) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const userId = await UserCollection.createUser({
      email,
      password: sha1(password),
    });

    usersQue.add({ userId });

    return res.status(201).json({ id: userId, email });
  }

  // GET /users/me endpoint
  static async getMe(req, res) {
    const token = req.headers['x-token'];
    const id = token ? await redisClient.get(`auth_${token}`) : null;

    if (!id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await UserCollection.getUser({
      _id: mongodb.ObjectId(id),
    });

    return res.status(200).json({ id, email: user[0].email });
  }
}

// Export the UsersController
module.exports = UsersController;
export default UsersController;
