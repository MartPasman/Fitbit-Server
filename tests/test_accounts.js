/**
 * account tests
 */


var mocha = require('mocha');
var supertest = require('supertest');

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