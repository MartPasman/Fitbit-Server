/**
 * Created by martpasman on 15-05-17.
 * aanmaken, verwijderen, inloggen, uitloggen
 */
const express = require("express");
const request = require('request');
const mongoose = require('mongoose');
const shortid = require('shortid');
const bcrypt = require('bcrypt-nodejs');
const fitbitClient = require('fitbit-node');
const jwt = require('jsonwebtoken');

const client_id = '228HTD';
const client_secret = '41764caf3b48fa811ce514ef38c62791';
const client = new fitbitClient(client_id, client_secret);

// const WEBAPP = 'http://127.0.0.1';
const WEBAPP = 'http://178.21.116.109';
const REST = WEBAPP + ':3000';
const redirect = REST + '/accounts/oauth_callback';

const User = require('../model/model_user');
const Competition = require('../model/model_competition');

const app = express.Router();

const authentication = require('../app').authentication;
const fitbitCallSimple = require('../fitbit').fitbitCallSimple;
const today = require('../support').today;
const getYYYYMMDD = require('../support').getYYYYMMDD;
const logResponse = require('../support').logResponse;
const validateMail = require('../support').validateMail;

const ADMIN = 2;
const USER = 1;

// TODO: delete later
app.get('/testnewuseradmin', function (req, res) {

    var password = "administrator";
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
                firstname: "Admin",
                lastname: "user",
                id: 10001,
                password: hashed,
                email: 'geen@mail.nl',
                active: true,
                type: ADMIN,
                birthday: new Date()
            });

            account.save(function (err, result) {
                if (err) {
                    logResponse(500, err.message);
                    return res.status(500).send({error: err.message});
                }
                logResponse(201, 'Admin added.');
                res.status(201).send(result);
            });
        });
    });
});

// TODO: delete later
app.get('/testnewuser', function (req, res) {

    var password = "gebruiker";
    var date = new Date();
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
                firstname: "Generic",
                lastname: "User",
                id: 10002,
                password: hashed,
                email: 'geen@mail.nl',
                active: true,
                type: USER,
                birthday: date
            });

            account.save(function (err, result) {
                if (err) {
                    logResponse(500, err.message);
                    return res.status(500).send({error: err.message});
                }
                logResponse(201, 'User added.');
                res.status(201).send(result);
            });

        });
    });
});

