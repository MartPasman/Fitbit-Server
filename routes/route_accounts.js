/**
 * Created by martpasman on 15-05-17.
 * aanmaken, verwijderen, inloggen, uitloggen
 */

var express = require("express");
var router = express.Router();
var mongoose = require('mongoose');
var User = require('../model/model_user');
var shortid = require('shortid');
var bcrypt = require('bcrypt-nodejs');
var Fitbit = require('fitbit');
var consumer_key = '228HTD';
var client_secret = '41764caf3b48fa811ce514ef38c62791';

var app = express();

var jwt = require('jsonwebtoken');

var logResponse = require('../app').logResponse;


app.post('/login', function (req, res) {

    if (req.body.id === undefined || req.body.password === undefined) {
        logResponse(400, 'id or password is not supplied');
        return res.status(400).send({error: 'id or password is not supplied'});
    }

    console.log('\tID:\t' + req.body.id+ '\n\tpassword:\t*****');

    // Find the user
    User.findOne({id: req.body.id}, {_id: 0, __v: 0}, function (err, user) {

        // Check to see whether an error occurred
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send({error: err.message});
        }

        // Check to see whether a user was found
        if (!user) {
            logResponse(400, 'Invalid credentials');
            return res.status(400).send({error: "Invalid credentials"});
        }

        try {
            // Check to see whether the given password matches the password of the user
            bcrypt.compare(req.body.password, user.password, function (err, success) {
                if (err) {
                    logResponse(500, err.message);
                    return res.status(500).send({error: err.message});
                }

                if (!success) {
                    logResponse(400, 'Invalid credentials');
                    return res.status(400).send({error: "Invalid credentials"});
                }

                // remove sensitive data
                user.password = undefined;

                // sign json web token (expires in 12 hours)
                var token = jwt.sign(user, req.app.get('private-key'), {expiresIn: (60 * 60 * 12)});

                logResponse(201, 'Token created and in body');
                res.status(201).send({
                    succes: token
                });
            });
        } catch (err) {
            // if the bcrypt fails
            logResponse(500, err.message);
            return res.status(500).send({error: err.message});
        }
    });
});

app.get('/oauth', function(req,res){
    var client = new Fitbit(consumer_key, client_secret);

    client.getRequestToken(function (err,token,tokenSecret) {
        if (err){
            //do something!
            return;
        }

        req.session.oauth = {
            requestToken: token,
            requestTokenSecret: tokenSecret
        };
        res.redirect(client.authorizeUrl(token));
    })

});

module.exports = app;