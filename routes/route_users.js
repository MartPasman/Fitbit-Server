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
 * TODO
 */
app.get('/:id/stats/total', function (req, res) {

    // check if a valid id was provided
    if (req.params.id === undefined || isNaN(req.params.id)) {
        logResponse(400, 'No valid user id provided: ' + req.params.id);
        return res.status(400).send({error: 'No valid user id provided'});
    }

    const userid = req.params.id;

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

        const authToken = user.fitbit.accessToken;

        request.get('https://api.fitbit.com/1/user/' + user.fitbit.userid + '/activities.json',
            {
                headers: {
                    Authorization: 'Bearer ' + authToken
                }
            }, function (error, response, body) {
                logResponse(response.statusCode, body);
                if (error !== undefined || response.statusCode !== 200) {
                    // logResponse(500, 'Fitbit API error: ' + error.message);
                    // return res.status(500).send({error: 'Fitbit API error: ' + error.message});
                }

                const stats = JSON.parse(body);
                logResponse(200, 'Stats collected successfully.');
                return res.status(200).send({success: stats});
            });
    });
});

/**
 * TODO
 */
app.get('/:id/stats/week/last', function (req, res) {

});

app.post('/:id/goals', function (req, res) {

    jwt.verify(req.get("Authorization"), req.app.get('private-key'), function (err, decoded) {
        if (err) {
            logResponse(401, err.message);
            return res.status(401).send({error: 'Failed to authenticate token'});
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

module.exports = app;
