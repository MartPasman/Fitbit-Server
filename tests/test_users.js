/**
 * account tests
 */


var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');

var server = supertest.agent("http://localhost:3000");


/**
 * Test for testing the accounts/login/ path
 */
describe("Add goal", function () {
    var token;
    /**
     * Getting a access token for testing
     */
    context("POST accounts/login/  Correct", function () {
        it("Should response 201 with access token", function (done) {
            server.post('/accounts/login/')
                .send({ id: '123', password: 'chill'})
                .expect(201)
                .end(function(err, res){
                    done(err);
                    token = res.body.success;
                });
        });
    });

    context("POST accounts/users/addgoal  Correct", function () {
        it("Should response 201", function (done) {
            server.post('accounts/users/addgoal ')
                .send({ end: '2017-05-21 00:00:00.000',
                        start: '2017-05-20 00:00:00.000',
                        goal:1000})
                .expect(201)
                .end(function(err, res){
                    done(err);
                    token = res.body.success;
                });
        });
    });


});