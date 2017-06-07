/**
 * Created by martpasman on 15-05-17.
 * account aanpassen, goal aanmaken, goal aanpassen, goal ophalen
 */
const express = require("express");
const request = require("request");
const mongoose = require('mongoose');
const User = require('../model/model_user');
const shortid = require('shortid');
const bcrypt = require('bcrypt-nodejs');
const app = express.Router();
const jwt = require('jsonwebtoken');

const fitbitCall = require('../fitbit.js').fitbitCall;
const today = require('../support').today;
const day = require('../support').day;
const logResponse = require('../support').logResponse;
const getYYYYMMDD = require('../support').getYYYYMMDD;
const validateMail = require('../support').validateMail;

const ADMIN = 2;
const USER = 1;
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
 * Get the total amount of steps of a certain user
 */
app.get('/:id/stats/total', function (req, res) {

    fitbitCall(req, res, 'https://api.fitbit.com/1/user/[id]/activities.json', function (body) {
        const stats = JSON.parse(body);
        logResponse(200, 'Total stats collected successfully.');
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
        lastWeek.setDate(today.getDate() - 6);

        fitbitCall(req, res, 'https://api.fitbit.com/1/user/[id]/sleep/date/' + getYYYYMMDD(lastWeek, '-') + '/' + getYYYYMMDD(today, '-') + '.json', function (body2) {
            // use only the data we want
            const sleep = JSON.parse(body2).sleep;

            var sleepData = [];
            for (var i = 0; i < sleep.length; i++) {
                sleepData[i] = {
                    date: sleep[i].dateOfSleep,
                    duration: sleep[i].duration / 1000 / 60 / 60,
                    timeInBed: sleep[i].timeInBed
                };
            }

            logResponse(200, 'Last weeks stats collected successfully.');
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
 * Add a goal
 */
app.post('/:id/goals', function (req, res) {

    if (req.params.id === undefined || isNaN(req.params.id) || req.body.start === undefined ||
        req.body.end === undefined || req.body.end === '' || req.body.id === '' || req.body.start === '' ||
        req.body.goal === undefined || isNaN(req.body.goal) || req.body.goal < 1 || !Date.parse(req.body.start)  || !Date.parse(req.body.end)) {
        logResponse(400, 'Invalid request values.');
        return res.status(400).send({error: 'Invalid request values.'});
    }

    if ((new Date(req.body.start)) > (new Date(req.body.end))) {
        logResponse(400, 'End date is before start date.');
        return res.status(400).send({error: 'End date is before start date.'});
    }

    var json = {
        goal: req.body.goal,
        start: day(req.body.start),
        end: day(req.body.end)
    };

    User.findOneAndUpdate({id: req.params.id}, {$push: {goals: json}}, function (err, result) {
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

        logResponse(201, 'Goal saved.');
        return res.status(201).send({
            success: true
        });
    });
});

/**
 *
 */
app.put('/:id/goals/:gid', function (req, res) {

    if (req.params.id === undefined || isNaN(req.params.id) || req.body.start === undefined ||
        req.body.end === undefined || req.body.end === '' || req.body.id === '' || req.body.start === '' || req.body.goal === undefined || req.body.goal === '' || !Date.parse(req.body.start) ||
        !Date.parse(req.body.end) || isNaN(req.body.goal) || req.params.gid === undefined) {
        logResponse(400, 'Invalid request values.');
        return res.status(400).send({error: 'Invalid request values.'});
    }

    if ((new Date(req.body.start)) < (new Date(req.body.end))) {
        logResponse(400, 'End date is before start date.');
        return res.status(400).send({error: 'End date is before start date.'});
    }

    User.findOneAndUpdate({id: req.params.id, 'goals._id': mongoose.Types.ObjectId(req.params.gid)},
        {
            $set: {
                'goals.$.start': day(req.body.start),
                'goals.$.end': day(req.body.end),
                'goals.$.goal': req.body.goal
            }
        }, function (err, result) {
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

            return res.status(201).send({
                success: true
            });
        });
});

/**
 *
 */
app.delete('/:id/goals/:gid', function (req, res) {

    if (req.params.id === undefined || isNaN(req.params.id) ||
        req.params.gid === undefined) {
        logResponse(400, 'No id supplied');
        return res.status(400).send({error: "No id sup plied"});
    }

    User.update({id: req.params.id}, {$pull: {goals: {_id: mongoose.Types.ObjectId(req.params.gid)}}}, function (err, result) {
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

/**
 *
 */
app.get('/:id/goals/:gid?', function (req, res) {
    if (req.params.gid !== undefined) {
        User.findOne({id: res.user.id}, {goals: {$elemMatch: {_id: mongoose.Types.ObjectId(req.params.gid)}}}, function (err, result) {
            // Check to see whether an error occurred
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({error: err.message});
            }

            // Check to see whether a user was found
            if (!result) {
                logResponse(404, 'User or goal wasnot found');
                return res.status(404).send({error: "User or goal was not found"});
            }

            logResponse(200, 'Goal found and send');
            return res.status(200).send({
                success: true,
                goals: result.goals[0]
            });
        });
    } else {

        if (req.query.offset === undefined || isNaN(req.query.offset) || req.query.limit === undefined || isNaN(req.query.limit)) {
            logResponse(400, 'No offset or limit supplied');
            return res.status(400).send({error: "No offset or limit supplied"});
        }

        User.findOne({id: req.params.id}, function (err, result) {
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

            if (req.query.offset > result.goals.length) {
                logResponse(400, 'Offset exceeded goals');
                return res.status(400).send({error: "Offset exceeded goals"});
            }

            // changed to sort End date to have pending goals next to each other
            result.goals.sort(function (m1, m2) {
                return m1.end - m2.end;
            });

            var addition = req.query.limit;
            if (result.goals.length - req.params.offset < req.query.limit) {
                addition = result.goals.length - req.params.offset;
            }

            addition = +req.query.offset + +addition;

            var slicedarray = result.goals.slice(req.query.offset, addition);
            logResponse(200, 'Goals send');
            return res.status(200).send({
                success: true,
                totalgoals: result.goals.length,
                goals: slicedarray
            });
        });
    }
});

/**
 * Get user without password
 */
app.get('/:id', function (req, res) {

    if (req.params.id === '' || req.params.id === undefined) {
        logResponse(400, 'id is not defined');
        return res.status(400).send({error: 'id is not defined'});
    }

    if (res.user.type !== ADMIN) {
        if (+req.params.id !== +res.user.id) {
            logResponse(403, "Not authorized to make this request");
            return res.status(403).send({error: 'Not authorized to make this request'});
        }
    }

    User.find({type: USER, id: req.params.id}, {password: 0, _id: 0, __v: 0}, function (err, user) {

        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({error: err.message})
        }
        if (user.length === 0) {
            logResponse(404, "User account could not be found");
            return res.status(404).send({error: "User account could not be found"});
        }
        logResponse(200, "user returned");
        return res.status(200).send({success: user[0]});
    })
});

/**
 *
 */
app.put('/:id', function (req, res) {

    if (req.params.id === '' || req.params.id === undefined) {
        logResponse(400, 'id is not defined');
        return res.status(400).send({error: 'Id is not defined.'});
    }

    if (req.body.birthday === '' || req.body.birthday === undefined || req.body.firstname === '' || req.body.firstname === undefined
        || req.body.lastname === '' || req.body.lastname === undefined || req.body.email === '' || req.body.email === undefined ||
        !Date.parse(req.body.birthday) || !validateMail(req.body.email)) {
        logResponse(400, 'Information is not supplied correctly');
        return res.status(400).send({error: 'Information is not supplied correctly.'});
    }

    if (res.user.type !== ADMIN) {
        if (+req.params.id !== +res.user.id) {
            logResponse(403, "Not authorized to make this request");
            return res.status(403).send({error: 'Not authorized to make this request.'});
        }
    } else {

    }

    var birthday = day(req.body.birthday);

    User.findOneAndUpdate({type: USER, id: req.params.id},
        {
            $set: {
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                birthday: birthday
            }
        }, function (err, user) {

            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({error: err.message})
            }

            if (user.length === 0) {
                logResponse(404, "User account could not be found.");
                return res.status(404).send({error: "User account could not be found."});
            }

            logResponse(200, 'Information is updated.');
            return res.status(200).send({success: 'Information is updated.'});
        })
});

/**
 *
 */
app.put('/:id/handicap', function (req, res) {

    if (res.user.type !== ADMIN) {
        logResponse(403, "User is not authorized to make this request");
        return res.status(403).send({error: "User is not authorized to make this request"});
    }

    if (req.params.id === undefined || isNaN(req.params.id)) {
        logResponse(400, "Id not provided or id is not a number.");
        return res.status(400).send({error: "Id not provided or id is not a number."});
    }
    else {

        if (req.body.handicap === undefined) {
            logResponse(400, "Handicap is not given.");
            return res.status(400).send({error: "Handicap is not given."});
        }

        if (req.body.handicap < 1 || req.body.handicap > 3) {
            logResponse(400, "Handicap is not valid.");
            return res.status(400).send({error: "Handicap is not valid."});
        }

        User.findOneAndUpdate({
            id: req.params.id,
            type: USER
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

/**
 *
 */
app.put('/:id/active/', function (req, res) {

    if (res.user.type !== 2) {
        logResponse(403, "User is not authorized to make this request");
        return res.status(403).send({error: "User is not authorized to make this request"});
    }

    if (req.params.id === undefined || req.body.id == '' || isNaN(req.params.id) || req.body.active == undefined || req.body.active == '') {
        logResponse(400, "Id not provided or id is not a number.");
        return res.status(400).send({error: "Id not provided or id is not a number."});
    }
    else {

        if (req.body.active || !req.body.active) {
            User.findOneAndUpdate({
                id: req.params.id
            }, {$set: {active: req.body.active}}, function (err, result) {
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
        } else {
            logResponse(400, "active is not a boolean");
            return res.status(400).send({error: "active is not a boolean"});
        }
    }
});

module.exports = app;