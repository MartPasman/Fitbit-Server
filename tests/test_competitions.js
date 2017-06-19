var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');
var Competition = require('../model/model_competition');
var server = supertest.agent("http://localhost:3000");
var testuser = '10002';
var testpassword = 'gebruiker';

var testadmin = '10001';
var testadminpassword = 'administrator';


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
    });

    /**
     * Correct
     */
    context('PUT /competitions/lastlength/ Correct', function () {
        it('Should response 201', function (done) {
            server.put('/competitions/lastlength/')
                .set("Authorization", token)
                .send({length: 8})
                .expect(201)
                .end(function (err, res) {
                    console.log(res.body.success.should.have.property('defaultLength', 8));
                    done(err);
                })
        })
    });



});