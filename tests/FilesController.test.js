/* eslint-disable jest/prefer-expect-assertions, jest/valid-expect */
/* eslint-disable no-undef, no-unused-expressions, jest/no-hooks */
import fs from 'fs';
import path from 'path';
import chai from 'chai';
import chaiHttp from 'chai-http';
import sha1 from 'sha1';
import { ObjectId, MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { promisify } from 'util';
import { v4 } from 'uuid';
import app from '../server';

chai.use(chaiHttp);

const { expect } = chai;

let dbClient;
let db;
let rdClient;
let asyncSet;
let asyncGet;
let asyncDel;
const host = process.env.DB_HOST || 'localhost';
const port = process.env.BD_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const MAX_PAGE_SIZE = 20;
const hashedPassword = sha1('test');

describe('fileController.js tests - File info and data retrieval endpoints', () => {
  const userOne = {
    _id: new ObjectId(),
    email: 'test',
    password: hashedPassword,
  };
  const userTwo = {
    _id: new ObjectId(),
    email: 'dev@mail.com',
    password: hashedPassword,
  };
  const userOneToken = v4();
  const userTwoToken = v4();
  const userOneTokenKey = `auth_${userOneToken}`;
  const userTwoTokenKey = `auth_${userTwoToken}`;

  const folders = [];
  const files = [];

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

        // Create test user
        await db.collection('users').insertMany([userOne, userTwo]);

        // Add files to db
        for (let i = 0; i < 10; i += 1) {
          const newFolder = {
            _id: new ObjectId(),
            name: `folder${i}`,
            type: 'folder',
            parentId: '0',
            userId: userOne._id,
            isPublic: !!(i % 2),
          };
          folders.push(newFolder);
        }
        for (let i = 0; i < 25; i += 1) {
          const newFile = {
            _id: new ObjectId(),
            name: `file${i}.txt`,
            type: 'file',
            parentId: folders[0]._id,
            userId: userOne._id,
            isPublic: !!(i % 2),
            localPath: path.join(FOLDER_PATH, v4()),
          };
          files.push(newFile);
        }
        await db.collection('files').insertMany(folders);
        await db.collection('files').insertMany(files);

        // Write data for testing
        const publicFile = files.find((file) => file.isPublic === true);
        const privateFile = files.find((file) => file.isPublic === false);
        const publicData = 'water is good';
        const privateData = 'private data';
        if (!fs.existsSync(FOLDER_PATH)) {
          fs.mkdirSync(FOLDER_PATH);
        }
        fs.writeFileSync(publicFile.localPath, publicData);
        fs.writeFileSync(privateFile.localPath, privateData);

        // Connect to redis and set authentication tokens
        rdClient = createClient();
        asyncSet = promisify(rdClient.set).bind(rdClient);
        asyncGet = promisify(rdClient.keys).bind(rdClient);
        asyncDel = promisify(rdClient.del).bind(rdClient);
        rdClient.on('connect', async () => {
          await asyncSet(userOneTokenKey, userOne._id.toString());
          await asyncSet(userTwoTokenKey, userTwo._id.toString());
          resolve();
        });
      });
    }),
  );

  after(async () => {
    // Delete files
    fs.rmdirSync(FOLDER_PATH, { recursive: true });

    // Clear db collections
    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
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

  describe('gET /files:id', () => {
    it('should return file details given valid token and user id', async () => {
      const file = files[0];
      const res = await chai
        .request(app)
        .get(`/files/${file._id}`)
        .set('X-Token', userOneToken);

      const resKeys = ['id', 'userId', 'name', 'type', 'isPublic', 'parentId'];

      expect(res).to.have.status(200);
      expect(res.body).to.include.all.keys(resKeys);
      expect(res.body.id).to.equal(file._id.toString());
    });

    it('should reject the request if the token is invalid', async () => {
      const file = files[0];
      const res = await chai
        .request(app)
        .get(`/files/${file._id}`)
        .set('X-Token', v4());

      expect(res).to.have.status(401);
      expect(res.body.error).to.equal('Unauthorized');
    });

    it('should return not found if file does not exist', async () => {
      const res = await chai
        .request(app)
        .get(`/files/${new ObjectId().toString()}`)
        .set('X-Token', userOneToken);

      expect(res).to.have.status(404);
      expect(res.body.error).to.equal('Not found');
    });
  });

  describe('gET /files/:id/data', () => {
    it('should fetch data of specified file', async () => {
      const file = files.find((file) => file.isPublic === true);
      const res = await chai
        .request(app)
        .get(`/files/${file._id.toString()}/data`)
        .set('X-Token', userOneToken);

      expect(res).to.have.status(200);
      expect(res.text).to.equal('water is good');
    });

    it('should allow cross-user file access as long as the files are public', async () => {
      const file = files.find((file) => file.isPublic === true);
      const res = await chai
        .request(app)
        .get(`/files/${file._id.toString()}/data`)
        .set('X-Token', userTwoToken);

      expect(res).to.have.status(200);
      expect(res.text).to.equal('water is good');
    });

    it('should allow user to view personal private files', async () => {
      const file = files.find((file) => file.isPublic === false);
      const res = await chai
        .request(app)
        .get(`/files/${file._id.toString()}/data`)
        .set('X-Token', userOneToken);

      expect(res).to.have.status(200);
      expect(res.text).to.equal('private data');
    });

    it('should reject request for private files that do not belong to user', async () => {
      const file = files.find((file) => file.isPublic === false);
      const res = await chai
        .request(app)
        .get(`/files/${file._id.toString()}/data`)
        .set('X-Token', userTwoToken);

      expect(res).to.have.status(404);
      expect(res.body.error).to.equal('Not found');
    });

    it('should reject request for files that are folders', async () => {
      const folder = folders[0];
      const res = await chai
        .request(app)
        .get(`/files/${folder._id}/data`)
        .set('X-Token', userOneToken);

      expect(res).to.have.status(400);
      expect(res.body.error).to.equal("A folder doesn't have content");
    });
  });

  describe('gET /files', () => {
    it('should fetch files without query parameters parentId and page i.e. implicit ParentId=0 and page=0', async () => {
      const res = await chai
        .request(app)
        .get('/files')
        .set('X-Token', userOneToken);

      expect(res.body).to.be.an('Array').with.lengthOf(10);
    });
    it('should fetch files when parentId= 0 and page=0 i.e. explicit ParentId=0 and page=0', async () => {
      const res = await chai
        .request(app)
        .get('/files')
        .set('X-Token', userOneToken)
        .query({ parentId: '0', page: 0 });

      expect(res.body).to.be.an('Array').with.lengthOf(10);
    });
    it('should fetch files when correct, non-zero parentId is provided', async () => {
      const res = await chai
        .request(app)
        .get('/files')
        .set('X-Token', userOneToken)
        .query({ parentId: folders[0]._id.toString(), page: 0 });

      expect(res.body).to.be.an('Array').with.lengthOf(MAX_PAGE_SIZE);
    });
    it('should fetch second page when correct, non-zero parentId is provided', async () => {
      const res = await chai
        .request(app)
        .get('/files')
        .set('X-Token', userOneToken)
        .query({ parentId: folders[0]._id.toString(), page: 1 });

      expect(res.body).to.be.an('Array').with.lengthOf(5);
    });

    it('should return an empty list when page is out of index', async () => {
      const res = await chai
        .request(app)
        .get('/files')
        .set('X-Token', userOneToken)
        .query({ parentId: folders[0]._id, page: 2 });

      expect(res.body).to.be.an('Array').with.lengthOf(0);
    });

    it('should return an empty list when user has no files', async () => {
      const res = await chai
        .request(app)
        .get('/files')
        .set('X-Token', userTwoToken)
        .query({ parentId: '0', page: 0 });

      expect(res.body).to.be.an('Array').with.lengthOf(0);
    });
  });
});