// TODO: delete later
app.get('/testdeleteuser/:id', function (req, res) {
    User.find({id: req.params.id}, function (err, resss) {
        if (err) {
            logResponse(500, err.message);
            res.status(500).send({error: err.message});
        }
        logResponse(201, 'Deleted.');
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
 * user logs in on fitbit.com, fitbit comes back to this ULR containing the access code
 */
app.get('/oauth_callback', function (req, res) {

    const promise = client.getAccessToken(req.query.code, redirect);
    promise.then(function (success) {
        // oath succeeded

        var json = {
            userid: success.user_id,
            accessToken: success.access_token,
            refreshToken: success.refresh_token
        };

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
            res.redirect(WEBAPP + '/admin-dashboard.php');
        });
    }, function (error) {
        logResponse(500, error);
        return res.status(500).send({error: error.errors});
    });
});

/**
 *
 */
app.post('/subscription_callback', function (req, res) {

    // TODO: remove later
    console.log(req.body);

    const notifications = req.body;
    if (!(notifications instanceof Array)) {
        return res.status(400).send({error: 'No array in body'});
    }

    console.log('Received notification(s) from Fitbit.com');
    res.status(204).send();

    // go through all notifications
    notifications.forEach(function (n) {

        const date = Date.parse(n.date);
        console.log('Received notification for subscription id: ' + n.subscriptionId);
        console.log('\t\tFitbit id: ' + n.ownerId);
        console.log('\t\tdate: ' + date);

        // find the with a certain fitbit
        User.findOne({'fitbit.userid': n.ownerId}, {password: false}, function (err, user) {
            if (err) {
                console.error('MongoDB: ' + err.message);
                return;
            }

            if (user === undefined) {
                console.error('User not found.');
                return;
            }

            const userid = user.id;
            const today = new Date();
            var minStart = today, maxEnd = today;

            console.log('User id: ' + userid);

            // get the ongoing competitions
            getOngoingCompetition(function (comps) {

                console.log(comps);

                if (comps !== undefined && comps.length > 0) {
                    // check the dates to get the range that fits all
                    for (var i = 0; i < comps.length; i++) {
                        const c = comps[i];
                        if (c.start < minStart)
                            minStart = c.start;
                        if (c.end < maxEnd)
                            maxEnd = c.end;
                    }
                }

                // also get all ongoing goals
                getUserWithOngoingGoals(userid, function (goals) {

                    console.log(goals);

                    if (goals === undefined) {
                        console.error('Goals undefined.');
                    } else {
                        if (goals.length > 0) {
                            // check the dates to get the range that fits all
                            for (var i = 0; i < goals.length; i++) {
                                const g = goals[i];
                                if (g.start < minStart)
                                    minStart = g.start;
                                if (g.end < maxEnd)
                                    maxEnd = g.end;
                            }
                        }
                    }

                    // get the steps for the time period of the pending goals and competition
                    fitbitCallSimple('https://api.fitbit.com/1/user/[id]/activities/steps/date/' + getYYYYMMDD(minStart, '-') + '/' + getYYYYMMDD(maxEnd, '-') + '.json', user, function (body) {

                        body = JSON.parse(body);
                        const steps = body['activities-steps'];

                        if (steps === undefined) {
                            console.error('Steps undefined.');
                            return;
                        }

                        // for every ongoing competition, save the stats of the user
                        comps.forEach(function (c) {
                            // calculate the total steps in the comps time period
                            var stepsSum = 0;
                            for (var j = 0; j < steps.length; j++) {
                                const date = new Date(steps[j].dateTime);
                                // if the steps fall within the comps time period
                                if (date >= c.start && date <= c.end) {
                                    stepsSum += parseInt(steps[j].value);
                                }
                            }

                            // TODO: calculation subject to change
                            const newScore = user.handicap * stepsSum;
                            const set = {
                                'results.$.score': newScore,
                                'results.$.goalAchieved': (newScore >= c.goal)
                            };

                            Competition.findOneAndUpdate({id: c.id, 'results.userid': userid}, {$set: set}, function (err, result) {
                                if (err) {
                                    console.error('MongoDB: ' + err.message);
                                    return;
                                }

                                console.log('Competition result updated.');
                            });
                        });

                        // for every ongoing goal, save the stats of the user
                        goals.forEach(function (g) {
                            // calculate the total steps in the goals time period
                            var stepsSum = 0;
                            for (var j = 0; j < steps.length; j++) {
                                const date = new Date(steps[j].dateTime);
                                // if the steps fall within the goals time period
                                if (date >= g.start && date <= g.end) {
                                    stepsSum += parseInt(steps[j].value);
                                }
                            }

                            const set = {
                                'goals.$.progress': stepsSum,
                                // max 100 percent
                                'goals.$.percentage': Math.min(100, Math.round(stepsSum / g.goal * 100))
                            };

                            console.log(set);

                            User.update({id: userid, 'goals._id': g._id}, {$set: set}, function (err, newGoal) {
                                if (err) {
                                    console.error('MongoDB: ' + err.message);
                                    return;
                                }

                                console.log(newGoal);

                                console.log('Goal progress updated.');
                            });
                        });
                    });
                });
            });
        });
    });
});

// TODO: move or delete later
app.get('/:id/goals/ongoing', function (req, res) {
    getUserWithOngoingGoals(req.params.id, function (goals) {
        logResponse(200, 'Ongoing goals send.');
        res.status(200).send(goals);
    });
});

function getOngoingCompetition(callback) {
    const where = {
        start: {
            $lt: today()
        },
        end: {
            $gt: today()
        }
    };

    Competition.find(where, {}, function (err, comps) {
        if (err) {
            console.error('Competitions: MongoDB: ' + err.message);
        }

        callback(comps)
    });
}

function getUserWithOngoingGoals(userid, callback) {
    User.findOne({id: userid}, {}, function (err, user) {
        if (err) {
            console.error('Goals: MongoDB: ' + err.message);
        }

        if (user === null) {
            return;
        }

        const goals = [];
        for (var i = 0; i < user.goals.length; i++) {
            const g = user.goals[i];
            if (g.start <= today() && g.end >= today()) {
                goals.push(g);
            }
        }

        callback(goals);
    });
}

/**
 * Checks if user is logged in
 * all requests below this function will automatically go through this one first.
 */
app.use('/', function (req, res, next) {
    jwt.verify(req.get("Authorization"), req.app.get('private-key'), function (err, decoded) {
        if (err) {
            logResponse(401, err.message);
            return res.status(401).send({error: "User is not logged in."});
        }

        // Save user for future purposes
        res.user = decoded._doc;

        next();
    });
});

/**
 * Make new account
 */
app.post("/", function (req, res) {

    if (res.user.type !== ADMIN) {
        logResponse(403, "Not authorized to make this request");
        return res.status(403).send({error: "Not authorized to make this request"});
    }

    //check if all fields are entered
    if (req.body.firstname && req.body.lastname && req.body.password && req.body.email && req.body.birthday &&
        req.body.type) {

        if (req.body.password.length < 8) {
            logResponse(400, 'Password too short.');
            return res.status(400).send({error: "Password must be at least 8 characters long."});
        }

        var day = req.body.birthday.substring(0, 2);
        var month = req.body.birthday.substring(3, 5);
        var year = req.body.birthday.substring(6, 10);
        var dateOfBirth = new Date(month + '/' + day + '/' + year);

        var email = req.body.email.toLowerCase();

        if (!validateMail(email)) {
            logResponse(400, 'Email not valid.');
            return res.status(400).send({error: "Email address is not valid."});
        }

        if (req.body.type === undefined || isNaN(req.body.type) || req.body.type < 1 || req.body.type > 2) {
            logResponse(400, 'Type is not valid');
            return res.status(400).send({error: "Type is not valid."});
        }

        if (req.body.type === USER && req.body.handicap === undefined || isNaN(req.body.type) || req.body.handicap < 1 || req.body.handicap > 3) {
            logResponse(400, 'Handicap is not valid.');
            return res.status(400).send({error: "Handicap is not valid."});
        }

        //find email if found do not make account
        User.find({email: email}, function (err, user) {
            if (user.length > 0) {
                logResponse(400, 'Email already exists');
                return res.status(400).send({error: "Email address already exists."});
            }

            generateId(function (id) {
                bcrypt.genSalt(10, function (err, salt) {
                    if (err) {
                        logResponse(500, "Can not gen salt: " + err.message);
                        return res.status(500).send({error: err.message});
                    }

                    bcrypt.hash(req.body.password, salt, undefined, function (err, hashed) {
                        if (err) {
                            logResponse(500, "Can not hash account: " + err.message);
                            return res.status(500).send({error: err.message});
                        }

                        var account;
                        if (req.body.type === ADMIN) {

                            account = new User({
                                firstname: req.body.firstname,
                                lastname: req.body.lastname,
                                id: id,
                                birthday: dateOfBirth,
                                password: hashed,
                                email: email,
                                active: true,
                                type: req.body.type
                            });
                        }
                        else {
                            account = new User({
                                firstname: req.body.firstname,
                                lastname: req.body.lastname,
                                id: id,
                                birthday: dateOfBirth,
                                password: hashed,
                                email: email,
                                active: true,
                                type: req.body.type,
                                handicap: req.body.handicap
                            });
                        }


                        account.save(function (err, result) {
                            if (err) {
                                logResponse(500, "Can not save account: " + err.message);
                                return res.status(500).send({error: err.message});
                            }
                            logResponse(201, "id given");
                            return res.status(201).send({id: id});
                        });
                    });
                });
            });
        });
    } else {
        logResponse(400, "Not every field is (correctly) filled in.");
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
                    logResponse(401, 'Invalid credentials');
                    return res.status(401).send({error: "Invalid credentials"});
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
 * Get all users without passwords
 */
app.get('/', function (req, res) {

    if (res.user.type !== ADMIN) {
        logResponse(403, "User not authorized to make this request");
        return res.status(403).send({error: "User not authorized to make this request"});
    }

    User.find({type: USER}, {password: 0, _id: 0, __v: 0}, function (err, users) {

        if (err) {
            logResponse(500, "Something went wrong");
            return res.status(500).send({error: "Something went wrong"})
        }
        if (users.length === 0) {
            logResponse(404, "No users found");
            return res.status(404).send({error: "No users found"});
        }
        logResponse(200, "User list sent");
        return res.status(200).send({success: users});
    })
});

/**
 *
 */
app.get('/:id/connect', function (req, res) {

    if (res.user.type !== ADMIN) {
        logResponse(403, "Not authorized to make this request");
        return res.status(403).send({error: "Not authorized to make this request"});
    }

    if (req.params.id === undefined || isNaN(req.params.id)) {
        logResponse(400, "Invalid id.");
        return res.status(400).send({error: "Invalid id."});
    }

    const state = mapOAuthRequest(req.params.id);

    // get the authorisation URL to get the acces code from fitbit.com
    const authURL = client.getAuthorizeUrl('activity profile settings sleep', redirect, undefined, state);

    //return to this URL to let the user login
    logResponse(201, "authURL created");
    return res.status(201).send({success: authURL});
});

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