/**
 * account tests
 */


var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');

var server = supertest.agent("http://localhost:3000");

describe("Fitbit koppelen unittest", function(done){
    it("")
})


describe("Login", function () {
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