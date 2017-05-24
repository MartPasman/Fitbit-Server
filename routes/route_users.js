/**
 * Created by martpasman on 15-05-17.
 * account aanpassen, goal aanmaken, goal aanpassen, goal ophalen
 */
var express = require("express");
var request = require("request");
var mongoose = require('mongoose');
var User = require('../model/model_user');
var shortid = require('shortid');
var bcrypt = require('bcrypt-nodejs');
var fitbitClient = require('fitbit-node');
var consumer_key = '228HTD';
var client_secret = '41764caf3b48fa811ce514ef38c62791';
var app = express.Router();
var jwt = require('jsonwebtoken');

/**
 * Authorization
 */
app.use('/', function (req, res, next) {

    jwt.verify(req.get("Authorization"), req.app.get('private-key'), function (err, decoded) {
        if (err) {
            logResponse(401, err.message);
            return res.status(401).send({error: 'User is not logged in'});
        }

        res.user = decoded._doc;
        next();
    });
});

/**
 * Prepares an API call to the Fitbit API by checking authorization,
 * user existence, fitbit object extistence.
 * @param req original request object
 * @param res response object
 * @param callback what to do when we prepared the API call
 */
function prepareAPICall(req, res, callback) {
    // check if a valid id was provided
    if (req.params.id === undefined || isNaN(req.params.id)) {
        logResponse(400, 'No valid user id provided: ' + req.params.id);
        return res.status(400).send({error: 'No valid user id provided.'});
    }

    const userid = req.params.id;

    // check if the user that requests the data is the user whose data is requested
    if (res.user.type !== 3 && parseInt(res.user.id) !== parseInt(userid)) {
        logResponse(403, 'User does not have permission to make this request.');
        return res.status(403).send({error: 'User does not have permission to make this request.'});
    }

    // get the authorization token from the database
    User.findOne({id: userid}, {fitbit: 1}, function (err, user) {
        if (err) {
            logResponse(500, 'MongoDB error: ' + err.message);
            return res.status(500).send({error: 'MongoDB error: ' + err.message});
        }

        // no user found with the given id
        if (!user) {
            logResponse(404, 'User account could not be found.');
            return res.status(404).send({error: 'User account could not be found.'});
        }

        // no fitbit connected to this account
        if (user.fitbit === undefined || user.fitbit.accessToken === undefined || user.fitbit.userid === undefined) {
            logResponse(412, 'User account not connected to a Fitbit.');
            return res.status(412).send({error: 'User account not connected to a Fitbit.'});
        }

        callback(user.fitbit.accessToken, user.fitbit.userid);
    });
}

/**
 * Get the total amount of steps of a certain user
 */
app.get('/:id/stats/total', function (req, res) {

    prepareAPICall(req, res, function (accessToken, userid) {
        request.get('https://api.fitbit.com/1/user/' + userid + '/activities.json',
            {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            }, function (error, response, body) {
                if (error !== undefined && response.statusCode !== 200) {
                    logResponse(response.statusCode, 'Fitbit API error.');
                    return res.status(response.statusCode).send({error: 'Fitbit API error.'});
                }

                const stats = JSON.parse(body);
                logResponse(200, 'Stats collected successfully.');
                return res.status(200).send(
                    {
                        success: {
                            steps: stats.lifetime.total.steps
                        }
                    }
                );
            });
    });
});

/**
 * Get the steps and sleep stats from the last seven days
 */
app.get('/:id/stats/weeks/last', function (req, res) {

    // prepare the API call
    prepareAPICall(req, res, function (accessToken, userid) {

        // get the steps from last week
        request.get('https://api.fitbit.com/1/user/' + userid + '/activities/steps/date/today/7d.json',
            {
                headers: {
                    Authorization: 'Bearer ' + accessToken
                }
            }, function (error, response, body) {
                if (error !== undefined && response.statusCode !== 200) {
                    logResponse(response.statusCode, 'Fitbit API error.');
                    return res.status(response.statusCode).send({error: 'Fitbit API error.'});
                }

                const steps = JSON.parse(body);

                // get the right time period
                var today = new Date();
                var lastWeek = new Date();
                lastWeek.setDate(today.getDate() - 7);

                // get the sleep from last week
                request.get('https://api.fitbit.com/1/user/' + userid + '/sleep/date/' + getYYYYMMDD(lastWeek) + '/' + getYYYYMMDD(today) + '.json',
                    {
                        headers: {
                            Authorization: 'Bearer ' + accessToken
                        }
                    }, function (error, response, body) {
                        if (error !== undefined && response.statusCode !== 200) {
                            logResponse(response.statusCode, 'Fitbit API error.');
                            return res.status(response.statusCode).send({error: 'Fitbit API error.'});
                        }

                        // use only the data we want
                        const sleep = JSON.parse(body).sleep;
                        var sleepData = [];
                        for (var i = 0; i < sleep.length; i++) {
                            sleepData[i] = {
                                date: sleep.dateOfSleep,
                                duration: sleep.duration,
                                timeInBed: sleep.timeInBed
                            };
                        }

                        logResponse(200, 'Stats collected successfully.');
                        return res.status(200).send(
                            {
                                success: {
                                    steps: steps["activities-steps"],
                                    sleep: sleepData
                                }
                            }
                        );
                    });
            });
    });
});

