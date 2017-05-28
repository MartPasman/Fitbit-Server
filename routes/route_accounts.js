/**
 * Created by martpasman on 15-05-17.
 * aanmaken, verwijderen, inloggen, uitloggen
 */

var express = require("express");
var request = require('request');
var mongoose = require('mongoose');
var shortid = require('shortid');
var bcrypt = require('bcrypt-nodejs');
var fitbitClient = require('fitbit-node');
var jwt = require('jsonwebtoken');
var base64 = require('base64_utility');

var client_id = '228HTD';
var client_secret = '41764caf3b48fa811ce514ef38c62791';
var redirect = 'http://127.0.0.1:3000/accounts/oauth_callback';
var client = new fitbitClient(client_id, client_secret);

var User = require('../model/model_user');

var app = express.Router();


// TODO: delete later
app.get('/testnewuseradmin', function (req, res) {

    var password = "chillchill";
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
                firstname: "aa",
                lastname: "bb",
                id: 321,
                password: hashed,
                email: 'ham@hotie.com',
                active: true,
                type: 3
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

// TODO: delete later
app.get('/testnewuser', function (req, res) {

    var password = "chillchill";
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
                email: 'ham@hotie.com',
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

// TODO: delete later
app.get('/testdeleteuser/:id', function (req, res) {
    User.find({id: req.params.id}, function (err, resss) {
        if (err) {
            res.status(500).send({error: err.message});
        }
        res.status(201).send({"message": "deleted user."});
    }).remove().exec()
});

/**
 * Login
 */
app.post('/login', function (req, res) {

    if (req.body.id === undefined || req.body.password === undefined) {
        logResponse(400, 'Invalid credentials');
        return res.status(400).send({error: 'Invalid credentials'});
    }

    console.log('\tID:\t' + req.body.id + '\n\tpassword:\t*****');

    // Find the user
    if (isNaN(req.body.id)) {
        logResponse(400, 'Invalid credentials');
        return res.status(400).send({error: 'Invalid credentials'});
    } else {
        User.findOne({id: req.body.id}, function (err, user) {

            // Check to see whether an error occurred
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({error: err.message});
            }

            // Check to see whether a user was found
            if (!user) {
                logResponse(400, 'Invalid credentials');
                return res.status(400).send({error: "Invalid credentials"});
            }

            try {
                // Check to see whether the given password matches the password of the user
                bcrypt.compare(req.body.password, user.password, function (err, success) {
                    if (err) {
                        logResponse(500, err.message);
                        return res.status(500).send({error: err.message});
                    }

                    if (!success) {
                        logResponse(400, 'Invalid credentials');
                        return res.status(400).send({error: "Invalid credentials"});
                    }

                    if (!user.active) {
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
                        permission: user.type,
                        userid: req.body.id
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

/**
 * Checks if user is logged in and if user is administrator
 * all requests below this function will automatically go through this one first!
 * If your page doesn't need to be requested by admin, put it above this function
 */
app.use('/', function (req, res, next) {

    jwt.verify(req.get("Authorization"), req.app.get('private-key'), function (err, decoded) {
        if (err) {
            logResponse(401, err.message);
            return res.status(401).send({error: "User is not logged in."});
        }

        // Save user for future purposes
        res.user = decoded._doc;
        if (res.user.type !== 3) {
            logResponse(403, "Not authorized to make this request");
            return res.status(403).send({error: "Not authorized to make this request"});
         }

         next();
     });

});

/**
 * Make new account
 */
app.post("/", function (req, res) {

    if (res.user.type !== 3) {
        logResponse(403, "Not authorized to make this request");
        return res.status(403).send({error: "Not authorized to make this request"});
    }


    //check if every field is entered
    if (!req.body.password || !req.body.email || !req.body.type) {
        return res.status(400).send({error: "Not every field is (correctly) filled in."});
    }

    //check if all fields are entered
    if (req.body.firstname && req.body.lastname && req.body.password && req.body.email &&
        req.body.type) {

        if (req.body.password.length < 8) {
            return res.status(400).send({error: "Password must be at least 8 characters long."});
        }

        var email = req.body.email.toLowerCase();

        if (!validateEmail(email)) {
            return res.status(400).send({error: "Email address is not valid."});
        }

        if (isNaN(req.body.type) || req.body.type < 1 || req.body.type > 3) {
            return res.status(400).send({error: "Type is not valid."});
        }

        if (isNaN(req.body.type) || req.body.handicap < 1 || req.body.handicap > 3) {
            return res.status(400).send({error: "Handicap is not valid."});
        }

        if (req.body.type === 1 && req.body.handicap === undefined) {
            return res.status(400).send({error: "Handicap not provided"});
        }

        //find email if found do not make account
        User.find({email: email}, function (err, user) {
            console.log(user);
            if (user.length > 0) {
                return res.status(400).send({error: "Email address already exists."});
            }

            generateId(function (id) {
                bcrypt.genSalt(10, function (err, salt) {
                    if (err) {
                        return res.status(500).send({error: err.message});
                    }

                    bcrypt.hash(req.body.password, salt, undefined, function (err, hashed) {
                        if (err) {
                            return res.status(500).send({error: err.message});
                        }

                        var account;
                        if (req.body.type === 2 || req.body.type === 3) {

                            account = new User({
                                firstname: req.body.firstname,
                                lastname: req.body.lastname,
                                id: id,
                                password: hashed,
                                email: email,
                                active: true,
                                type: req.body.type,
                                handicap: undefined
                            });
                        }
                        else {
                            account = new User({
                                firstname: req.body.firstname,
                                lastname: req.body.lastname,
                                id: id,
                                password: hashed,
                                email: email,
                                active: true,
                                type: req.body.type,
                                handicap: req.body.handicap
                            });
                        }


                        account.save(function (err, result) {
                            if (err) {
                                return res.status(500).send({error: err.message});
                            }
                            return res.status(201).send({id: id});
                        });
                    });
                });
            });
        });
    } else {
        return res.status(400).send({error: "Not every field is (correctly) filled in."});
    }
});

/**
 * Request for updating password
 */
app.put("/password", function (req, res) {
    if (req.body.old === undefined || req.body.new1 === undefined || req.body.new2 === undefined || req.body.new1 !== req.body.new2) {
        logResponse(400, 'Wrong information supplied');
        return res.status(400).send({error: "Wrong information supplied"});
    }

    User.findOne({id: res.user.id}, function (err, user) {

        // Check to see whether an error occurred
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({error: err.message});
        }

        // Check to see whether a user was found
        if (!user) {
            logResponse(404, 'User not found');
            return res.status(404).send({error: "User not found"});
        }

        try {
            // Check to see whether the given password matches the password of the user
            bcrypt.compare(req.body.old, user.password, function (err, success) {
                if (err) {
                    logResponse(500, err.message);
                    return res.status(500).send({error: err.message});
                }

                if (!success) {
                    logResponse(400, 'Invalid credentials');
                    return res.status(400).send({error: "Invalid credentials"});
                }

                //Chek if the user is active
                if (!user.active) {
                    logResponse(403, 'User inactive');
                    return res.status(403).send({error: "User inactive"});
                }
                // remove sensitive data
                user.password = undefined;

                //Generate salt for password
                bcrypt.genSalt(10, function (err, salt) {
                    if (err) {
                        logResponse(500, err.message);
                        return res.status(500).send({error: err.message});
                    }

                    //Hash password
                    bcrypt.hash(req.body.new1, salt, undefined, function (err, hashed) {
                        if (err) {
                            logResponse(500, err.message);
                            return res.status(500).send({error: err.message});
                        }

                        //Update password in database
                        User.update({id: res.user.id}, {$set: {password: hashed}}, function (err, result) {
                            // Check to see whether an error occurred
                            if (err) {
                                logResponse(500, err.message);
                                return res.status(500).send({error: err.message});
                            }

                            // Check to see whether a user was found
                            if (!result) {
                                logResponse(404, 'User not found');
                                return res.status(404).send({error: "User not found"});
                            }

                            logResponse(201, 'Password updated');
                            return res.status(201).send({
                                success: true
                            });
                        });

                    });
                });
            });
        } catch (err) {
            // if the bcrypt fails
            logResponse(500, err.message);
            return res.status(500).send({error: err.message});
        }
    });
});

/**
 *
 */
app.get('/:id/connect', function (req, res) {

    if (req.params.id === undefined || isNaN(req.params.id)) {
        logResponse(400, "Invalid id.");
        return res.status(400).send({error: "Invalid id."});
    }

    const state = mapOAuthRequest(req.params.id);

    // get the authorisation URL to get the acces code from fitbit.com
    const authURL = client.getAuthorizeUrl('activity profile settings sleep', redirect, undefined, state);

    //redirect to this URL to let the user login
    res.redirect(authURL);
});

/**
 * user logs in on fitbit.com, fitbit comes back to this ULR containing the access code
 */
app.get('/oauth_callback', function (req, res) {

    if (res.user.type !== 3) {
        logResponse(403, "Not authorized to make this request");
        return res.status(403).send({error: "Not authorized to make this request"});
    }

    const auth = base64.encode(client_id + ':' + client_secret);

    //send the request
    request.post({
        url: 'https://api.fitbit.com/oauth2/token',
        headers: {
            Authorization: ' Basic ' + auth,
            'Content-Type': ' application/x-www-form-urlencoded'
        },
        body: "expires_in=" + 60 + "&client_id=" + client_id + "&grant_type=authorization_code&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Faccounts%2Foauth_callback&code=" + req.query.code
    }, function (error, response, body) {
        if (error) {
            logResponse(500, error);
            return res.status(500).send({error: error});
        }

        var parsedRes = JSON.parse(body);

        var json = {
            userid: parsedRes.user_id,
            accessToken: parsedRes.access_token,
            refreshToken: parsedRes.refresh_token
        };

        console.log(json);

        const userid = getOAuthMapUserid(req.query.state);
        if (userid === undefined) {
            logResponse(500, 'OAuth state was lost.');
            return res.status(500).send({error: 'OAuth state was lost.'});
        }

        //find the requested user and add the fitbit
        User.findOneAndUpdate({id: userid}, {$set: {fitbit: json}}, function (err, result) {
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({error: err.message});
            }

            if (result === undefined) {
                logResponse(404, 'User could not be found.');
                return res.status(404).send({error: 'User could not be found.'});
            }

            logResponse(201, 'Fitbit connected.');
            return res.status(201).send({success: 'Fitbit connected!'});
        });
    });
});

/**
 * Get all users without passwords
 */
app.get('/', function (req, res) {

    if (res.user.type !== 3) {
        logResponse(403, "User not authorized to make this request");
        return res.status(403).send({error: "User not authorized to make this request"});
    }

    User.find({type: 1}, {password: 0, _id: 0, __v: 0}, function (err, users) {

        if (err) {
            logResponse(500, "Something went wrong");
            return res.status(500).send({error: "Something went wrong"})
        }
        if (users.length === 0) {
            logResponse(404, "No users found");
            return res.status(404).send({error: "No users found"});
        }
        logResponse(200, users);
        return res.status(200).send({success: users});
    })
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

const OAuthMap = [];
function mapOAuthRequest(userid) {
    const state = shortid.generate();

    OAuthMap.push({
        userid: userid,
        state: state
    });

    return state;
}

function getOAuthMapUserid(state) {
    for (var i = 0; i < OAuthMap.length; i++) {
        const obj = OAuthMap[i];
        if (obj !== undefined && obj.state === state) {
            const userid = obj.userid;
            OAuthMap[i] = undefined;
            return userid;
        }
    }
    return undefined;
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

/**
 * Function to generate unique id and check if it already exists
 * @param callback
 */
function generateId(callback) {
    var id = Math.ceil((Math.random() * 20000 ) + 10000);

    User.find({id: id}, function (err, user) {
        if (user.length === 0) {
            callback(id);
        } else {
            generateId(callback);
        }
    });
}

module.exports = app;