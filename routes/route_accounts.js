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


var app = express.Router();

var jwt = require('jsonwebtoken');

/**
 * Make new account
 */
app.post("/users", function (req, res) {

    //todo check if logged in

    //check if every field is entered
    if (!req.body.password
        || !req.body.email || !req.body.handicap || !req.body.type) {

        return res.status(400).send({error: "Not every field is (correctly) filled in."});
    }

    //check if all fields are entered
    if (req.body.password && req.body.email &&
        req.body.handicap && req.body.type) {

        if (req.body.password < 8) {
            return res.status(400).send({error: "Password must be at least 8 characters long."});
        }

        var email = req.body.email.toLowerCase();

        if (!validateEmail(email)) {
            return res.status(400).send({error: "Email address is not valid."});
        }

        if (req.body.type < 1 || req.body.type > 3) {
            return res.status(400).send({error: "Type is not valid."});
        }

        //find email if found do not make account
        User.find({email: email}, function (err, user) {
            if (user.length > 0) {
                return res.status(400).send({error: "Email address already exists."});
            }


            // var idexists = true;
            // while (idexists) {
                var id = (Math.random() * 20000 ) + 10000;
            //
            //     User.find({id: id}, function (err, user) {
            //         if (user.length <= 0) {
            //             idexists = false;
            //         }
            //     });
            // }

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
                    return res.status(201).send({id: id});
                });
            });
        });
    }
    return res.status(400).send({error: "Not every field is (correctly) filled in."})
});

app.get('/testnewuser', function (req, res) {

    var password = "chill";
    bcrypt.genSalt(10, function (err, salt) {
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({error: err.message});
        }

        bcrypt.hash(password, salt, undefined, function (err, hashed) {
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({error: err.message});
            }

            var account = new User({
                id: 123,
                password: hashed,
                email: 'kaas@hotie.com',
                active: true,
                type: 1
            });

            account.save(function (err, result) {
                if (err) {
                    return res.status(500).send({error: err.message});
                }
                res.status(201).send(result);
            });

        });


    });

});

app.get('/testdeleteuser/:id', function(req,res){
    User.find({id: req.params.id}, function(err,resss){
        if(err){
            res.status(404).send();
        }
        res.status(201).send({"message" : "deleted user."});
    }).remove().exec()


});

app.post('/login', function (req, res) {

    if (req.body.id === undefined || req.body.password === undefined) {
        logResponse(401, 'id or password is not supplied');
        return res.status(401).send({error: 'id or password is not supplied'});
    }

    console.log('\tID:\t' + req.body.id + '\n\tpassword:\t*****');

    // Find the user
    if (isNaN(req.body.id)) {
        logResponse(401, 'id is not numeric');
        return res.status(401).send({error: 'id is not numerics'});
    } else {
        User.findOne({id: req.body.id}, function (err, user) {

            // Check to see whether an error occurred
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({error: err.message});
            }

            // Check to see whether a user was found
            if (!user) {
                logResponse(401, 'Invalid credentials');
                return res.status(401).send({error: "Invalid credentials"});
            }

            try {
                // Check to see whether the given password matches the password of the user
                bcrypt.compare(req.body.password, user.password, function (err, success) {
                    if (err) {
                        logResponse(500, err.message);
                        return res.status(500).send({error: err.message});
                    }

                    if (!success) {
                        logResponse(401, 'Invalid credentials');
                        return res.status(401).send({error: "Invalid credentials"});
                    }

                    if(!user.active){
                        logResponse(403, 'User inactive');
                        return res.status(403).send({error: "User inactive"});
                    }
                    // remove sensitive data
                    user.password = undefined;

                    // sign json web token (expires in 12 hours)
                    var token = jwt.sign(user, req.app.get('private-key'), {expiresIn: (60 * 60 * 12)});

                    logResponse(201, 'Token created and in body');
                    return res.status(201).send({
                        success: token,
                        permission: user.type
                    });
                });
            } catch (err) {
                // if the bcrypt fails
                logResponse(500, err.message);
                return res.status(500).send({error: err.message});
            }
        });
    }
});

var currUser;
app.get('/connect/:id', function (req, res) {
    // ID of the requested user
    var id = req.params.id;

    // Find the user that is requested
    User.findOne({id: id}, function (err, myUser) {
        if (err) {
            res.status(404).send({"message": "user not found!"});
        }
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
    if (currUser === undefined) {
        logResponse(500, 'currUser: ' + currUser);
        return res.status(500).send({error: 'currUser: ' + currUser});
    }
    const user = currUser;

    // build the request for the accesstoken
    var options = {
        url: 'https://api.fitbit.com/oauth2/token',
        headers: {
            Authorization: ' Basic MjI4SFREOjQxNzY0Y2FmM2I0OGZhODExY2U1MTRlZjM4YzYyNzkx',
            'Content-Type': ' application/x-www-form-urlencoded'
        },
        body: "client_id=228HTD&grant_type=authorization_code&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Faccounts%2Foauth_callback&code=" + req.query.code
    };
    //send the request
    request.post(options, function (error, response, body) {
        if (error) {
            res.status(500).send();
        }

        var parsedRes = JSON.parse(body);

        var json = {
            userid: parsedRes.user_id, accessToken: parsedRes.access_token, refreshToken: parsedRes.refresh_token
        };

        //find the requested user and add the fitbit
        User.findOneAndUpdate({id: user.id}, {$set: {fitbit: json}}, function (err, result) {
            if (err) {
                res.status(404).send({"message": "user not found!"});
            }
            res.status(201).send({"message": "user connected!"});
        });
    });
});

function logResponse(code, message, depth) {
    if (depth === undefined) depth = '\t';
    if (message === undefined) message = '';
    if (code === undefined) return;

    const COLOR_200 = '\u001B[32m';
    const COLOR_300 = '\u001B[33m';
    const COLOR_400 = '\u001B[31m';
    const COLOR_500 = '\u001B[34m';
    const COLOR_RESET = '\u001B[0m';

    var color = COLOR_200;
    if (code >= 300) color = COLOR_300;
    if (code >= 400) color = COLOR_400;
    if (code >= 500) color = COLOR_500;

    console.log(depth + color + code + COLOR_RESET + ' ' + message + '\n');
}

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