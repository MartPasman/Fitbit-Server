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

var fitbitCall = require('../fitbit.js').fitbitCall;

/**
 * Authorization
 */
app.use('/', function (req, res, next) {

    jwt.verify(req.get("Authorization"), req.app.get('private-key'), function (err, decoded) {
        if (err) {
            logResponse(401, err.message);
            return res.status(401).send({error: 'Failed to authenticate token.'});
        }

        res.user = decoded._doc;
        next();
    });
});

/**
 * Get the total amount of steps of a certain user
 */
app.get('/:id/stats/total', function (req, res) {

    fitbitCall(req, res, 'https://api.fitbit.com/1/user/[id]/activities.json', function (body) {
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

/**
 * Get the steps and sleep stats from the last seven days
 */
app.get('/:id/stats/weeks/last', function (req, res) {

    fitbitCall(req, res, 'https://api.fitbit.com/1/user/[id]/activities/steps/date/today/7d.json', function (body) {

        const steps = JSON.parse(body);

        // get the right time period
        var today = new Date();
        var lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);

        fitbitCall(req, res, 'https://api.fitbit.com/1/user/[id]/sleep/date/' + getYYYYMMDD(lastWeek, '-') + '/' + getYYYYMMDD(today, '-') + '.json', function (body2) {
            // use only the data we want
            const sleep = JSON.parse(body2).sleep;
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

/**
 *
 */
app.post('/:id/goals', function (req, res) {

    if (req.body.start === undefined || req.body.end === undefined || req.body.goal === undefined) {
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

    if (req.body.start === undefined || req.body.end === undefined || req.body.goal === undefined) {
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

    if (req.params.id === undefined) {
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

    if (req.params.offset === undefined || req.params.offset === '') {
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

function logResponse(code, message, depth) {
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
}

function getYYYYMMDD(date, splitBy) {
    var mm = date.getMonth() + 1;
    var dd = date.getDate();

    return [date.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd
    ].join(splitBy);
}

module.exports = app;
