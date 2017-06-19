/**
 * Created by martpasman on 15-05-17.
 * competitie aanmaken, competitie ophalen
 */
const express = require("express");
const request = require("request");
const mongoose = require('mongoose');
const User = require('../model/model_user');
const shortid = require('shortid');
const bcrypt = require('bcrypt-nodejs');
const app = express.Router();
const jwt = require('jsonwebtoken');
const Competition = require('../model/model_competition');

const fitbitCall = require('../fitbit.js').fitbitCall;
const logResponse = require('../support').logResponse;
const day = require('../support').day;
const today = require('../support').today;

const ADMIN = 2;
const USER = 1;

// app.get();

/**
 * must be logged in as administrator
 */
app.use('/', function (req, res, next) {

    console.log('\tAuthentication required...');
    console.log(req.app.get('private-key'));
    jwt.verify(req.get("Authorization"), req.app.get('private-key'), function (err, decoded) {
        if (err) {
            logResponse(401, err.message);
            return res.status(401).send({error: "User is not logged in."});
        }

        // Save user for future purposes
        res.user = decoded._doc;

        console.log('\tpassed');

        next();
    });
});

/**
 *
 */
app.get('/', function (req, res) {
    var results = [];

    Competition.find({}, function (err, result) {
        if (err) {
            logResponse(500, "Internal server error!" + err);
            return res.status(500).send(err);
        }

        //check if there are already competitions
        if (result.length === 0) {
            // create new competition

            generatecompId(function (id) {
                //get today's date
                var date = today();
                var end_date = today();
                //create competition for 7 days (this is the first, so standard = 7)
                end_date = end_date.setDate(date.getDate() + 7);

                //create results

                //find users
                User.find({type: USER}, function (err, usrs) {
                    if (err) {
                        logResponse(500, "Internal server error!" + err);
                        return res.status(500).send(err);
                    }

                    if (usrs.length === 0) {
                        logResponse(404, "No users found");
                        return res.status(404).send({error: "no users found"});
                    }

                    //give the users results
                    for (var i = 0; i < usrs.length; i++) {
                        results[i] = {
                            userid: usrs[i].id,
                            score: 0,
                            goalAchieved: false
                        }
                    }

                    //create competition.
                    var comp = new Competition({
                        id: id,
                        goal: 100000,
                        defaultGoal: 100000,
                        defaultLength: 7,
                        length: 7,
                        start: date,
                        end: end_date,
                        results: results,
                        sharedGoal: 20000,
                        defaultSharedGoal: 20000,
                        sharedGoalProcess: 0,
                        sharedGoalAchieved: false
                    });

                    //save competition.
                    comp.save(function (err, resp) {
                        if (err) {
                            logResponse(500, "Internal server error");
                            return res.status(500).send(err);
                        }
                        logResponse(200, "Competition sent.");
                        return res.status(200).send(resp);
                    });
                });
            });
            /**
             * When there already is an competition, and in this week
             * return that competition. If competition is in the past then
             * create a new one.
             */
        } else {
            //sort to get newest one up.
            result.sort(function (m1, m2) {
                return m1.start - m2.start;
            });

            //check wether competition is running right now.
            if (result[result.length - 1].end < today()) {
                var defaultGoal = result[result.length - 1].defaultGoal;
                var defaultLength = result[result.length - 1].defaultLength;
                var defaultSharedGoal = result[result.length-1].defaultSharedGoal;

                //create new competition.
                generatecompId(function (id) {
                    var date = new Date();
                    var end_date = new Date();
                    end_date = end_date.setDate(date.getDate() + defaultLength);

                    //create results
                    User.find({type: USER}, function (err, usrs) {
                        if (err) {
                            logResponse(500, "Internal server error");
                            return res.status(500).send(err);
                        }

                        if (usrs.length === 0) {
                            logResponse(404, "No users where found.");
                            return res.status(404).send({error: "no users found"});
                        }

                        //give users results
                        for (var i = 0; i < usrs.length; i++) {
                            results[i] = {
                                userid: usrs[i].id,
                                score: 0,
                                goalAchieved: false
                            }
                        }

                        //create competition
                        var comp = new Competition({
                            id: id,
                            goal: defaultGoal,
                            defaultGoal: defaultGoal,
                            length: defaultLength,
                            defaultLength: defaultLength,
                            start: date,
                            end: end_date,
                            results: results,
                            sharedGoal: defaultSharedGoal,
                            defaultSharedGoal: defaultSharedGoal,
                            sharedGoalProcess: 0,
                            sharedGoalAchieved: false
                        });

                        //save competition
                        comp.save(function (err, resp) {
                            if (err) {
                                console.log(err);
                                logResponse(500, "Internal server error");
                                return res.status(500).send(err);
                            }
                            logResponse(200, "Competition sent.");
                            return res.status(200).send(resp);
                        });
                    });
                });


            } else {
                //if competition is running right now, return that one.
                logResponse(200, "Competition sent.");
                res.status(200).send(result[result.length - 1]);
            }
        }
    });
});

