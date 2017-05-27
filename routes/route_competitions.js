/**
 * Created by martpasman on 15-05-17.
 * competitie aanmaken, competitie ophalen
 */
var express = require("express");
var request = require("request");
var mongoose = require('mongoose');
var User = require('../model/model_user');
var shortid = require('shortid');
var bcrypt = require('bcrypt-nodejs');
var app = express.Router();
var jwt = require('jsonwebtoken');
var Competition = require('../model/model_competition');
var fitbitCall = require('../fitbit.js').fitbitCall;

/**
 * must be logged in as administrator
 */
// app.use('/', function (req, res, next) {
//
//     console.log('\tAuthentication required...');
//     console.log(req.app.get('private-key'));
//     jwt.verify(req.get("Authorization"), req.app.get('private-key'), function (err, decoded) {
//         if (err) {
//             logResponse(401, err.message);
//             return res.status(401).send({error: "User is not logged in."});
//         }
//
//         // Save user for future purposes
//         res.user = decoded._doc;
//         if (res.user.type !== 3) {
//             logResponse(403, "Not authorized to make this request");
//             return res.status(403).send({error: "Not authorized to make this request"});
//         }
//
//         console.log('\tpassed');
//
//         next();
//     });
// });

app.get('/:offset?', function (req, res) {
    Competition.find({}, function (err, result) {
        if (err) {
            return res.status(500).send();
        }


        result.sort(function (m1, m2) {
            return m1.start - m2.start;
        });



        var date = new Date();

        var i = 1;
        var resultdate = new Date(result[result.length - i].start);

        while (resultdate > date) {
            i++;
            if(result.length - i <= 0){
                generatecompId(function (id) {
                    var date = new Date();

                    var oneDay = 24*60*60*1000;
                    var diffDays = Math.round(Math.abs((result[result.length - 1].start - result[result.length - 1].end)/(oneDay)));

                    var end_date = new Date();
                    end_date.addDays(diffDays);
                    //TODO 0 results
                    var comp = new Competition({
                        id: id,
                        goal: result[result.length - 1].defaultgoal,
                        defaultgoal: result[result.length - 1].defaultgoal,
                        start: date,
                        end: end_date,
                        results: result[result.length-1].results
                    });

                    comp.save(function (err, resp) {
                        if (err) {
                            return res.status(500).send({error: "..."});
                        }
                        i = 1;
                    });
                });
            }
            resultdate = new Date(result[result.length - i]);
        }
        if (req.params.offset == undefined || req.params.offset == 0) {
            result[result.length - i].results.sort(function (m1, m2) {
                return m2.score - m1.score;
            });
            return res.status(200).send({total: result.length-1, current: result.length-i, competition: result[result.length - i]});
        } else {
            if(result.length - i + +req.params.offset < 0 || result.length - i + +req.params.offset > result.length - 1){
                return res.status(400).send({error: "index out of bounds"});
            }
            result[result.length - i + +req.params.offset].results.sort(function (m1, m2) {
                return m2.score - m1.score;
            });
            return res.status(200).send({total: result.length-1, current: (result.length-i + +req.params.offset), competition: result[result.length - i + +req.params.offset]});
        }


    });
});

/**
 * Create a competition.
 */
app.post('/', function (req, res) {
    var goal = req.body.goal;
    var startDate = req.body.start;
    var endDate = req.body.end;

    if (goal === undefined || startDate == undefined || endDate == undefined || !Date.parse(startDate) || !Date.parse(endDate)) {
        return res.status(400).send({error: "Bad request, invalid parameters."});
    }
    generatecompId(function (id) {


        var results = [];
        //get all users and add them
        User.find({type: 1}, function (err, result) {
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
                goal: req.body.goal,
                defaultgoal: req.body.goal,
                start: req.body.start,
                end: req.body.end,
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

app.put('/:id/score', function(req,res){
    var userid = req.body.userid;
    var score = req.body.score;

    if(userid === undefined || score == undefined){
        return res.status(400).send("Invalid parameters!");
    }
     Competition.findOneAndUpdate({id: req.params.id,"results.userid": userid},{$set: {"results.$.score": score}}, function (err,result) {
        if(err){
            return res.status(500).send({error: 'Internal server error!'});
        }
        if (result === null){
            res.status(400).send("Competition/User not found!");
        }

        return res.status(201).send({succes: 'updated!'});


    } )

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

Date.prototype.addDays = function(days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}


module.exports = app;
