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
            server.post('/accounts/login')
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
            server.post('/users/addgoal ')
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

describe("Get stats of a user", function () {
    var token;
    var userid = 123;

    /**
     * Good weather
     */
    context("GET /users/:id/stats/total", function () {
        it("Should get the total amount of steps", function (done) {
            server.get('/users/' + userid + '/stats/total')
                .send()
                .expect(200)
                .expect(function (res) {

                })
                .end(done);
        });
    });

    /**
     * Good weather
     */
    context("GET /users/:id/stats/weeks/last", function () {
        it("Should get two arrays with each 7 results", function (done) {
            server.get('/users/' + userid + '/stats/weeks/last')
                .send()
                .expect(200)
                .expect(function (res) {

                })
                .end(done);
        });
    });
});