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

    /**
     * Correct
     */
    context("POST /users/goal/add  Correct", function () {
        it("Should response 201", function (done) {
            server.post('/users/goal/add ')
                .send({ end: '2017-05-21 00:00:00.000',
                        start: '2017-05-20 00:00:00.000',
                        goal:1000}).set("Authorization", token)
                .expect(201)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    /**
     * Missing field in json
     */
    context("POST /users/goal/add  failed missing field", function () {
        it("Should response 400", function (done) {
            server.post('/users/goal/add ')
                .send({ end: '2017-05-21 00:00:00.000',
                    start: '2017-05-21 00:00:00.000'
                    }).set("Authorization", token)
                .expect(400)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    /**
     * Not a number as goal
     */
    context("POST /users/goal/add  failed goal is not a number", function () {
        it("Should response 400", function (done) {
            server.post('/users/goal/add ')
                .send({ end: '2017-05-21 00:00:00.000',
                    start: '2017-05-21 00:00:00.000',
                    goal: 'fdsaf'
                }).set("Authorization", token)
                .expect(400)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    /**
     * Empty fields
     */
    context("POST /users/goal/add failed empty fields", function () {
        it("Should response 400", function (done) {
            server.post('/users/goal/add ')
                .send({ end: '',
                    start: '',
                    goal: ''
                }).set("Authorization", token)
                .expect(400)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    /**
     * Wrong date
     */
    context("POST /users/goal/add  failed wrong date", function () {
        it("Should response 400", function (done) {
            server.post('/users/goal/add ')
                .send({ end: 'fsadf',
                    start: '213421',
                    goal: 4500
                }).set("Authorization", token)
                .expect(400)
                .end(function(err, res){
                    done(err);
                });
        });
    });

});

/**
 * Test for testing the accounts/login/ path
 */
describe("Delete goal", function () {
    var token;
    /**
     * Getting a access token for testing
     */
    context("POST accounts/login/  Correct", function () {
        it("Should response 201 with access token", function (done) {
            server.post('/accounts/login/')
                .send({id: '123', password: 'chill'})
                .expect(201)
                .end(function (err, res) {
                    done(err);
                    token = res.body.success;
                });
        });
    });


    /**
     * Adding at least 1 goal for testing
     */
    context("POST /users/goal/add  Correct", function () {
        it("Should response 201", function (done) {
            server.post('/users/goal/add ')
                .send({ end: '2017-05-21 00:00:00.000',
                    start: '2017-05-20 00:00:00.000',
                    goal:1000}).set("Authorization", token)
                .expect(201)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    var id;
    /**
     * Getting a id for test purpose
     */
    context("GET /users/goal/0  Correct", function () {
        it("Should response 201", function (done) {
            server.get('/users/goal/0 ')
                .send().set("Authorization", token)
                .expect(201)
                .end(function(err, resp){
                    done(err);
                    id = resp.body.goals[0]._id;
                });
        });
    });

    /**
     * Deleting a goal with the id
     */
    context("DELETE /users/goal/delete/:id  Correct", function () {
        it("Should response 201", function (done) {
            server.delete('/users/goal/delete/'+ id)
                .send().set("Authorization", token)
                .expect(201)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    /**
     * Testing if nothing gets deleted if no id supplied
     */
    context("DELETE /users/goal/delete/:id  Failed no id", function () {
        it("Should response 400", function (done) {
            server.delete('/users/goal/delete/')
                .send().set("Authorization", token)
                .expect(400)
                .end(function(err, res){
                    done(err);
                });
        });
    });
});

/**
 * Test for testing the accounts/login/ path
 */
describe("Delete goal", function () {
    var token;
    /**
     * Getting a access token for testing
     */
    context("POST accounts/login/  Correct", function () {
        it("Should response 201 with access token", function (done) {
            server.post('/accounts/login/')
                .send({id: '123', password: 'chill'})
                .expect(201)
                .end(function (err, res) {
                    done(err);
                    token = res.body.success;
                });
        });
    });


    /**
     * Adding at least 1 goal for testing
     */
    context("POST /users/goal/add  Correct", function () {
        it("Should response 201", function (done) {
            server.post('/users/goal/add ')
                .send({
                    end: '2017-05-21 00:00:00.000',
                    start: '2017-05-20 00:00:00.000',
                    goal: 1000
                }).set("Authorization", token)
                .expect(201)
                .end(function (err, res) {
                    done(err);
                });
        });
    });

    /**
     * Getting a goals with 0 as offset
     */
    context("GET /users/goal/0  Correct", function () {
        it("Should response 201", function (done) {
            server.get('/users/goal/0 ')
                .send().set("Authorization", token)
                .expect(201)
                .end(function (err, resp) {
                    done(err);
                });
        });
    });

    /**
     * Getting no goals when no offset supplied
     */
    context("GET /users/goal  failed no offset", function () {
        it("Should response 400", function (done) {
            server.get('/users/goal ')
                .send().set("Authorization", token)
                .expect(400)
                .end(function (err, resp) {
                    done(err);
                });
        });
    });
});