/**
 * Created by martpasman on 15-05-17.
 * aanmaken, verwijderen, inloggen, uitloggen
 */

var express = require("express");
var router = express.Router();
var mongoose = require('mongoose');
var Account = require('../model/account');
var User = require('../model/model_user');
var shortid = require('shortid');
var bcrypt = require('bcrypt-nodejs');

var jwt = require('jsonwebtoken');



