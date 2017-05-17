/**
 * Created by martpasman on 15-05-17.
 * aanmaken, verwijderen, inloggen, uitloggen
 */

var express = require("express");
// var router = express.Router();
var mongoose = require('mongoose');
var User = require('../model/model_user');
var shortid = require('shortid');
var bcrypt = require('bcrypt-nodejs');
var fitbitClient = require('fitbit-node');
var request = require('request');
var consumer_key = '228HTD';
var client_secret = '41764caf3b48fa811ce514ef38c62791';
var redirect = 'http://127.0.0.1:3000/accounts/oauth_callback';
var client = new fitbitClient(consumer_key, client_secret);
var access_token;


var app = express();

var jwt = require('jsonwebtoken');

var logResponse = require('../app').logResponse;


app.post('/login', function (req, res) {

    if (req.body.id === undefined || req.body.password === undefined) {
        logResponse(400, 'id or password is not supplied');
        return res.status(400).send({error: 'id or password is not supplied'});
    }

    console.log('\tID:\t' + req.body.id + '\n\tpassword:\t*****');

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

app.get('/oauth/:id', function (req, res) {
  //  req.param.id

    //TODO: Check if not empty blablabla and save.
    var authURL = client.getAuthorizeUrl('activity profile settings sleep weight', redirect);
    console.log(authURL);
    res.redirect(authURL);

});

//on return from authentication
app.get('/oauth_callback', function (req, res) {
    console.log(req.query.code);


    var options = {
        url: 'https://api.fitbit.com/oauth2/token',
        headers: {
            'Authorization': ' Basic MjI4SFREOjQxNzY0Y2FmM2I0OGZhODExY2U1MTRlZjM4YzYyNzkx',
            'Content-Type': ' application/x-www-form-urlencoded'
        },
        body: "client_id=228HTD&grant_type=authorization_code&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Faccounts%2Foauth_callback&code=" + req.query.code

    };

    request.post(options, function (error, response, body) {
        console.log(response);
    });

});

app.get('/accestoken_callback',function(req,res){
    res.send(200);
});
module.exports = app;