describe('fileController.js tests - publishing endpoints', () => {
  const user = {
    _id: new ObjectId(),
    email: 'test',
    password: hashedPassword,
  };
  const token = v4();
  const tokenKey = `auth_${token}`;
  const file = {
    _id: new ObjectId(),
    name: Math.random().toString(32).substring(2),
    type: 'file',
    parentId: '0',
    userId: user._id,
    isPublic: false,
  };

  before(
    () => new Promise((resolve) => {
      // Connect to db and clear collections
      dbClient = new MongoClient(`mongodb://${host}:${port}`, {
        useUnifiedTopology: true,
      });
      dbClient.connect(async (error, client) => {
        if (error) throw error;
        db = await client.db(database);

        // Create test user and folder
        await db.collection('users').insertOne(user);
        await db.collection('files').insertOne(file);

        // Connect to redis and clear keys
        rdClient = createClient();
        asyncSet = promisify(rdClient.set).bind(rdClient);
        asyncGet = promisify(rdClient.keys).bind(rdClient);
        asyncDel = promisify(rdClient.del).bind(rdClient);
        rdClient.on('connect', async () => {
          await asyncSet(tokenKey, user._id.toString());
          resolve();
        });
      });
    }),
  );

  after(async () => {
    // Clear db collections
    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
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

  describe('pUT /publish', () => {
    it('should set isPublished field to true', async () => {
      const res = await chai
        .request(app)
        .put(`/files/${file._id}/publish`)
        .set('X-Token', token);

      expect(res).to.have.status(200);
      expect(res.body.isPublic).to.be.true;
    });

    it('should unauthorize changes if incorrect token is provided', async () => {
      const res = await chai
        .request(app)
        .put(`/files/${file.id}/publish`)
        .set('X-Token', v4());

      expect(res).to.have.status(401);
      expect(res.body.error).to.equal('Unauthorized');
    });

    it('should not make any changes if file is not found', async () => {
      const res = await chai
        .request(app)
        .put(`/files/${new ObjectId()}/publish`)
        .set('X-Token', token);

      expect(res).to.have.status(404);
      expect(res.body.error).to.equal('Not found');
    });
  });

  describe('pUT /unpublish', () => {
    it('should set isPublished field to false', async () => {
      const res = await chai
        .request(app)
        .put(`/files/${file._id}/unpublish`)
        .set('X-Token', token);

      expect(res).to.have.status(200);
      expect(res.body.isPublic).to.be.false;
    });

    it('should unauthorize changes if incorrect token is provided', async () => {
      const res = await chai
        .request(app)
        .put(`/files/${file._id}/unpublish`)
        .set('X-Token', v4());

      expect(res).to.have.status(401);
      expect(res.body.error).to.equal('Unauthorized');
    });

    it('should not make any changes if file is not found', async () => {
      const res = await chai
        .request(app)
        .put(`/files/${new ObjectId()}/unpublish`)
        .set('X-Token', token);

      expect(res).to.have.status(404);
      expect(res.body.error).to.equal('Not found');
    });
  });
});

describe('fileController.js tests - file upload endpoint', () => {
  const user = {
    _id: new ObjectId(),
    email: 'test',
    password: hashedPassword,
  };
  const token = v4();
  const tokenKey = `auth_${token}`;
  const folder = {
    _id: new ObjectId(),
    name: 'poems',
    type: 'folder',
    parentId: '0',
    userId: user._id,
    isPublic: false,
  };

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

        // Create test user
        await db.collection('users').insertOne(user);
        await db.collection('files').insertOne(folder);

        // Connect to redis and clear keys
        rdClient = createClient();
        asyncSet = promisify(rdClient.set).bind(rdClient);
        asyncGet = promisify(rdClient.keys).bind(rdClient);
        asyncDel = promisify(rdClient.del).bind(rdClient);
        rdClient.on('connect', async () => {
          await asyncSet(tokenKey, user._id.toString());
          resolve();
        });
      });
    }),
  );

  after(async () => {
    // Delete files
    fs.rmdirSync(FOLDER_PATH, { recursive: true });

    // Clear db collections
    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
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

  describe('pOST /files', () => {
    let file;
    const data = Buffer.from('water is good').toString('base64');

    beforeEach(() => {
      file = {
        name: Math.random().toString(32).substring(2),
        type: 'file',
        isPublic: false,
        data,
      };
    });

    it('should add a file to the database with parentId=0', async () => {
      const res = await chai
        .request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file);

      const resKeys = ['id', 'userId', 'name', 'type', 'isPublic', 'parentId'];

      expect(res).to.have.status(201);
      expect(res.body).to.include.all.keys(resKeys);
      expect(res.body.name).to.equal(file.name);
      expect(res.body.type).to.equal(file.type);
      expect(res.body.isPublic).to.equal(file.isPublic);
      expect(res.body.parentId).to.equal(0);
      expect(fs.existsSync(FOLDER_PATH)).to.be.true;
      expect(fs.lstatSync(FOLDER_PATH).isDirectory()).to.be.true;
      expect(fs.readdirSync(FOLDER_PATH)).to.have.lengthOf.greaterThan(0);
    });

    it('should add a file to the database with a given parentId', async () => {
      file.parentId = folder._id.toString();
      const res = await chai
        .request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file);

      expect(res).to.have.status(201);
      expect(res.body.parentId).to.equal(folder._id.toString());
      expect(fs.readdirSync(FOLDER_PATH).length).to.equal(2);
    });

    it('should unauthorize uploads using wrong token', async () => {
      const res = await chai
        .request(app)
        .post('/files')
        .set('X-Token', v4())
        .send(file);

      expect(res).to.have.status(401);
      expect(res.body.error).to.equal('Unauthorized');
    });

    it('should unauthorize uploads with missing name', async () => {
      delete file.name;
      const res = await chai
        .request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file);

      expect(res).to.have.status(400);
      expect(res.body.error).to.equal('Missing name');
    });

    it('should unauthorize uploads with missing type', async () => {
      delete file.type;
      const res = await chai
        .request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file);

      expect(res).to.have.status(400);
      expect(res.body.error).to.equal('Missing type');
    });

    it('should unauthorize uploads with missing data if they are files', async () => {
      delete file.data;
      const res = await chai
        .request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file);

      expect(res).to.have.status(400);
      expect(res.body.error).to.equal('Missing data');
    });

    it('should unauthorize uploads if parentId is not linked to any document', async () => {
      file.parentId = new ObjectId().toString();
      const res = await chai
        .request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file);

      expect(res).to.have.status(400);
      expect(res.body.error).to.equal('Parent not found');
    });

    it('should unauthorize uploads if parentId is for a file or image and not a folder', async () => {
      const res = await chai
        .request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file);

      file.parentId = res.body.id;
      const res1 = await chai
        .request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file);

      expect(res1).to.have.status(400);
      expect(res1.body.error).to.equal('Parent is not a folder');
    });
  });
});