/**
 *
 */
app.post('/:id/goals', function (req, res) {

    if (req.body.start == undefined || req.body.end == undefined || req.body.goal == undefined) {
        logResponse(401, 'Wrong information supplied');
        return res.status(401).send({error: "Wrong information supplied"});
    }
    if (!req.body.start instanceof Date || !req.body.end instanceof Date || isNaN(req.body.goal)) {
        logResponse(401, 'Wrong information supplied');
        return res.status(401).send({error: "Wrong information supplied"});
    } else {
        var json = {
            goal: req.body.goal,
            start: req.body.start,
            end: req.body.end
        };

        User.findOneAndUpdate({id: decoded._doc.id}, {$push: {goals: json}}, function (err, result) {
            // Check to see whether an error occurred
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({error: err.message});
            }

            // Check to see whether a user was found
            if (!result) {
                logResponse(401, 'User not found');
                return res.status(401).send({error: "User not found"});
            }

            return res.status(201).send({
                success: true
            });
        });
    }
});


app.post('/goal/add', function (req, res) {

    if (req.body.start == undefined || req.body.end == undefined || req.body.goal == undefined) {
        logResponse(400, 'Wrong information supplied');
        return res.status(400).send({error: "Wrong information supplied"});
    }
    if (!Date.parse(req.body.start) || !Date.parse(req.body.end) || isNaN(req.body.goal)) {
        logResponse(400, 'Wrong information supplied');
        return res.status(400).send({error: "Wrong information supplied"});
    } else {
        var json = {
            goal: req.body.goal,
            start: req.body.start,
            end: req.body.end
        };

        User.findOneAndUpdate({id: res.user.id}, {$push: {goals: json}}, function (err, result) {
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

            logResponse(201, 'Goal created');
            return res.status(201).send({
                success: true
            });
        });
    }
});


app.delete('/goal/delete/:id?', function (req, res) {


    if (req.params.id == undefined) {
        logResponse(400, 'No id supplied');
        return res.status(400).send({error: "No id supplied"});
    }

    User.update({id: res.user.id}, {$pull: {goals: {_id: mongoose.Types.ObjectId(req.params.id)}}}, function (err, result) {
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

        logResponse(201, 'Goal removed');
        return res.status(201).send({
            success: true
        });
    });


});

app.get('/goal/:offset?', function (req, res) {

    if (req.params.offset == undefined || req.params.offset == '') {
        logResponse(400, 'No offset supplied');
        return res.status(400).send({error: "No offset supplied"});
    }

    User.findOne({id: res.user.id}, function (err, result) {
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

        if (req.params.offset > result.goals.length) {
            logResponse(404, 'Offset exceeded goals');
            return res.status(404).send({error: "Offset exceeded goals"});
        }

        var addition = 5;
        if (result.goals.length - req.params.offset < 5) {
            addition = result.goals.length - req.params.offset;
        }

        var slicedarray = result.goals.slice(req.params.offset, req.params.offset + addition);
        logResponse(201, 'Goals send');
        return res.status(201).send({
            success: true,
            totalgoals: result.goals.length,
            goals: slicedarray
        });
    });

});

app.put('/:id/handicap', function (req, res) {

    if (res.user.type !== 3) {
        logResponse(403, "User is not authorized to make this request" );
        return res.status(403).send({error: "User is not authorized to make this request"});
    }

    if (req.params.id === undefined || isNaN(req.params.id)) {
        logResponse(400, "Id not provided or id is not a number.");
        return res.status(400).send({error: "Id not provided or id is not a number."});
    }
    else {

        if(req.body.handicap === undefined){
            logResponse(400,"Handicap is not given." );
            return res.status(400).send({error: "Handicap is not given."});
        }

        if (req.body.handicap < 1 || req.body.handicap > 3) {
            logResponse(400, "Handicap is not valid.");
            return res.status(400).send({error: "Handicap is not valid."});
        }

        User.findOneAndUpdate({
            id: req.params.id,
            type: 1
        }, {$set: {handicap: req.body.handicap}}, function (err, result) {
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({error: err.message});
            }
            if (!result) {
                logResponse(404, "User could not be found.");
                return res.status(404).send({error: "User could not be found."});
            }
            logResponse(200, "User successfully updated.");
            return res.status(200).send({success: "User successfully updated."});
        })
    }
});


var logResponse = function (code, message, depth) {
    if (depth === undefined) depth = '\t';
    if (message === undefined) message = '';
    if (code === undefined) return;

    var COLOR_200 = '\u001B[32m';
    var COLOR_300 = '\u001B[33m';
    var COLOR_400 = '\u001B[31m';
    var COLOR_500 = '\u001B[34m';
    var COLOR_RESET = '\u001B[0m';

    var color = COLOR_200;
    if (code >= 300) color = COLOR_300;
    if (code >= 400) color = COLOR_400;
    if (code >= 500) color = COLOR_500;

    console.log(depth + color + code + COLOR_RESET + ' ' + message + '\n');
};

function getYYYYMMDD(date) {
    var mm = date.getMonth() + 1;
    var dd = date.getDate();

    return [date.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd
    ].join('-');
}

module.exports = app;
