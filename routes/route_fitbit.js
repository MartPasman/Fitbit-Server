/**
 * Created on 29-05-17.
 */
const express = require("express");
const request = require("request");
const app = express.Router();

const User = require('../model/model_user');

const verificationCode = 'f65cafbb1d326cd0a613038f9b7287406b83300fa3ec5db46c261288dc2aa543';

/**
 * Verification process of a subscriber endpoint
 */
app.get('/webhook', function (req, res) {

    if (req.query.verify === undefined) {
        logResponse(400, 'No verify query parameter provided.');
        return res.status(400).send({error: 'No verify query parameter provided.'});
    }

    if (req.query.verify === verificationCode) {
        logResponse(204, 'Verification code correct.');
        return res.status(204).send();
    } else {
        logResponse(404, 'Verification code incorrect.');
        return res.status(404).send({error: 'Verification code incorrect.'});
    }
});

// TODO: remove later
app.get('/:id/refresh', function (req, res) {

    User.findOne({id: req.params.id}, {fitbit: 1}, function (error, result) {
        if (error) {
            logResponse(500, error.message);
            return res.status(500).send({error: error.message});
        }

        if (result === undefined) {
            logResponse(404, 'User not found.');
            return res.status(404).send({error: 'User not found.'});
        }

        if (result.fitbit === undefined || result.fitbit.userid === undefined ||
            result.fitbit.accessToken === undefined || result.fitbit.refreshToken === undefined) {
            logResponse(412, 'User not connected to a Fitbit.');
            return res.status(412).send({error: 'User not connected to a Fitbit.'});
        }

        require('../fitbit').doRefreshToken(req.params.id, result.fitbit.accessToken, result.fitbit.refreshToken, function (success) {
            logResponse(success ? 200 : 500, 'Refreshed tokens: ' + success);
            return res.status(success ? 200 : 500).send({success: success});
        });
    });
});

app.get('/:id/subscribe', function (req, res) {

    require('../fitbit').addSubscription(req.params.id, function (success) {
        logResponse(success ? 200 : 500, 'Added subscription: ' + success);
        return res.status(success ? 200 : 500).send({success: success});
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