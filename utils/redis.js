// Import Redis module
const redis = require('redis');

// RedisClient class definition
class RedisClient {
    constructor() {
        // Create a Redis client
        this.client = redis.createClient();

        // Handle Redis client errors
        this.client.on('error', (err) => {
            console.error('Redis client error:', err);
        });
    }

    // Function to check if Redis connection is alive
    isAlive() {
        return this.client.connected;
    }

    // Asynchronous function to get value from Redis based on key
    async get(key) {
        return new Promise((resolve, reject) => {
            this.client.get(key, (err, reply) => {
                if (err) {
                    console.error('Redis GET error:', err);
                    resolve(null);
                } else {
                    resolve(reply);
                }
            });
        });
    }

    // Asynchronous function to set value in Redis with expiration
    async set(key, value, durationSeconds) {
        return new Promise((resolve, reject) => {
            this.client.set(key, value, 'EX', durationSeconds, (err, reply) => {
                if (err) {
                    console.error('Redis SET error:', err);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    // Asynchronous function to delete value from Redis based on key
    async del(key) {
        return new Promise((resolve, reject) => {
            this.client.del(key, (err, reply) => {
                if (err) {
                    console.error('Redis DEL error:', err);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }
}

// Export an instance of RedisClient
const redisClient = new RedisClient();
module.exports = redisClient;
