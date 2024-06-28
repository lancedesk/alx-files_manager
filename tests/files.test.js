const { expect } = require('chai');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app'); // Ensure this imports your Express app

chai.use(chaiHttp);

describe('Files Endpoint Tests', function() {
    it('GET /files should return status 200 and JSON', function(done) {
        chai.request(app)
            .get('/files')
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                // Add more assertions as per pagination and content requirements
                done();
            });
    });

    it('POST /files should create a new file and return status 201', function(done) {
        chai.request(app)
            .post('/files')
            .send({ name: 'Test File', type: 'file', data: 'base64_encoded_data', isPublic: true })
            .end((err, res) => {
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.have.property('id');
                expect(res.body.name).to.equal('Test File');
                done();
            });
    });

});
