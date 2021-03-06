/**
 * account tests
 */


var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');
var server = supertest.agent("http://localhost:3000");


var testuser = '10002';
var testpassword = 'gebruiker';

var testadmin = '10001';
var testadminpassword = 'administrator';


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
        .send({id: testuser, password: testpassword})
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
                .send({id: testuser, password: 'afdasf'})
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
        it("Should response 400 because, wrong id", function (done) {
            server.post('/accounts/login/')
                .send({id: '1232314', password: testpassword})
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
        it("Should response 401 because, empty information passed", function (done) {
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
        it("Should response 400 because, No json passed", function (done) {
            server.post('/accounts/login/')
                .send()
                .expect(400)
                .end(function (err, res) {
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
                .send({id: 'notnumeric', password: 'chill'})
                .expect(400)
                .end(function (err, res) {
                    done(err);
                });
        });
    });


});

describe("Wachtwoord veranderen", function () {
    var token;

    /**
     * Testing a correct login expect 201 with access token
     */
    context("POST accounts/login/  Correct", function () {
        it("Should response 201 with access token", function (done) {
            server.post('/accounts/login/')
                .send({id: testuser, password: testpassword})
                .expect(201)
                .end(function (err, res) {
                    token = res.body.success;
                    done(err);
                });
        });
    });

    /**
     * Password change to hallo123
     */
    context("PUT accounts/password correct change password", function () {
        it("Should response 201", function (done) {
            server.put('/accounts/password')
                .send({old: testpassword, new1: "hallo123", new2: "hallo123"})
                .set("Authorization", token)
                .expect(201)
                .end(function (err, result) {
                    done();
                });
        });
    });

    /**
     * Testing a correct login expect 201 with new password
     */
    context("POST accounts/login/  Correct login new password", function () {
        it("Should response 201 with access token", function (done) {
            server.post('/accounts/login/')
                .send({id: testuser, password: 'hallo123'})
                .expect(201)
                .end(function (err, res) {
                    token = res.body.success;
                    done(err);
                });
        });
    });

    /**
     * Change password back to old for testing purpose
     */
    context("PUT accounts/password correct change back password", function () {
        it("Should response 201", function (done) {
            server.put('/accounts/password')
                .send({old: "hallo123", new1: testpassword, new2: testpassword})
                .set("Authorization", token)
                .expect(201)
                .end(function (err, result) {
                    done();
                });
        });
    });

    /**
     * Change password back to old for testing purpose
     */
    context("PUT accounts/password failed change password no old", function () {
        it("Should response 400", function (done) {
            server.put('/accounts/password')
                .send({old: "", new1: testpassword, new2: testpassword})
                .set("Authorization", token)
                .expect(400)
                .end(function (err, result) {
                    done();
                });
        });
    });

    /**
     * Change password back to old for testing purpose
     */
    context("PUT accounts/password failed change password wrong old", function () {
        it("Should response 400", function (done) {
            server.put('/accounts/password')
                .send({old: "wrong", new1: "chillchill", new2: "chillchill"})
                .set("Authorization", token)
                .expect(401)
                .end(function (err, result) {
                    done();
                });
        });
    });

    /**
     * Change password back to old for testing purpose
     */
    context("PUT accounts/password failed new not the same", function () {
        it("Should response 400", function (done) {
            server.put('/accounts/password')
                .send({old: "wrong", new1: "chillchill1", new2: "chillchill2"})
                .set("Authorization", token)
                .expect(400)
                .end(function (err, result) {
                    done();
                });
        });
    });
});

/**
 * Tests for testing the accounts/path
 */
describe("Sign up", function () {
    var authToken = "";

    before(function (done) {
        server.post('/accounts/login')
            .send({id: testadmin, password: testadminpassword})
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
                    handicap: 2,
                    type: 1
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
                    handicap: 2,
                    type: 2
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
                    password: ""
                })
                .set("Authorization", authToken)
                .expect(400)
                .expect(function (res) {
                    if (!res.body) throw new Error("Empty password")
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
                    type: 1,
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
     * Testing a sign up expect 400 type not valid
     */
    context("POST accounts/  failed", function () {
        it("Should response 400  type not valid", function (done) {
            server.post('/accounts/')
                .send({
                    password: "asdfghjkl",
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
                    type: 1,
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


});


/**
 * Tests for testing the accounts/ path
 */
describe("Get users", function () {
    var authToken = "";
    var authTokenWrong = "";
    before(function (done) {
        server.post('/accounts/login')
            .send({id: testadmin, password: testadminpassword})
            .expect(201)
            .end(function (err, result) {
                authToken = result.body.success;
            });

        server.post('/accounts/login')
            .send({id: testuser, password: testpassword})
            .expect(201)
            .end(function (err, result) {
                authTokenWrong = result.body.success;
                done();
            });



    });

    /**
     * Testing a correct get users expect 200 with users returned
     */
    context("GET accounts/  Correct", function () {
        it("Should response 200 with users", function (done) {
            server.get('/accounts/')
                .set("Authorization", authToken)
                .expect(200)
                .expect(function (res) {
                    if (!res.body.success) {
                        throw new Error("Users not given back");
                    }
                })
                .end(done);
        });
    });

    /**
     * Testing a sign up expect 401 not logged in
     */
    context("GET accounts/  Failed", function () {
        it("Should response 401 not logged in", function (done) {
            server.get('/accounts/')
                .expect(401)
                .end(done);
        });
    });

    /**
     * Testing a correct get users expect 403  not authorized
     */
    context("GET accounts/  failed", function () {
        it("Should response 403 not authorized", function (done) {
            server.get('/accounts/')
                .set("Authorization", authTokenWrong)
                .expect(403)
                .expect(function (res) {
                    if (res.body.success) {
                        throw new Error("Users not given back");
                    }
                })
                .end(done);
        });
    });

});

