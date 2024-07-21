const { expect } = require('chai');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app'); // Ensure this imports your Express app

chai.use(chaiHttp);

describe('Status Endpoint Tests', function() {
    it('GET /status should return status 200 and JSON', function(done) {
        chai.request(app)
            .get('/status')
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                done();
            });
    });

});
