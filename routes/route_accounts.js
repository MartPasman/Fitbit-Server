/**
 * Created by martpasman on 15-05-17.
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
const redirectURL = REST + '/accounts/oauth_callback';

const User = require('../model/model_user');
const Competition = require('../model/model_competition');

const app = express.Router();

const fitbitCallSimple = require('../fitbit').fitbitCallSimple;
const today = require('../support').today;
const getYYYYMMDD = require('../support').getYYYYMMDD;
const logResponse = require('../support').logResponse;

const USER = 1;
const ADMIN = 2;

// TODO: delete later
app.get('/testnewuseradmin', function (req, res) {

    var password = "administrator";
    bcrypt.genSalt(10, function (err, salt) {
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({message: err.message});
        }

        bcrypt.hash(password, salt, undefined, function (err, hashed) {
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({message: err.message});
            }

            var account = new User({
                firstname: "Admin",
                lastname: "user",
                id: 10001,
                password: hashed,
                active: true,
                type: ADMIN,
                birthday: new Date()
            });

            account.save(function (err, result) {
                if (err) {
                    logResponse(500, err.message);
                    return res.status(500).send({message: err.message});
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
            return res.status(500).send({message: err.message});
        }

        bcrypt.hash(password, salt, undefined, function (err, hashed) {
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({message: err.message});
            }

            var account = new User({
                firstname: "Martje",
                lastname: "Kasii",
                id: 10005,
                password: hashed,
                active: false,
                type: USER,
                birthday: date
            });

            account.save(function (err, result) {
                if (err) {
                    logResponse(500, err.message);
                    return res.status(500).send({message: err.message});
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
            res.status(500).send({message: err.message});
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
        logResponse(400, 'Bad request');
        return res.status(400).send({message: 'Bad request'});
    }

    console.log('\tID:\t' + req.body.id + '\n\tpassword:\t*****');

    // Find the user
    if (isNaN(req.body.id)) {
        logResponse(400, 'ID not numerical');
        return res.status(400).send({message: 'ID not numerical'});
    }

    User.findOne({id: req.body.id}, function (err, user) {

        // Check to see whether an error occurred
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({message: err.message});
        }

        // Check to see whether a user was found
        if (!user) {
            logResponse(401, 'Invalid credentials');
            return res.status(401).send({message: "Invalid credentials"});
        }

        // Check to see whether the given password matches the password of the user
        bcrypt.compare(req.body.password, user.password, function (err, success) {
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({message: err.message});
            }

            if (!success) {
                logResponse(401, 'Invalid credentials');
                return res.status(401).send({message: "Invalid credentials"});
            }

            if (!user.active) {
                logResponse(403, 'User inactive');
                return res.status(403).send({message: "User inactive"});
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
    });
});

/**
 * user logs in on fitbit.com, fitbit comes back to this ULR containing the access code
 */
app.get('/oauth_callback', function (req, res) {

    const userid = getOAuthMapUserid(req.query.state);

    const promise = client.getAccessToken(req.query.code, redirectURL);
    promise.then(function (success) {
        // oath succeeded

        var json = {
            userid: success.user_id,
            accessToken: success.access_token,
            refreshToken: success.refresh_token
        };

        // check if this fitbit was not connected to some other user already
        User.find({'fitbit.userid': json.userid}, {}, function (err, result) {
            if (err) {
                logResponse(500, '1: ' + err.message);
                return redirect(500, err.message);
            }

            // if the fitbit was already connected to some user
            if (result === undefined || result.length > 0) {
                logResponse(403, 'Fitbit can only be connected to a single user.');
                return redirect(403, 'Fitbit can only be connected to a single user.');
            }

            if (userid === undefined) {
                logResponse(500, 'OAuth state was lost.');
                return redirect(500, 'OAuth state was lost.');
            }

            //find the requested user and add the fitbit
            User.findOneAndUpdate({id: userid}, {$set: {fitbit: json}}, function (err, result) {
                if (err) {
                    logResponse(500, '2: ' + err.message);
                    return redirect(500, err.message);
                }

                if (result === undefined) {
                    logResponse(404, 'User could not be found.');
                    return redirect(404, 'User could not be found.');
                }

                logResponse(201, 'Fitbit connected.');
                redirect(201, 'Fitbit connected.');
            });
        });
    }, function (error) {
        logResponse(500, '3: ' + error);
        return redirect(500, error);
    });

    function redirect(code, message) {
        res.redirect(WEBAPP + '/admin-dashboard.php?id=' + userid + '&statusCode=' + code + '&message=' + encodeURI(message));
    }
});

/**
 *
 */
