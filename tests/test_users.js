/**
 * account tests
 */


var mocha = require('mocha');
var supertest = require('supertest');
var should = require('should');

var server = supertest.agent('http://localhost:3000');

/**
 * Test for testing the accounts/login/ path
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
                .send({id: '123', password: 'chillchill'})
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
    context('POST /users/'+id+'/goals/  Correct', function () {
        it('Should response 201', function (done) {
            server.post('/users/'+id+'/goals/')
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
     * Missing field in json
     */
    context("POST /users/"+id+"/goals/  failed missing field", function () {
        it("Should response 400", function (done) {
            server.post('/users/'+id+'/goals/ ')
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
    context("POST /users/goals/add  failed goal is not a number", function () {
        it("Should response 400", function (done) {
            server.post('/users/'+id+'/goals/ ')
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
    context("POST /users/123/goals/ failed empty fields", function () {
        it("Should response 400", function (done) {
            server.post('/users/'+id+'/goals/ ')
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
    context("POST /users/goals/ failed wrong date", function () {
        it("Should response 400", function (done) {
            server.post('/users/'+id+'/goals/ ')
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
    var id;

    /**
     * Getting a access token for testing
     */
    context("POST accounts/login/  Correct", function () {
        it("Should response 201 with access token", function (done) {
            server.post('/accounts/login/')
                .send({id: '123', password: 'chillchill'})
                .expect(201)
                .end(function (err, res) {
                    done(err);
                    token = res.body.success;
                    id = res.body.userid;
                });
        });
    });

    /**
     * Adding at least 1 goal for testing
     */
    context("POST /users/:id/goals/  Correct", function () {
        it("Should response 201", function (done) {
            server.post('/users/'+id+'/goals/ ')
                .send({ end: '2017-05-21 00:00:00.000',
                    start: '2017-05-20 00:00:00.000',
                    goal:1000}).set("Authorization", token)
                .expect(201)
                .end(function(err, res){
                    done(err);
                });
        });
    });

var gid
    /**
     * Getting a id for test purpose
     */
    context("GET /users/:id/goals?offset=0  Correct", function () {
        it("Should response 201", function (done) {
            server.get('/users/'+id+'/goals?offset=0&limit=5 ')
                .send().set("Authorization", token)
                .expect(201)
                .end(function(err, resp){
                    done(err);
                    gid = resp.body.goals[0]._id;
                    console.log(gid);
                });
        });
    });

    /**
     * Deleting a goal with the id
     */
    context("DELETE /users/:id/goals/:gid  Correct", function () {
        it("Should response 201", function (done) {
            server.delete('/users/'+id+'/goals/'+ gid)
                .send().set("Authorization", token)
                .expect(201)
                .end(function(err, res){
                    done(err);
                });
        });
    });


});


/**
 * Test for testing the accounts/login/ path
 */
describe("Load goal with offset", function () {
    var token;
    var id;

    /**
     * Getting a access token for testing
     */
    context("POST accounts/login/  Correct", function () {
        it("Should response 201 with access token", function (done) {
            server.post('/accounts/login/')
                .send({id: '123', password: 'chillchill'})
                .expect(201)
                .end(function (err, res) {
                    done(err);
                    token = res.body.success;
                    id = res.body.userid;
                });
        });
    });


    /**
     * Adding at least 1 goal for testing
     */
    context("POST /users/:id/goals/  Correct", function () {
        it("Should response 201", function (done) {
            server.post('/users/'+id+'/goals/ ')
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
    context("GET /users/:id/goals?offset=0&limit=5  Correct", function () {
        it("Should response 201", function (done) {
            server.get('/users/'+id+'/goals?offset=0&limit=5 ')
                .send().set("Authorization", token)
                .expect(201)
                .end(function (err, resp) {
                    done(err);
                });
        });
    });
});

describe('Get stats of a user', function () {
    var token;
    var userid = 123;

    /**
     * Authenticate user 123 to test with
     */
    before(function (done) {
        server.post('/accounts/login')
            .send({id: userid, password: 'chillchill'})
            .end(function (err, result) {
                token = result.body.success;
                done();
            });
    });

    /**
     * Good weather
     */
    context('GET /users/' + userid + '/stats/total', function () {
        it('Should get the total amount of steps', function (done) {
            server.get('/users/' + userid + '/stats/total')
                .set('Authorization', token)
                .send()
                .expect(200)
                .expect(function (res) {
                    if (res.body.success.steps === undefined) {
                        throw new Error("No steps returned in JSON body.");
                    }

                    if (isNaN(res.body.success.steps)) {
                        throw new Error("Steps not a number.");
                    }
                })
                .end(done);
        });
    });

    /**
     * Good weather
     */
    context('GET /users/' + userid + '/stats/weeks/last', function () {
        it('Should get two arrays with each 7 results', function (done) {
            server.get('/users/' + userid + '/stats/weeks/last')
                .set('Authorization', token)
                .send()
                .expect(200)
                .expect(function (res) {
                    if (res.body.success.steps === undefined ||
                        res.body.success.sleep === undefined) {
                        throw new Error("No steps or sleep in body.");
                    }

                    if ((res.body.success.steps.length !== 7 &&
                        res.body.success.steps.length !== 0) ||
                        res.body.success.sleep.length !== 7 &&
                        res.body.success.sleep.length !== 0) {
                        throw new Error("Incorrect response.");
                    }
                })
                .end(done);
        });
    });
});

/**
 * Test for testing the PUT users/:id/handicap
 */
describe("Handicap", function () {
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
     * Testing a correct get users expect 200 with success message
     */
    context("PUT users/:id/handicap  Correct", function () {
        it("Should response 200 with success", function (done) {
            server.put('/users/' + 4235 + '/handicap')
                .set("Authorization", authToken)
                .send({
                    handicap: 2
                })
                .expect(200)
                .expect(function (res) {
                    if (!res.body.success) {
                        throw new Error("User account not updated");
                    }
                })
                .end(done);
        });
    });

    /**
     * Testing a failed get users expect 400 id not given
     */
    context("PUT users/:id/handicap  Failed", function () {
        it("Should response 400 id not given", function (done) {
            server.put('/users/' + 'al' + '/handicap')
                .set("Authorization", authToken)
                .send({
                    handicap: 2
                })
                .expect(400)
                .expect(function (res) {
                    if (!res.body.error) {
                        throw new Error("User account updated");
                    }
                })
                .end(done);
        });
    });

    /**
     * Testing a failed get users expect 400 handicap not given
     */
    context("PUT users/:id/handicap  Failed", function () {
        it("Should response 400 handicap not given", function (done) {
            server.put('/users/' + 4235 + "/handicap")
                .set("Authorization", authToken)
                .expect(400)
                .expect(function (res) {
                    if (!res.body.error) {
                        throw new Error("User account updated");
                    }
                })
                .end(done);
        });
    });

    /**
     * Testing a failed get users expect 400 invalid handicap
     */
    context("PUT users/:id/handicap  Failed", function () {
        it("Should response 400  invalid handicap", function (done) {
            server.put('/users/' + 4235 + "/handicap")
                .set("Authorization", authToken)
                .send({
                    handicap: 5
                })
                .expect(400)
                .expect(function (res) {
                    if (!res.body.error) {
                        throw new Error("User account updated");
                    }
                })
                .end(done);
        });
    });

    /**
     * Testing a sign up expect 401 not logged in
     */
    context("PUT users/:id/handicap  Failed", function () {
        it("Should response 401 not logged in", function (done) {
            server.put('/users/' + 4235 + "/handicap")
                .expect(401)
                .end(done);
        });
    });

    /**
     * Testing a correct get users expect 403 not authorized
     */
    context("PUT users/:id/handicap  failed", function () {
        it("Should response 403 not authorized", function (done) {
            server.put('/users/' + 4235 + "/handicap")
                .set("Authorization", authTokenWrong)
                .send({
                    handicap: 2
                })
                .expect(403)
                .expect(function (res) {
                    if (!res.body.error) {
                        throw new Error("Users account updated");
                    }
                })
                .end(done);
        });
    });

    /**
     * Testing a failed get users expect 404 user not found
     */
    context("PUT users/:id/handicap  Failed", function () {
        it("Should response 400  invalid handicap", function (done) {
            server.put('/users/' + 1 + "/handicap")
                .set("Authorization", authToken)
                .send({
                    handicap: 3
                })
                .expect(404)
                .expect(function (res) {
                    if (!res.body.error) {
                        throw new Error("User account updated");
                    }
                })
                .end(done);
        });
    });

});




