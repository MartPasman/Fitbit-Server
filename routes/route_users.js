/**
 * Created by martpasman on 15-05-17.
 * account aanpassen, goal aanmaken, goal aanpassen, goal ophalen
 */
var express = require("express");
// var router = express.Router();
var mongoose = require('mongoose');
var User = require('../model/model_user');
var shortid = require('shortid');
var bcrypt = require('bcrypt-nodejs');
var fitbitClient = require('fitbit-node');
var consumer_key = '228HTD';
var client_secret = '41764caf3b48fa811ce514ef38c62791';


var app = express();

var jwt = require('jsonwebtoken');
var logResponse = require('../app').logResponse;


app.post('/newGoal', function (req, res) {

    jwt.verify(req.get("Authorization"), req.app.get('private-key'), function (err, decoded) {
        if (err) {
            logResponse(401, err.message);
            return res.status(401).send({error: 'Failed to authenticate token'});
        }

        if(!req.body.start instanceof Date || !req.body.end instanceof  Date || isNaN(req.body.goal)){
            logResponse(401, 'Wrong information supplied');
            return res.status(401).send({error: "Wrong information supplied"});
        }else {
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
});

module.exports = app;
