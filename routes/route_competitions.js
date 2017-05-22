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



app.get('/total', function(req,res){
    Competition.find({}, function(err,result){
        if(err){
            return res.status(500).send();
        }
        //returnt het hele [] object
        return res.status(200).send(result);
    });
});



module.exports = app;
