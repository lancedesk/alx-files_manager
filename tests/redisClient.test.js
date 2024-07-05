const { expect } = require('chai');
const redisClient = require('../utils/redis');

describe('Redis Client Tests', function() {
    it('should correctly set and get values from Redis', async function() {
        // Set a value in Redis
        await redisClient.set('test_key', 'test_value');

        // Get the value from Redis
        const result = await redisClient.get('test_key');

        expect(result).to.equal('test_value');
    });

    it('should return null for non-existent keys', async function() {
        // Get a non-existent key from Redis
        const result = await redisClient.get('non_existent_key');

        expect(result).to.be.null;
    });
});
