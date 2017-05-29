/**
 * account tests
 */


var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');
var User = require('../model/model_user');
var server = supertest.agent("http://localhost:3000");

// describe("Fitbit connecting unittest", function () {
//     before(function (done) {
//         server.get('/accounts/testnewuser')
//             .expect(201)
//             .end(function (err, res) {
//                 done(err);
//             });
//     });
//
//
//     it("should connect a fitbit to a user and return 201", function (done) {
//         server.get('/accounts/connect/123')
//             .expect(302)
//             .end(function (err) {
//                 done(err);
//             })
//     });
//
//     /**
//      * can't be tested
//      */
//     // context("GET accounts/connect/ User has fitbit already", function(){
//     //     it("should try to connect a fitbit to a user and return 409", function (done) {
//     //         server.get('/accounts/connect/123')
//     //             .expect(409)
//     //             .end(function (err) {
//     //                 done(err);
//     //             })
//     //     });
//     // });
//
//     context("GET accounts/connect/  wrong user", function () {
//
//         it("should connect a fitbit to a user and return 404", function (done) {
//             server.get('/accounts/connect/12345')
//                 .expect(404)
//                 .end(function (err) {
//                     done(err);
//                 })
//         });
//     });
//
//
//     // after(function (done) {
//     //     server.get('/accounts/testdeleteuser/123')
//     //         .expect(201)
//     //         .end(function (err, res) {
//     //             done(err);
//     //         });
//     // });
//
//
// });

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
                .send({id: '123', password: 'chillchill'})
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
        it("Should response 400 because, wrong password", function (done) {
            server.post('/accounts/login/')
                .send({id: '123', password: 'afdasf'})
                .expect(400)
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
                .send({id: '1232314', password: 'chill'})
                .expect(400)
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
                .expect(400)
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
    var token = "";

    before(function (done) {
        server.post('/accounts/login')
            .send({id: 321, password: "chillhoor"})
            .expect(201)
            .end(function (err, result) {
                token = result.body.success;
                done();
            });
    });

    /**
     * Password change to hallo123
     */
    context("PUT accounts/password correct change password", function () {
        it("Should response 201", function (done) {
            server.put('/accounts/password')
                .send({old: "chillhoor", new1: "hallo123", new2: "hallo123"})
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
                .send({id: '321', password: 'hallo123'})
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
                .send({old: "hallo123", new1: "chillchill", new2: "chillchill"})
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
                .send({old: "", new1: "chillchill", new2: "chillchill"})
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
                .expect(400)
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
            .send({id: 321, password: "chillchill"})
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


/**
 * Tests for testing the accounts/ path
 */
describe("Get users", function () {
    var authToken = "";
    var authTokenWrong = "";
    before(function (done) {
        server.post('/accounts/login')
            .send({id: 4236, password: "chillchill"})
            .expect(201)
            .end(function (err, result) {
                authToken = result.body.success;
            });

        server.post('/accounts/login')
            .send({id: 4235, password: "chill"})
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




