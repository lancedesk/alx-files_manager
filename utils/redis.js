import { createClient } from 'redis';
import { promisify } from 'util';


// RedisClient class definition
class RedisClient {
  constructor() {
    // Create a Redis client
    this.client = createClient();

    // Handle Redis client errors
    this.client.on('error', (error) => {
      console.log(error.message);
    });
  }

  // Function to check if Redis connection is alive
  isAlive() {
    if (this.client.ready) {
      return true;
    }
    return false;
  }

  // Asynchronous function to get value from Redis based on key
  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    const value = await getAsync(key);
    return value;
  }

  // Asynchronous function to set value in Redis with expiration
  async set(key, value, duration) {
    const setAsync = promisify(this.client.set).bind(this.client);
    await setAsync(key, value, 'EX', duration);
  }

  // Asynchronous function to delete value from Redis based on key
  async del(key) {
    const delAsync = promisify(this.client.del).bind(this.client);
    await delAsync(key);
  }
}

// Export an instance of RedisClient
const redisClient = new RedisClient();
module.exports = redisClient;
export default redisClient;
