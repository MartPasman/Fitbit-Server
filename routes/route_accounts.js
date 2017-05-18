/**
 * Created by martpasman on 15-05-17.
 * aanmaken, verwijderen, inloggen, uitloggen
 */

var express = require("express");
// var router = express.Router();
var mongoose = require('mongoose');
var User = require('../model/model_user');
var shortid = require('shortid');
var bcrypt = require('bcrypt-nodejs');
var fitbitClient = require('fitbit-node');
var consumer_key = '228HTD';
var client_secret = '41764caf3b48fa811ce514ef38c62791';
var redirect = 'http://127.0.0.1:3000/accounts/oauth_callback';
var client = new fitbitClient(consumer_key, client_secret);
var request = require('request');


var app = express();

var jwt = require('jsonwebtoken');
var logResponse = require('../app').logResponse;

/**
 * Make new account
 */
app.post("/users", function (req, res) {

    //check if every field is entered
    if (!req.body.password
        || !req.body.email || !req.body.handicap || !req.body.type) {

        return res.status(400).send({error: "Not every field is (correctly) filled in"});
    }

    //check if all fields are entered
    if (req.body.password && req.body.email &&
        req.body.handicap && req.body.type) {

        if (req.body.password < 8) {
            return res.status(400).send({error: "Password must be at least 8 characters long"});
        }

        var email = req.body.email.toLowerCase();

        if (!validateEmail(email)) {
            return res.status(400).send({error: "Email address is not valid"});
        }

        if (req.body.type < 1 || req.body.type > 3) {
            return res.status(400).send({error: "Type is not valid"});
        }

        //find email if found do not make account
        User.find({email: email}, function (err, user) {
            if (user.length > 0) {
                return res.status(400).send({error: "Email address already exists"});
            }


            var idexists = true;
            while (idexists) {
                var id = (Math.random() * 20000 ) + 10000;

                User.find({id: id}, function (err, user) {
                    if (user.length <= 0) {
                        idexists = false;
                    }
                });
            }

            bcrypt.genSalt(10, function (err, salt) {
                if (err) {
                    return res.status(500).send({error: err.message});
                }

                bcrypt.hash(req.body.password, salt, undefined, function (err, hashed) {
                    if (err) {
                        return res.status(500).send({error: err.message});
                    }

                    var account = new User({
                        id: id,
                        password: hashed,
                        email: email,
                        active: true,
                        type: req.body.type
                    });


                    account.save(function (err, result) {
                        if (err) {
                            return res.status(500).send({error: err.message});
                        }
                    });
                    res.status(201).send({id: id});

                });
            });
        });
    }

});


app.post('/login', function (req, res) {

    if (req.body.id === undefined || req.body.password === undefined) {
        // logResponse(400, 'id or password is not supplied');
        return res.status(400).send({error: 'id or password is not supplied'});
    }

    console.log('\tID:\t' + req.body.id + '\n\tpassword:\t*****');

    // Find the user
    User.findOne({id: req.body.id}, function (err, user) {

        // Check to see whether an error occurred
        if (err) {
            //  logResponse(500, err.message);
            return res.status(500).send({error: err.message});
        }

        // Check to see whether a user was found
        if (!user) {
            //   logResponse(400, 'Invalid credentials');
            return res.status(400).send({error: "Invalid credentials"});
        }

        try {
            // Check to see whether the given password matches the password of the user
            bcrypt.compare(req.body.password, user.password, function (err, success) {
                if (err) {
                    //   logResponse(500, err.message);
                    return res.status(500).send({error: err.message});
                }

                if (!success) {
                    //   logResponse(400, 'Invalid credentials');
                    return res.status(400).send({error: "Invalid credentials"});
                }

                // remove sensitive data
                user.password = undefined;

                // sign json web token (expires in 12 hours)
                var token = jwt.sign(user, req.app.get('private-key'), {expiresIn: (60 * 60 * 12)});

                //logResponse(201, 'Token created and in body');
                res.status(201).send({
                    succes: token
                });
            });
        } catch (err) {
            // if the bcrypt fails
            //logResponse(500, err.message);
            return res.status(500).send({error: err.message});
        }
    });
    //logResponse(500);
    return res.status(500).send();

});
var currUser;
app.get('/oauth/:id', function (req, res) {
    // ID of the requested user
     var id = req.params.id;

    // Find the user that is requested
     User.findOne({id: id}, function(err, myUser){
        if(err)
            console.log("error in finding user");

            currUser = myUser;

      });

    // get the authorisation URL to get the acces code from fitbit.com
    var authURL = client.getAuthorizeUrl('activity profile settings sleep weight', redirect);
    //redirect to this URL to let the user login
    res.redirect(authURL);

});

/**
 * user logs in on fitbit.com, fitbit comes back to this ULR containing the acces code
 */
app.get('/oauth_callback', function (req, res) {
    console.log(req.query.code);

    // build the request for the accesstoken
    var options = {
        url: 'https://api.fitbit.com/oauth2/token',
        headers: {
            'Authorization': ' Basic MjI4SFREOjQxNzY0Y2FmM2I0OGZhODExY2U1MTRlZjM4YzYyNzkx',
            'Content-Type': ' application/x-www-form-urlencoded'
        },
        body: "client_id=228HTD&grant_type=authorization_code&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Faccounts%2Foauth_callback&code=" + req.query.code

    };
    //send the request
    request.post(options, function (error, response, body) {
        console.log(body);

        var parsedRes = JSON.parse(body);
        var access_token = parsedRes.access_token;
        var refresh_token = parsedRes.refresh_token;

        var json = {
            userid: currUser.id, accesToken: access_token, refreshtoken: refresh_token
        };

        //find the requested user and add the fitbit
        User.findOneAndUpdate({id: currUser.id}, {$set: { fitbit: json}}, function(err,res){
            console.log(res);
        });


    });

});

/**
 * Check if a given email is a valid email
 * @param email
 * @returns {boolean}
 */
function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

module.exports = app;