/**
 * Create a competition.
 */
//TODO: Delete this later.
app.post('/', function (req, res) {

    if (res.user.type !== ADMIN) {
        logResponse(403, "Not authorized to make this request");
        return res.status(403).send({error: "Not authorized to make this request"});
    }

    var goal = req.body.goal;
    var startDate = day(req.body.start);
    var endDate = day(req.body.end);

    if (goal === undefined || startDate === undefined || endDate === undefined || !Date.parse(startDate) || !Date.parse(endDate)) {
        return res.status(400).send({error: "Bad request, invalid parameters."});
    }

    generatecompId(function (id) {
        var results = [];
        //get all users and add them
        User.find({type: USER}, function (err, result) {
            if (err) {
                return res.status(500).send();
            }
            console.log(result);

            for (var i = 0; i < result.length; i++) {
                results[i] = {
                    name: result[i].firstname + ' ' + result[i].lastname,
                    userid: result[i].id,
                    score: 1300,
                    goalAchieved: false
                }
            }

            var comp = new Competition({
                id: id,
                goal: goal,
                defaultgoal: goal,
                start: startDate,
                end: endDate,
                results: results
            });

            comp.save(function (err, resp) {
                if (err) {
                    return res.status(500).send({error: "..."});
                }

                return res.status(201).send({succes: id});
            });
        })
    });
});


/**
 * change score from specific user in competition
 */
// TODO: Delete this later
app.put('/:id/score', function (req, res) {
    var userid = req.body.userid;
    var score = req.body.score;

    if (userid === undefined || score === undefined) {
        logResponse(400, "Invalid parameters.");
        return res.status(400).send("Invalid parameters!");
    }

    Competition.findOneAndUpdate({
        id: req.params.id,
        "results.userid": userid
    }, {$set: {"results.$.score": score}}, function (err, result) {
        if (err) {
            logResponse(500, "Internal server error.");
            return res.status(500).send({error: 'Internal server error!'});
        } else if (result === null) {
            logResponse(404, "No users/competitions where found");
            return res.status(404).send("Competition/User not found!");
        } else {
            logResponse(200, "updated user score!");
            return res.status(200).send({succes: 'updated!'});
        }
    })
});

/**
 * change goal for next competition
 */
app.put('/changegoal', function (req, res) {
    //find the competition
    Competition.find({}, function (err, comps) {
        if (err) {
            console.log(err);
            logResponse(500, "Internal server error.");
            res.status(500).send(err);
        } else if (comps.length === 0) {
            logResponse(404, "Nu users where found");
            res.status(404).send({error: "no users found"});
        }

        //get id
        var compid = comps[comps.length - 1].id;

        //update competition
        Competition.findOneAndUpdate({id: compid}, {$set: {defaultGoal: req.body.goal}}, {new: 1}, function (err, competition) {
            if (err) {
                console.log(err);
                logResponse(500, "Internal server error");
                return res.status(500).send();
            } else if (competition === undefined || competition === undefined) {
                logResponse(404, "No competitions where found");
                return res.status(404).send({error: "competition not found"})
            }
            logResponse(201, "Competition updated!");
            return res.status(201).send({success: competition});
        });
    });
});

/**
 * Get the sharedGoal in %
 */
app.get('/sharedGoal', function (req, res) {

    //find the competition
    Competition.find({}, function (err, competitions) {
        if (err) {
            logResponse(500, "Internal server error!");
            res.status(500).send({error: 'Internal server error!'});
        }
        competitions.sort(function (m1, m2) {
            return m1.start - m2.start;
        });
        //create json
        var JSON = {
            percentage: competitions[competitions.length-1].sharedGoalProcess,
            achieved: competitions[competitions.length-1].sharedGoalAchieved
        };

        res.status(200).send({success: JSON});

    })
});

/**
 * Change length for next competition
 *
 */
app.put('/changelength', function (req, res) {
    Competition.find({}, function (err, comps) {
        if (err) {
            console.log(err);
            logResponse(500, "Internal server error.");
            res.status(500).send(err);
        } else if (comps.length === 0) {
            logResponse(404, "Nu users where found");
            res.status(404).send({error: "no users found"});
        }

        var compid = comps[comps.length - 1].id;

        Competition.findOneAndUpdate({id: compid}, {$set: {defaultLength: req.body.length}}, {new: 1}, function (err, competition) {
            if (err) {
                console.log(err);
                logResponse(500, "Internal server error");
                return res.status(500).send();
            } else if (competition === undefined || competition === undefined) {
                logResponse(404, "No competitions where found");
                return res.status(404).send({error: "competition not found"})
            }
            logResponse(201, "Competition updated!");
            return res.status(201).send({success: competition});
        });
    });
});
function generatecompId(callback) {
    var id = Math.ceil((Math.random() * 200 ) + 100);

    Competition.find({id: id}, function (err, user) {
        if (user.length === 0) {
            callback(id);
        } else {
            generateId(callback);
        }
    });
}

Date.prototype.addDays = function (days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
};

module.exports = app;
