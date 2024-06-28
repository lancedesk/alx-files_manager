const { expect } = require('chai');
const dbClient = require('../utils/db');

describe('Database Client Tests', function() {
    it('should connect to the database', async function() {
        const isConnected = await dbClient.isConnected();
        expect(isConnected).to.be.true;
    });

    it('should insert and find a document', async function() {
        const testDoc = { name: 'Test Document', type: 'file' };
        const insertResult = await dbClient.db.collection('files').insertOne(testDoc);
        const insertedId = insertResult.insertedId;

        const doc = await dbClient.db.collection('files').findOne({ _id: insertedId });

        expect(doc).to.exist;
        expect(doc.name).to.equal('Test Document');
    });

});
