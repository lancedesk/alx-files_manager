/* eslint-disable jest/prefer-expect-assertions, jest/valid-expect */
/* eslint-disable no-undef, no-unused-expressions */
import chai from 'chai';
import chaiHttp from 'chai-http';
import { MongoClient } from 'mongodb';
import app from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('userController', () => {
  let db;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.BD_PORT || 27017;
  const dataBase = process.env.DB_DATABASE || 'files_manager';
  const user = { email: 'test', password: 'test' };

  before(() => {
    const dbClient = new MongoClient(`mongodb://${host}:${port}`, {
      useUnifiedTopology: true,
    });
    dbClient.connect(async (error, client) => {
      if (error) throw error;
      db = await client.db(dataBase);
      await db.collection('users').deleteMany({});
    });
  });

  after(async () => {
    await db.collection('users').deleteMany({});
  });

  describe('pOST /users', () => {
    it('should create a new a new user', async () => {
      const res = await chai.request(app).post('/users').send(user);
      expect(res).to.have.status(201);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('email');
      expect(res.body.email).to.equal(user.email);
    });
  });
});
