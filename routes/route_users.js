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

const ADMIN = 2;
const USER = 1;

/**
 * Get the birthdays of the last week
 */
app.get('/birthdays', function (req, res) {
    const weekDay = new Date().getDay();
    const dayFrom = day(new Date().setDate(new Date().getDate() - (weekDay - 1)));
    const dayTo = day(new Date().setDate(new Date().getDate() + (7 - weekDay)));

    User.find({type: USER, active: true}, {birthday: 1, firstname: 1, lastname: 1}, function (err, users) {
        var userBirthdays = [];

        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({error: err.message})
        }

        for (var i = 0; i < users.length; i++) {
            var birthday = getCompareDate(users[i].birthday);

            if (dayFrom <= birthday && birthday <= dayTo) {
                users[i].birthday = birthday;
                userBirthdays.push(users[i]);
            }
        }

        userBirthdays.sort(function (u1, u2) {
            return u1.birthday - u2.birthday;
        });

        logResponse(200, "Users with birthdays returned.");
        return res.status(200).send({success: userBirthdays});
    })
});


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
 *
 */
app.get('/:id/export/:start/:end', function (req, res) {
    const start = req.params.start;
    const end = req.params.end;

    // fitbitCall() will check if the id is valid

    // validate start date and end date
    if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
        logResponse(400, 'Required fields are missing or invalid.');
        return res.status(400).send({error: 'Required fields are missing or invalid.'});
    }

    // if the end date lies in the future
    if (new Date(end) > today()) {
        logResponse(400, 'End date lies in the future.');
        return res.status(400).send({error: 'End date lies in the future.'});
    }

    // note: Fitbit will check for us if the end date is before the start date

    getExportData(req, res, req.params.id, start, end, function (json) {
        logResponse(200, 'Export data collected.');
        res.status(200).send(json);

        // if all goes right, update the last export date to now
        updateLastExportDate(req.params.id);
    });
});

/**
 *
 */
app.get('/:id/export/sincelast', function (req, res) {
    const id = req.params.id;

    // validate id, start date and end date
    if (isNaN(id)) {
        logResponse(400, 'Required fields are missing or invalid.');
        return res.status(400).send({error: 'Required fields are missing or invalid.'});
    }

    User.findOne({id: id}, {lastExport: true}, function (err, user) {
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({error: err.message});
        }

        // if the user does not exist
        if (user === undefined || user === null) {
            logResponse(404, 'User not found.');
            return res.status(404).send({error: 'User not found.'});
        }

        // if there has not been a previous export
        if (user.lastExport === undefined) {
            logResponse(412, 'User has not exported before.');
            return res.status(412).send({error: 'User has not exported before.', type: 2});
        }

        const start = getYYYYMMDD(user.lastExport, '-');
        const end = getYYYYMMDD(new Date(), '-');

        getExportData(req, res, id, start, end, function (json) {
            logResponse(200, 'Export data collected.');
            res.status(200).send(json);

            // if all goes right, update the last export date to now
            updateLastExportDate(id);
        });
    });
});

/**
 * Update the last export date of a certain user
 * @param id
 */
function updateLastExportDate(id) {
    User.findOneAndUpdate({id: id}, {$set: {lastExport: new Date()}}, {new: true}, function (err) {
        if (err) {
            return console.error('Last export date could not be updated: ' + err.message);
        }
        console.log('Last export date updated.');
    });
}

/**
 * Collect export data for a certain period
 * @param req
 * @param res
 * @param id
 * @param start
 * @param end
 * @param callback
 */
function getExportData(req, res, id, start, end, callback) {

    // get the steps
    fitbitCall(req, res, 'https://api.fitbit.com/1/user/[id]/activities/steps/date/' + start + '/' + end + '.json', function (body) {
        const steps = JSON.parse(body)["activities-steps"];

        // get the sleep
        fitbitCall(req, res, 'https://api.fitbit.com/1/user/[id]/sleep/date/' + start + '/' + end + '.json', function (body) {
            const sleep = JSON.parse(body).sleep;

            var sleepData = [];
            for (var i = 0; i < sleep.length; i++) {
                sleepData[i] = {
                    date: sleep[i].dateOfSleep,
                    duration: sleep[i].duration / 1000 / 60 / 60,
                    timeInBed: sleep[i].timeInBed
                };
            }

            // get the goals
            User.findOne({id: id}, {goals: true}, function (err, user) {
                if (err) {
                    logResponse(500, err.message);
                    return res.status(500).send({error: err.message});
                }

                // fitbitCall() already checks if the user exists

                // if the goals do not exist
                if (user.goals === undefined) {
                    logResponse(404, 'Goals not found.');
                    return res.status(404).send({error: 'Goals not found.'});
                }

                var startDate = day(start);
                var endDate = day(end);

                // only pick the goals that match the period
                var goals = [];
                for (var i = 0; i < user.goals.length; i++) {
                    var g = user.goals[i];
                    if (g.start >= startDate && g.end <= endDate) {
                        goals.push(g);
                    }
                }

                // return the data
                callback({
                    success: {
                        steps: steps,
                        sleep: sleepData,
                        goals: goals
                    }
                });
            });
        });
    });
}

/**
 * Update the last export date to now
 */
