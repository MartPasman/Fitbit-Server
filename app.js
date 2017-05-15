/**
 * Created by martpasman on 15-05-17.
 */
/**
 *  The index
 */
var express = require('express');
var app = express();

//set database information
var database = require('./module/database');

app.use(express.static('public'));

// Parse application/json
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//set account routes
var accountsRoutes = require('./routes/route_accounts');
app.use('', accountsRoutes);

//set competition routes
var competitionRoutes = require('./routes/route_competitions');
app.use('', competitionRoutes);


//set user routes
var userRoutes = require('./routes/route_users');
app.use('', userRoutes);





//sends a 400(bad request if the user send a invalid request)
app.use(function (error, req, res, next) {
    if (error instanceof SyntaxError) {
        res.status(400).json({"status": "invalid request"});
    } else {
        next();
    }
});

//listen on port 80
app.listen(3000, function () {
    console.log('Listening on port 80!');
});

var logResponse = function (code, message, depth) {
    if (depth == undefined) depth = '\t';
    if (message == undefined) message = '';
    if (code == undefined) return;

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