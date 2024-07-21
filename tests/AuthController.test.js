/* eslint-disable jest/prefer-expect-assertions, jest/valid-expect */
/* eslint-disable no-undef, no-unused-expressions */
import chai from 'chai';
import chaiHttp from 'chai-http';
import sha1 from 'sha1';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { promisify } from 'util';
import { v4 } from 'uuid';
import app from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('authController.js tests', () => {
  let dbClient;
  let db;
  let rdClient;
  let asyncSet;
  let asyncGet;
  let asyncDel;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.BD_PORT || 27017;
  const database = process.env.DB_DATABASE || 'files_manager';
  const password = 'test';
  const hashedPassword = sha1(password);
  const user = {
    email: 'test',
    password: hashedPassword,
  };
  const token = v4();

  before(
    () => new Promise((resolve) => {
      // Connect to db and clear collections
      dbClient = new MongoClient(`mongodb://${host}:${port}`, {
        useUnifiedTopology: true,
      });
      dbClient.connect(async (error, client) => {
        if (error) throw error;
        db = await client.db(database);
        await db.collection('users').deleteMany({});

        // Create new user
        const commandResults = await db.collection('users').insertOne(user);

        // Connect to redis and clear keys
        rdClient = createClient();
        asyncSet = promisify(rdClient.set).bind(rdClient);
        asyncGet = promisify(rdClient.keys).bind(rdClient);
        asyncDel = promisify(rdClient.del).bind(rdClient);
        rdClient.on('connect', async () => {
          await asyncSet(
            `auth_${token}`,
            commandResults.insertedId.toString(),
          );
          resolve();
        });
      });
    }),
  );

  after(async () => {
    // Clear db collections
    await db.collection('users').deleteMany({});
    await dbClient.close();

    // Clear redis keys and close connection
    const tokens = await asyncGet('auth_*');
    const deleteKeysOperations = [];
    for (const key of tokens) {
      deleteKeysOperations.push(asyncDel(key));
    }
    await Promise.all(deleteKeysOperations);
    rdClient.quit();
  });

  describe('gET /connect', () => {
    it('should login user and return token', async () => {
      const res = await chai
        .request(app)
        .get('/connect')
        .auth(user.email, password);
      expect(res).to.have.status(200);
      expect(res.body.token).to.be.a('string');
    });

    it('should return unauthorized email is missing', async () => {
      const res = await chai
        .request(app)
        .get('/connect')
        .auth('', user.password);

      expect(res).to.have.status(401);
      expect(res.body.error).to.equal('Unauthorized');
    });

    it('should return unauthorized password is missing', async () => {
      const res = await chai.request(app).get('/connect').auth(user.email);

      expect(res).to.have.status(401);
      expect(res.body.error).to.equal('Unauthorized');
    });

    it('should return unauthorized when credentials are missing', async () => {
      const res = await chai.request(app).get('/connect');

      expect(res).to.have.status(401);
      expect(res.body.error).to.equal('Unauthorized');
    });

    it('should return unauthorized when credentials are incorrect', async () => {
      const email1 = 'test1';
      const password1 = 'test1';
      const res = await chai
        .request(app)
        .get('/connect')
        .auth(email1, password1);

      expect(res).to.have.status(401);
      expect(res.body.error).to.equal('Unauthorized');
    });
  });

  describe('gET /users/me', () => {
    it('should return details of a user with valid token', async () => {
      const res = await chai
        .request(app)
        .get('/users/me')
        .set('X-Token', token);

      expect(res).to.have.status(200);
      expect(res.body.id).is.a('string');
      expect(res.body.email).to.equal(user.email);
      expect(res.body.password).to.equal(undefined);
    });

    it('should return unauthorized with wrong token', async () => {
      const res = await chai.request(app).get('/users/me').set('X-Token', v4());

      expect(res).to.have.status(401);
      expect(res.body.error).to.equal('Unauthorized');
    });
  });

  describe('gET /disconnect', () => {
    it('should logout user from the system', async () => {
      const res = await chai
        .request(app)
        .get('/disconnect')
        .set('X-Token', token);

      expect(res).to.have.status(204);
      expect(res.body).to.deep.equal({});
    });

    it('should prevent authorization using logged out token', async () => {
      const res = await chai.request(app).get('/connect').set('X-Token', token);

      expect(res).to.have.status(401);
      expect(res.body.error).to.deep.equal('Unauthorized');
    });
  });
});