app.put('/:id/export', function (req, res) {
    if (isNaN(req.params.id)) {
        logResponse(400, 'Invalid id.');
        res.status(400).send({error: 'Invalid id.'});
    }

    updateLastExportDate(req.params.id);

    logResponse(204, 'OK');
    res.status(204).send();
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
 * Add a goal
 */
app.post('/:id/goals', function (req, res) {

    if (req.params.id === undefined || isNaN(req.params.id) || req.body.start === undefined ||
        req.body.end === undefined || req.body.end === '' || req.body.id === '' || req.body.start === '' ||
        req.body.goal === undefined || isNaN(req.body.goal) || req.body.goal < 1) {
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
        req.body.end === undefined || req.body.end === '' || req.body.id === '' || req.body.start === '' || req.body.goal === undefined || req.body.goal === ''
        || isNaN(req.body.goal) || req.params.gid === undefined) {
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
 * Get user without password
 */
app.get('/:id', function (req, res) {
    const id = req.params.id;

    if (isNaN(id)) {
        logResponse(400, 'id is not defined');
        return res.status(400).send({error: 'id is not defined'});
    }

    if (res.user.type !== ADMIN && +req.params.id !== +res.user.id) {
        logResponse(403, "Not authorized to make this request");
        return res.status(403).send({error: 'Not authorized to make this request'});
    }

    User.findOne({id: req.params.id}, {password: 0, _id: 0, __v: 0}, function (err, user) {
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({error: err.message})
        }

        if (user === undefined) {
            logResponse(404, "User account could not be found");
            return res.status(404).send({error: "User account could not be found"});
        }

        logResponse(200, "user returned");
        return res.status(200).send({success: user});
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

    var json = {};

    if (!(req.body.birthday === '' || req.body.birthday === undefined)) {
        json.birthday = day(req.body.birthday);
    }

    if (!( req.body.firstname === '' || req.body.firstname === undefined)) {
        if(req.body.firstname.length < 50) {
            json.firstname = req.body.firstname;
        }
    }

    if (!( req.body.lastname === '' || req.body.lastname === undefined)) {
        if(req.body.firstname.length < 50) {
            json.lastname = req.body.lastname;
        }
    }

    if (!( req.body.handicap === '' || req.body.handicap === undefined)) {
        if (req.body.handicap < 1 || req.body.handicap > 3) {
            logResponse(400, "Handicap is not valid.");
            return res.status(400).send({error: "Handicap is not valid."});
        }
        json.handicap = req.body.handicap;
    }

    if (!(req.body.active === undefined || req.body.active === '')) {
        if (req.body.active || !req.body.active) {
            json.active = req.body.active;
        }
    }

    if (!(req.body.password === undefined || req.body.password === '')) {
        genPassword(res, req.body.password, function (password) {
            json.password = password;
            console.log(json);

            if (res.user.type !== ADMIN) {
                if (+req.params.id !== +res.user.id) {
                    logResponse(403, "Not authorized to make this request");
                    return res.status(403).send({error: 'Not authorized to make this request.'});
                }
            }

            //Update user in database
            User.findOneAndUpdate({id: req.params.id}, {$set: json}, function (err, user) {
                if (err) {
                    logResponse(500, err.message);
                    return res.status(500).send({error: err.message})
                }

                if (user === null) {
                    logResponse(404, "User account could not be found.");
                    return res.status(404).send({error: "User account could not be found."});
                }

                if (user.length === 0) {
                    logResponse(404, "User account could not be found.");
                    return res.status(404).send({error: "User account could not be found."});
                }

                logResponse(200, 'Information is updated.');
                return res.status(200).send({success: 'Information is updated.'});
            });
        });
    } else {

        console.log(json);

        if (res.user.type !== ADMIN) {
            if (+req.params.id !== +res.user.id) {
                logResponse(403, "Not authorized to make this request");
                return res.status(403).send({error: 'Not authorized to make this request.'});
            }
        }

        //Update user in database
        User.findOneAndUpdate({id: req.params.id}, {$set: json}, function (err, user) {
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send({error: err.message})
            }

            if (user === null) {
                logResponse(404, "User account could not be found.");
                return res.status(404).send({error: "User account could not be found."});
            }

            if (user.length === 0) {
                logResponse(404, "User account could not be found.");
                return res.status(404).send({error: "User account could not be found."});
            }

            logResponse(200, 'Information is updated.');
            return res.status(200).send({success: 'Information is updated.'});
        });
    }
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

    if (req.params.id === undefined || req.body.id === '' || isNaN(req.params.id) || req.body.active == undefined || req.body.active == '') {
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


function genPassword(res, password, callback) {

    bcrypt.genSalt(10, function (err, salt) {
        if (err) {
            logResponse(500, "Can not gen salt: " + err.message);
            return res.status(500).send({error: err.message});
        }

        bcrypt.hash(password, salt, undefined, function (err, hashed) {
            if (err) {
                logResponse(500, "Can not hash account: " + err.message);
                return res.status(500).send({error: err.message});
            }

            callback(hashed);
        });
    });
}

function getCompareDate(birthdate) {
    return compareDate = Date.UTC(new Date().getFullYear(), birthdate.getMonth(), birthdate.getDate(), 0, 0, 0, 0);
}

module.exports = app;