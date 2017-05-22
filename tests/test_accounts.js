/**
 * account tests
 */


var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');
var User = require('../model/model_user');
var server = supertest.agent("http://localhost:3000");

describe("Fitbit connecting unittest", function () {
    before(function (done) {
        server.get('/accounts/testnewuser')
            .expect(201)
            .end(function (err, res) {
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

    /**
     * can't be tested
     */
    // context("GET accounts/connect/ User has fitbit already", function(){
    //     it("should try to connect a fitbit to a user and return 409", function (done) {
    //         server.get('/accounts/connect/123')
    //             .expect(409)
    //             .end(function (err) {
    //                 done(err);
    //             })
    //     });
    // });

    context("GET accounts/connect/  wrong user", function () {

        it("should connect a fitbit to a user and return 404", function (done) {
            server.get('/accounts/connect/12345')
                .expect(404)
                .end(function (err) {
                    done(err);
                })
        });
    });


    after(function (done) {
        server.get('/accounts/testdeleteuser/123')
            .expect(201)
            .end(function (err, res) {
                done(err);
            });
    });


});
describe("Fitbit koppelen unittest", function (done) {
    it("")
});

/**
 * Test for testing the accounts/login/ path
 */
describe("Login", function () {
    before(function (done) {
        server.get('/accounts/testnewuser')
            .expect(201)
            .end(function (err, res) {
                done(err);
            });
    });
    /**
     * Testing a correct login expect 201 with access token
     */
    context("POST accounts/login/  Correct", function () {
        it("Should response 201 with access token", function (done) {
            server.post('/accounts/login/')
                .send({id: '123', password: 'chill'})
                .expect(201)
                .end(function (err, res) {
                    done(err);
                });
        });
    });

    /**
     * Testing a login path with a wrong password expected 400
     */
    context("POST accounts/login/  Wrong password", function () {
        it("Should response 401 because, wrong password", function (done) {
            server.post('/accounts/login/')
                .send({id: '123', password: 'afdasf'})
                .expect(401)
                .end(function (err, res) {
                    done(err);
                });
        });
    });

    /**
     * Testing a login path with a wrong id expected 400
     */
    context("POST accounts/login/  Wrong id", function () {
        it("Should response 401 because, wrong id", function (done) {
            server.post('/accounts/login/')
                .send({id: '1232314', password: 'chill'})
                .expect(401)
                .end(function (err, res) {
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
                .send({id: '', password: ''})
                .expect(401)
                .end(function (err, res) {
                    done(err);
                });
        });
    });

    /**
     * Testing a login path with no json given expected 400
     */
    context("POST accounts/login/  No json", function () {
        it("Should response 401 because, No json passed", function (done) {
            server.post('/accounts/login/')
                .send()
                .expect(401)
                .end(function (err, res) {
                    done(err);
                });
        });
    });

    /**
     * Testing a login with a non numeric id expected 400
     */
    context("POST accounts/login/  non numeric id", function () {
        it("Should response 401 because, id is not numeric", function (done) {
            server.post('/accounts/login/')
                .send({id: 'notnumeric', password: 'chill'})
                .expect(401)
                .end(function (err, res) {
                    done(err);
                });
        });
    });
});


/**
 * Tests for testing the accounts/users path
 */
describe("Sign up", function () {
    var authToken = "";

    before(function (done) {
        server.post('/accounts/login')
            .send({id: 321, password: "chill"})
            .expect(201)
            .end(function (err, result) {
                authToken = result.body.success;
                done();
            });
    });

    /**
     * Testing a correct sign up expect 201 with id returned
     * if 400 app@live.nl already exists, remove manually first
     */
    context("POST accounts/  Correct", function () {
        it("Should response 201 with id", function (done) {
            server.post('/accounts/')
                .send({
                    password: "testtest",
                    email: "aap@live.nl",
                    handicap: 2,
                    type: 2
                }).set("Authorization", authToken)
                .expect(201)
                .expect(function (res) {
                    if (!res.body.id) {
                        throw new Error("Id not given back");
                    }
                })
                .end(done);
        });
    });

    /**
     * Testing a sign up expect 401 not logged in
     */
    context("POST accounts/  Failed", function () {
        it("Should response 401 not logged in", function (done) {
            server.post('/accounts/')
                .send({
                    password: "testtest",
                    email: "aapje@live.nl",
                    handicap: 2,
                    type: 3
                })
                .expect(401)
                .end(done);
        });
    });

    /**
     * Testing a sign up expect 400 empty fields
     */
    context("POST accounts/  failed", function () {
        it("Should response 400 empty fields", function (done) {
            server.post('/accounts/')
                .send({
                    password: "",
                    email: ""
                })
                .set("Authorization", authToken)
                .expect(400)
                .expect(function (res) {
                    if (!res.body) throw new Error("Empty password and email")
                })
                .end(done);
        });
    });

    /**
     * Testing a sign up expect 400 password too short
     */
    context("POST accounts/  failed", function () {
        it("Should response 400 password too short", function (done) {
            server.post('/accounts/')
                .send({
                    password: "aa",
                    email: "romy1@live.nl",
                    type: 3,
                    handicap: 2
                })
                .set("Authorization", authToken)
                .expect(400)
                .expect(function (res) {
                    if (!res.body) throw new Error("Password too short")
                })
                .end(done);
        });
    });

    /**
     * Testing a sign up expect 400 email not valid
     */
    context("POST accounts/  failed", function () {
        it("Should response 400  email not valid", function (done) {
            server.post('/accounts/')
                .send({
                    password: "asdfghjkl",
                    email: "romy@.nl",
                    type: 3,
                    handicap: 2
                })
                .set("Authorization", authToken)
                .expect(400)
                .expect(function (res) {
                    if (!res.body) throw new Error("Email not valid")
                })
                .end(done);
        });
    });


    /**
     * Testing a sign up expect 400 type not valid
     */
    context("POST accounts/  failed", function () {
        it("Should response 400  type not valid", function (done) {
            server.post('/accounts/')
                .send({
                    password: "asdfghjkl",
                    email: "romy2@live.nl",
                    type: 4,
                    handicap: 2
                })
                .set("Authorization", authToken)
                .expect(400)
                .expect(function (res) {
                    if (!res.body) throw new Error("Type not valid")
                })
                .end(done);
        });
    });

    /**
     * Testing a sign up expect 400 handicap not valid
     */
    context("POST accounts/  failed", function () {
        it("Should response 400  handicap not valid", function (done) {
            server.post('/accounts/')
                .send({
                    password: "asdfghjkl",
                    email: "romy3@live.nl",
                    type: 2,
                    handicap: 4
                })
                .set("Authorization", authToken)
                .expect(400)
                .expect(function (res) {
                    if (!res.body) throw new Error("Handicap not valid")
                })
                .end(done);
        });
    });

    /**
     * Testing a sign up expect 400 email already exists
     */
    context("POST accounts/  failed", function () {
        it("Should response 400  email already exists", function (done) {
            server.post('/accounts/')
                .send({
                    password: "asdfghjkl",
                    email: "aap@live.nl",
                    type: 2,
                    handicap: 2
                })
                .set("Authorization", authToken)
                .expect(400)
                .expect(function (res) {
                    if (!res.body) throw new Error("Email already exists")
                })
                .end(done);
        });
    });


});