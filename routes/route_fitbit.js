/**
 * Created on 29-05-17.
 */
const express = require("express");
const request = require("request");
const app = express.Router();
const logResponse = require('../support').logResponse;

const User = require('../model/model_user');

app.get('/:id/subscribe', function (req, res) {

    require('../fitbit').addSubscription(req.params.id, function (success) {
        logResponse(success ? 200 : 500, 'Added subscription: ' + success);
        return res.status(success ? 200 : 500).send({success: success});
    });
});

module.exports = app;