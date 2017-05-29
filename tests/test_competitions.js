var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');
var Competition = require('../model/model_competition');
var server = supertest.agent("http://localhost:3000");


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
                .send({id: '321', password: 'chillchill'})
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
        it('Should response 201', function (done) {
            server.get('/competitions/')
                .set("Authorization", token)
                .expect(200)
                .end(function (err, res) {
                    done(err);
                });
        });
    });


});