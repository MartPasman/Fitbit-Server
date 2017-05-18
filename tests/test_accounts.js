/**
 * account tests
 */


var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');

var server = supertest.agent("http://localhost:3000");

describe("Fitbit koppelen unittest", function(){
    before(function(done){
        server.get('/accounts/testnewuser')
            .expect(201)
            .end(function(err,res){
               done(err);
            });
    });



    it("should connect a fitbit to a user and return 201", function(done){
        server.get('/accounts/connect/123')
            .expect(302)
            .end(function(err){
                done(err);
            })
    });


    after(function(done){
        server.get('/accounts/testdeleteuser/123')
            .expect(201)
            .end(function (err) {
                done(err);
            });
    });

});
describe("Fitbit koppelen unittest", function(done){
    it("")
})

/**
 * Test for testing the accounts/login/ path
 */
describe("Login", function () {
    /**
     * Testing a correct login expect 201 with access token
     */
    context("POST accounts/login/  Correct", function () {
        it("Should response 201 with access token", function (done) {
            server.post('/accounts/login/')
                .send({ id: '123', password: 'chill'})
                .expect(201)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    /**
     * Testing a login path with a wrong password expected 400
     */
    context("POST accounts/login/  Wrong password", function () {
        it("Should response 400 because, wrong password", function (done) {
            server.post('/accounts/login/')
                .send({ id: '123', password: 'afdasf'})
                .expect(400)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    /**
     * Testing a login path with a wrong id expected 400
     */
    context("POST accounts/login/  Wrong id", function () {
        it("Should response 400 because, wrong id", function (done) {
            server.post('/accounts/login/')
                .send({ id: '1232314', password: 'chill'})
                .expect(400)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    /**
     * Testing a login path with no information in the json expected 400
     */
    context("POST accounts/login/  empty information", function () {
        it("Should response 400 because, empty information passed", function (done) {
            server.post('/accounts/login/')
                .send({ id: '', password: ''})
                .expect(400)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    /**
     * Testing a login path with no json given expected 400
     */
    context("POST accounts/login/  No json", function () {
        it("Should response 400 because, No json passed", function (done) {
            server.post('/accounts/login/')
                .send()
                .expect(400)
                .end(function(err, res){
                    done(err);
                });
        });
    });

    /**
     * Testing a login with a non numeric id expected 400
     */
    context("POST accounts/login/  non numeric id", function () {
        it("Should response 400 because, id is not numeric", function (done) {
            server.post('/accounts/login/')
                .send({ id: 'notnumeric', password: 'chill'})
                .expect(400)
                .end(function(err, res){
                    done(err);
                });
        });
    });

});