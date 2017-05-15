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

//set middleware route
var middlewareRoute = require('./routes/middleware');
app.use('', middlewareRoute);




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