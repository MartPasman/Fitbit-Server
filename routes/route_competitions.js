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
        if (res.user.type !== 3) {
            logResponse(403, "Not authorized to make this request");
            return res.status(403).send({error: "Not authorized to make this request"});
        }

        console.log('\tpassed');

        next();
    });
});

app.get('/total', function(req,res){
    Competition.find({}, function(err,result){
        if(err){
            return res.status(500).send();
        }
        //returnt het hele [] object
        return res.status(200).send(result);
    });
});

/**
 * Create a competition.
 */
app.post('/', function(req,res){
    var goal = req.body.goal;
    var startDate = req.body.start;
    var endDate = req.body.end;

    if(goal === undefined || startDate == undefined || endDate == undefined){
        return res.status(400).send({error: "Bad request, missing parameters."});
    }

    var results = [];
    //get all users and add them
    User.find({}, function(err,result){
        if(err){
            return res.status(500).send();
        }

        for (var i =0; i < result.length; i++){
            results[i] = {
                userid: result[i].id,
                score: 0,
                goalAchieved: false
            }

        }

        var comp = new Competition({
            id: req.body.id,
            goal:req.body.goal,
            defaultgoal: req.body.goal,
            start: req.body.start,
            end: req.body.end,
            results: results
        })
    })

});


module.exports = app;
