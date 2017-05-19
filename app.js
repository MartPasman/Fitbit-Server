/**
 * Created on 15-05-17.
 */
var express = require('express');
var app = express();

// jwt private key
var privateKey = 'r2f9u0rcqjucr98cr2yc890qu98cr3qr93c298mq';
// set private key:
app.set('private-key', privateKey);

//set database information
//var database = require('./module/database');

//app.use(express.static('public'));

// Parse application/json
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

mongoose.Promise = global.Promise;

var options = {server: {socketOptions: {keepAlive: 1}}};
//mongoose.connect('mongodb://myUserAdmin:abc123@localhost:27017/admin', options);
mongoose.connect('mongodb://localhost:27017/database', options);
mongoose.connection.on('error', function (err) {
    console.log('Could not connect to MongoDB server: ' + err);
});

// set all the permissions
app.use(function (req, res, next) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
    res.set("Access-Control-Allow-Headers", "Authorization");

    // respond to pre-flight options requests
    if (req.method === "OPTIONS") {
        return res.status(200).send();
    }

    // log request
    console.log('\u001B[36m[' + (new Date().toLocaleString()) + ']\u001B[0m \u001B[35m' + req.method + '\u001B[0m ' + req.url + ' called from ' + req.connection.remoteAddress);

    return next();
});

//set account routes
var accountsRoutes = require('./routes/route_accounts');
app.use('/accounts', accountsRoutes);
//
// //set competition routes
// var competitionRoutes = require('./routes/route_competitions');
// app.use('competitions/', competitionRoutes);
//
// //set user routes
var userRoutes = require('./routes/route_users');
app.use('/accounts/users', userRoutes);

/*
 //sends a 400 (bad request if the user send a invalid request)
 app.use(function (error, req, res, next) {
 if (error instanceof SyntaxError) {
 res.status(400).json({'status': 'invalid request'});
 } else {
 next();
 }
 });
 */

app.get('/api', function (req, res) {
    res.status(200).send({'Hello,': ' World!'});
});

//listen on port 3000
app.listen(3000, function () {
    console.log('Listening on port 3000!');
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

module.exports.logResponse = logResponse;