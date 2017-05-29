/**
 * Created on 29-05-17.
 */
const express = require("express");
const request = require("request");
const app = express.Router();
const logResponse = require('../app').logResponse;

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

