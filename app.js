/**
 * Created on 15-05-17.
 */
var express = require('express');
var app = express();

// jwt private key
var privateKey = 'r2f9u0rcqjucr98cr2yc890qu98cr3qr93c298mq';
// set private key:
app.set('private-key', privateKey);


// Parse application/json
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

mongoose.Promise = global.Promise;

var options = {server: {socketOptions: {keepAlive: 1}}};
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

    // to prevent spam
    if (req.url !== '/api') {
        // log request
        console.log('\u001B[36m[' + (new Date().toLocaleString()) + ']\u001B[0m \u001B[35m' + req.method + '\u001B[0m ' + req.url + ' called from ' + req.connection.remoteAddress);
    }
    return next();
});

// set fitbit routes
var setupRoutes = require('./routes/route_setup');
app.use('/setup', setupRoutes);

// set fitbit routes
var fitbitRoutes = require('./routes/route_fitbit');
app.use('/fitbit', fitbitRoutes);

//set user routes
var userRoutes = require('./routes/route_users');
app.use('/users', userRoutes);

//set account routes
var accountsRoutes = require('./routes/route_accounts');
app.use('/accounts', accountsRoutes);

//set competition routes
var competitionRoutes = require('./routes/route_competitions');
app.use('/competitions', competitionRoutes);

app.get('/api', function (req, res) {
    res.status(200).send({'Hello,': ' World!'});
});

//listen on port 3000
app.listen(3000, function () {
    console.log('Listening on port 3000!');
});

function authentication(req, res, next) {
    jwt.verify(req.get("Authorization"), req.app.get('private-key'), function (err, decoded) {
        if (err) {
            logResponse(401, err.message);
            return res.status(401).send({error: "User is not logged in."});
        }

        // Save user for future purposes
        res.user = decoded._doc;

        next();
    });
}

module.exports.authentication = authentication;