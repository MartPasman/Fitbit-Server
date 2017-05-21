/**
 * account tests
 */


var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');

var server = supertest.agent('http://localhost:3000');

/**
 * Test for testing the accounts/login/ path
 */
describe('Add goal', function () {
    var token;
    /**
     * Getting a access token for testing
     */
    context('POST accounts/login/  Correct', function () {
        it('Should response 201 with access token', function (done) {
            server.post('/accounts/login')
                .send({id: '123', password: 'chill'})
                .expect(201)
                .end(function (err, res) {
                    done(err);
                    token = res.body.success;
                });
        });
    });

    context('POST accounts/users/addgoal  Correct', function () {
        it('Should response 201', function (done) {
            server.post('/users/addgoal ')
                .send({
                    end: '2017-05-21 00:00:00.000',
                    start: '2017-05-20 00:00:00.000',
                    goal: 1000
                })
                .expect(201)
                .end(function (err, res) {
                    done(err);
                    token = res.body.success;
                });
        });
    });
});

describe('Get stats of a user', function () {
    var token;
    var userid = 123;

    /**
     * Authenticate user 123 to test with
     */
    before(function (done) {
        server.post('/accounts/login')
            .send({id: userid, password: 'chill'})
            .end(function (err, result) {
                token = result.body.success;
                done();
            });
    });

    /**
     * Good weather
     */
    context('GET /users/' + userid + '/stats/total', function () {
        it('Should get the total amount of steps', function (done) {
            server.get('/users/' + userid + '/stats/total')
                .set('Authorization', token)
                .send()
                .expect(200)
                .expect(function (res) {
                    if (res.body.success.steps === undefined) {
                        throw new Error("No steps returned in JSON body.");
                    }

                    if (isNaN(res.body.success.steps)) {
                        throw new Error("Steps not a number.");
                    }
                })
                .end(done);
        });
    });

    /**
     * Good weather
     */
    context('GET /users/' + userid + '/stats/weeks/last', function () {
        it('Should get two arrays with each 7 results', function (done) {
            server.get('/users/' + userid + '/stats/weeks/last')
                .set('Authorization', token)
                .send()
                .expect(200)
                .expect(function (res) {
                    if (res.body.success.steps === undefined ||
                        res.body.success.sleep === undefined) {
                        throw new Error("No steps or sleep in body.");
                    }

                    if ((res.body.success.steps.length !== 7 &&
                        res.body.success.steps.length !== 0) ||
                        res.body.success.sleep.length !== 7 &&
                        res.body.success.sleep.length !== 0) {
                        throw new Error("Incorrect response.");
                    }
                })
                .end(done);
        });
    });
});