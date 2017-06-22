/**
 * Created by sveno on 21-6-2017.
 */
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
const Competition = require('../model/model_competition');

const logResponse = require('../support').logResponse;
const day = require('../support').day;
const today = require('../support').today;

const ADMIN = 2;

app.get('/', function (req, res) {

    logResponse(200, 'Setting the system up for the first time...');

    var password = "administrator";
    logResponse(200, 'Creating administrator...');
    bcrypt.genSalt(10, function (err, salt) {
        if (err) {
            logResponse(500, err.message);
            return res.status(500).send("Set up has failed");
        }

        bcrypt.hash(password, salt, undefined, function (err, hashed) {
            if (err) {
                logResponse(500, err.message);
                return res.status(500).send("Set up has failed");
            }

            var account = new User({
                firstname: "Admin",
                lastname: "Admin",
                id: 10001,
                password: hashed,
                active: true,
                type: ADMIN,
                birthday: today()
            });

            account.save(function (err, result) {
                if (err) {
                    logResponse(500, err.message);
                    return res.status(500).send("Set up has failed");
                }
                logResponse(201, 'Admin added.');

                generatecompId(function (id) {
                    //get today's date
                    var date = today();
                    var end_date = today();
                    //create competition for 7 days (this is the first, so standard = 7)
                    end_date = end_date.setDate(date.getDate() + 1);


                    //create competition.
                    var comp = new Competition({
                        id: id,
                        start: date,
                        end: end_date,
                        results: []
                    });

                    //save competition.
                    comp.save(function (err, resp) {
                        if (err) {
                            logResponse(500, "Internal server error");
                            return res.status(500).send(err);
                        }
                        logResponse(200, "Competition added.");
                        logResponse(200, 'The system has succesfully been setup, you can login now with: ID: 10001, PASSWORD: administrator ' +
                            'do not forget to change your information.');
                        res.status(201).send('The system has succesfully been setup, you can login now with: ID: 10001, PASSWORD: administrator ' +
                            'do not forget to change your information. A standard competition with length: 1 day has been created.');
                    });

                });


            });
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

module.exports = app;