app.post('/subscription_callback', function (req, res) {

    // TODO: remove later
    console.log(req.body);

    const notifications = req.body;
    if (!(notifications instanceof Array)) {
        return res.status(400).send({message: 'No array in body'});
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

            if (user === undefined || user === null) {
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

                        console.log('Got results...');

                        // for every ongoing competition, save the stats of the user
                        comps.forEach(function (c) {
                            console.log(c);

                            // calculate the total steps in the comps time period
                            var stepsSum = 0;
                            for (var j = 0; j < steps.length; j++) {
                                const date = new Date(steps[j].dateTime);
                                // if the steps fall within the comps time period
                                if (date >= c.start && date <= c.end) {
                                    stepsSum += parseInt(steps[j].value);
                                }
                            }

                            console.log(stepsSum);

                            // TODO: calculation subject to change
                            const newScore = user.handicap * stepsSum;

                            // calculate new shared score
                            var newSharedScore = newScore;
                            for (var k = 0; k < c.results.length; k++) {
                                const r = c.results[k];
                                // count all other scores
                                if (parseInt(r.userid) !== parseInt(user.id)) {
                                    newSharedScore += r.score;
                                }
                            }

                            console.log(newScore);

                            // set the new scores and stats
                            const set = {
                                'results.$.score': newScore,
                                'results.$.goalAchieved': (newScore >= c.goal),
                                sharedScore: newSharedScore,
                                sharedGoalProgress: Math.min(100, Math.floor(newSharedScore / c.sharedGoal * 100)),
                                sharedGoalAchieved: (newSharedScore >= c.sharedGoal)
                            };

                            console.log(set);

                            Competition.findOneAndUpdate({
                                id: c.id,
                                'results.userid': userid
                            }, {$set: set}, function (err, result) {
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
                                'goals.$.percentage': Math.min(100, Math.floor(stepsSum / g.goal * 100))
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
            $lte: today()
        },
        end: {
            $gte: today()
        }
    };

    console.log(where);

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
            return res.status(401).send({message: "User is not logged in."});
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
        return res.status(403).send({message: "Not authorized to make this request"});
    }

    //check if all fields are entered
    if (req.body.firstname && req.body.lastname && req.body.password && req.body.birthday &&
        req.body.type && req.body.firstname.length < 50 && req.body.lastname.length < 50) {

        if (req.body.password.length < 8) {
            logResponse(400, 'Password too short.');
            return res.status(400).send({message: "Password must be at least 8 characters long."});
        }

        var dateOfBirth = new Date(req.body.birthday);

        if (req.body.type === undefined || isNaN(req.body.type) || req.body.type < 1 || req.body.type > 2) {
            logResponse(400, 'Type is not valid');
            return res.status(400).send({message: "Type is not valid."});
        }

        if (req.body.type === USER && req.body.handicap === undefined || isNaN(req.body.type) || req.body.handicap < 1 || req.body.handicap > 3) {
            logResponse(400, 'Handicap is not valid.');
            return res.status(400).send({message: "Handicap is not valid."});
        }


        generateId(function (id) {
            bcrypt.genSalt(10, function (err, salt) {
                if (err) {
                    logResponse(500, "Can not gen salt: " + err.message);
                    return res.status(500).send({message: err.message});
                }

                bcrypt.hash(req.body.password, salt, undefined, function (err, hashed) {
                    if (err) {
                        logResponse(500, "Can not hash account: " + err.message);
                        return res.status(500).send({message: err.message});
                    }

                    const accountDetails = {
                        firstname: req.body.firstname,
                        lastname: req.body.lastname,
                        id: id,
                        birthday: dateOfBirth,
                        password: hashed,
                        active: true,
                        type: req.body.type
                    };

                    // if it is a user, add the handicap
                    if (req.body.type === USER) {
                        accountDetails.handicap = req.body.handicap;
                    }

                    const account = new User(accountDetails);

                    account.save(function (err, result) {
                        if (err) {
                            logResponse(500, "Can not save account: " + err.message);
                            return res.status(500).send({message: err.message});
                        }
                        logResponse(201, "id given");
                        return res.status(201).send({id: id});
                    });
                });
            });
        });
    } else {
        logResponse(400, "Not every field is (correctly) filled in.");
        return res.status(400).send({message: "Not every field is (correctly) filled in."});
    }
});

/**
 * Request for updating password
 */
app.put("/password", function (req, res) {

    if (req.body.old === undefined || req.body.new1 === undefined || req.body.new2 === undefined || req.body.new1 !== req.body.new2) {
        logResponse(400, 'Wrong information supplied');
        return res.status(400).send({message: "Wrong information supplied"});
    }

    User.findOne({id: res.user.id}, function (err, user) {

        // Check to see whether an error occurred
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({message: err.message});
        }

        // Check to see whether a user was found
        if (!user) {
            logResponse(404, 'User not found');
            return res.status(404).send({message: "User not found"});
        }

        try {
            // Check to see whether the given password matches the password of the user
            bcrypt.compare(req.body.old, user.password, function (err, success) {
                if (err) {
                    logResponse(500, err.message);
                    return res.status(500).send({message: err.message});
                }

                if (!success) {
                    logResponse(401, 'Invalid credentials');
                    return res.status(401).send({message: "Invalid credentials"});
                }

                //Chek if the user is active
                if (!user.active) {
                    logResponse(403, 'User inactive');
                    return res.status(403).send({message: "User inactive"});
                }
                // remove sensitive data
                user.password = undefined;

                //Generate salt for password
                bcrypt.genSalt(10, function (err, salt) {
                    if (err) {
                        logResponse(500, err.message);
                        return res.status(500).send({message: err.message});
                    }

                    //Hash password
                    bcrypt.hash(req.body.new1, salt, undefined, function (err, hashed) {
                        if (err) {
                            logResponse(500, err.message);
                            return res.status(500).send({message: err.message});
                        }

                        //Update password in database
                        User.update({id: res.user.id}, {$set: {password: hashed}}, function (err, result) {
                            // Check to see whether an error occurred
                            if (err) {
                                logResponse(500, err.message);
                                return res.status(500).send({message: err.message});
                            }

                            // Check to see whether a user was found
                            if (!result) {
                                logResponse(404, 'User not found');
                                return res.status(404).send({message: "User not found"});
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
            return res.status(500).send({message: err.message});
        }
    });
});

/**
 * Get all users without passwords
 */
app.get('/', function (req, res) {

    User.find({type: USER}, {password: 0, _id: 0, __v: 0}, function (err, users) {

        if (err) {
            logResponse(500, "Something went wrong");
            return res.status(500).send({message: "Something went wrong"})
        }
        if (users.length === 0) {
            logResponse(404, "No users found");
            return res.status(404).send({message: "No users found"});
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
        return res.status(403).send({message: "Not authorized to make this request"});
    }

    if (req.params.id === undefined || isNaN(req.params.id)) {
        logResponse(400, "Invalid id.");
        return res.status(400).send({message: "Invalid id."});
    }

    // check if the account to be connected is a user
    User.findOne({id: req.params.id, type: USER}, {}, function (err, result) {
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({message: err.message});
        }

        // the account was not found or is not a user
        if (result === undefined) {
            logResponse(404, 'Fitbit can only be connected to a user.');
            return res.status(404).send({message: 'Fitbit can only be connected to a user.'});
        }

        const state = mapOAuthRequest(req.params.id);

        // get the authorisation URL to get the access code from fitbit.com
        const authURL = client.getAuthorizeUrl('activity profile settings sleep', redirectURL, undefined, state);

        //return to this URL to let the user login
        logResponse(201, "authURL created");
        return res.status(201).send({success: authURL});
    });
});

/**
 *  Revoke access token and delete the Fitbit from user
 */
app.post('/:id/revoke', function (req, res) {

    if (res.user.type !== ADMIN) {
        logResponse(403, "Not authorized to make this request.");
        return res.status(403).send({message: "Not authorized to make this request."});
    }

    if (req.params.id === undefined || isNaN(req.params.id)) {
        logResponse(400, "Invalid id given.");
        return res.status(400).send({message: "Invalid id given."});
    }

    User.findOne({type: USER, id: req.params.id}, {password: 0, _id: 0, __v: 0}, function (err, user) {
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({message: err.message})
        }

        if (user === undefined) {
            logResponse(404, "User account could not be found.");
            return res.status(404).send({message: "User account could not be found."});
        }

        if (user.fitbit === undefined) {
            logResponse(404, "No connected Fitbit found.");
            return res.status(404).send({message: "No connected Fitbit found."});
        }

        const revoke = client.revokeAccessToken(user.fitbit.accessToken);
        revoke.then(removeFitbit, removeFitbit);
    });

    function removeFitbit() {
        User.findOneAndUpdate({id: req.params.id}, {$unset: {fitbit: 1}}, function (err, result) {
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({message: err.message});
            }
            if (result === undefined) {
                logResponse(404, {message: "User account could not be found."});
                return res.status(404).send({message: "User account could not be found."});
            }
            return res.status(204).send();
        });
    }
});


/**
 * Check what authority user has and send back
 */
app.post('/authenticate', function (req, res) {

    var url = req.body.url;

    switch (url) {
        case '/admin-dashboard.php':
        case '/admin-settings.php':
            if (res.user.type === ADMIN) {
                return res.status(200).send();
            } else if (res.user.type === USER) {
                return res.status(403).send();
            } else {
                return res.status(401).send();
            }
            break;
        case '/results.php':
        case '/user-settings.php':
            if (res.user.type === ADMIN) {
                return res.status(403).send();
            } else if (res.user.type === USER) {
                return res.status(200).send();
            } else {
                return res.status(401).send();
            }
            break;
        default:
            return res.status(200).send();
    }
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