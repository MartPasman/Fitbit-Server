var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');
var Competition = require('../model/model_competition');
var server = supertest.agent("http://localhost:3000");

var testadmin = 10001;
var testadminpassword = 'administrator';

var testadmin2 = 321;
var testadmin2password = 'chillchill';


/**
 * Test for creating a competition
 */
describe('Add goal', function () {
    var token;
    var id;
    /**
     * Getting a access token for testing
     */
    context('POST accounts/login/  Correct', function () {
        it('Should response 201 with access token', function (done) {
            server.post('/accounts/login')
                .send({id: testadmin, password: testadminpassword})
                .expect(201)
                .end(function (err, res) {
                    done(err);
                    token = res.body.success;
                    id = res.body.userid;
                });
        });
    });

    /**
     * Correct
     */
    context('GET /competitions/  Correct', function () {
        it('Should response 200', function (done) {
            server.get('/competitions/')
                .set("Authorization", token)
                .expect(200)
                .end(function (err, res) {
                    done(err);
                });
        });
    });


    /**
     * Correct
     */
    context('PUT /competitions/lastgoal/ Correct', function () {
        it('Should response 201', function (done) {
            server.put('/competitions/lastgoal/')
                .set("Authorization", token)
                .send({goal: 30000})
                .expect(201)
                .end(function (err, res) {
                    console.log(res.body.success.should.have.property('defaultGoal', 30000));
                    done(err);
                })
        })
    })
});

/**
 * Testing getting latest seven shared goals
 */
describe('Getting latest seven shared goals', function () {
    var token;

    // Login before we start the tests
    before(function (done) {
        server.post('/accounts/login')
            .send({id: testadmin2, password: testadmin2password})
            .end(function (err, res) {
                token = res.body.success;
                done(err);
            });
    });

    /**
     * Test without token
     */
    it('without token should return a 401 status code', function (done) {
        server.get('/competitions/shared')
            .send()
            .expect(401)
            .end(done);
    });
    /**
     * Test with token
     */
    it('with token should return a 200 status code (or 404 when no comps available)', function (done) {
        server.get('/competitions/shared')
            .set('Authorization', token)
            .send()
            .expect(function (res) {
                if (!(res.body.success instanceof Array)) {
                    throw new Error('Response is not an array.');
                }

                if (res.body.success.length === 0 && res.statusCode !== 404) {
                    throw new Error('Response is an empty array but a 404 was not received.');
                } else if (res.statusCode !== 200) {
                    throw new Error('Response status code is not a 200: ' + res.statusCode);
                }
            })
            .end(done);
    });
});