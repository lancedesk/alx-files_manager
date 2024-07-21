/* eslint-disable jest/prefer-expect-assertions, jest/valid-expect */
import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

chai.use(chaiHttp);

const { expect } = chai;

describe('appController', () => {
  describe('getStatus', () => {
    it('should return 200', async () => {
      const response = await chai.request(app).get('/status');
      expect(response.body).to.have.all.keys('redis', 'db');
      expect(response.body).to.deep.equal({
        db: dbClient.isAlive(),
        redis: redisClient.isAlive(),
      });
      expect(response.status).to.equal(200);
    });
  });
  describe('getStats', () => {
    it('should return 200', async () => {
      const response = await chai.request(app).get('/stats');
      expect(response.body).to.have.all.keys('users', 'files');
      expect(response.body).to.deep.equal({
        users: await dbClient.nbUsers(),
        files: await dbClient.nbFiles(),
      });
      expect(response.status).to.equal(200);
    });
  });
});
