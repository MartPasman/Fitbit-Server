/**
 * Created on 22-05-17.
 * Fitbit API framework
 */
var User = require('./model/model_user');
var request = require("request");
var mongoose = require('mongoose');
// var logResponse = require('./app.js').logResponse;

/**
 * Prepares an API call to the Fitbit API by checking authorization,
 * user existence, fitbit object extistence.
 * @param req original request object
 * @param res response object
 * @param url Fitbit API url to call
 * @param callback what to do when we prepared the API call
 */
var prepareAPICall = function (req, res, url, callback) {
    // check if a valid id was provided
    if (req.params.id === undefined || isNaN(req.params.id)) {
        logResponse(400, 'No valid user id provided: ' + req.params.id);
        return res.status(400).send({error: 'No valid user id provided.'});
    }

    const userid = req.params.id;

    // check if the user that requests the data is the user whose data is requested
    if (res.user.type !== 3 && parseInt(res.user.id) !== parseInt(userid)) {
        logResponse(403, 'User does not have permission to make this request.');
        return res.status(403).send({error: 'User does not have permission to make this request.'});
    }

    // get the authorization token from the database
    User.findOne({id: userid}, {fitbit: 1}, function (err, user) {
        if (err) {
            logResponse(500, 'MongoDB error: ' + err.message);
            return res.status(500).send({error: 'MongoDB error: ' + err.message});
        }

        // no user found with the given id
        if (!user) {
            logResponse(404, 'User account could not be found.');
            return res.status(404).send({error: 'User account could not be found.'});
        }

        // no fitbit connected to this account
        if (user.fitbit === undefined || user.fitbit.accessToken === undefined || user.fitbit.userid === undefined) {
            logResponse(412, 'User account not connected to a Fitbit.');
            return res.status(412).send({error: 'User account not connected to a Fitbit.'});
        }

        fitbitAPICall(req, res, url, user.fitbit.accessToken, user.fitbit.userid, userid, callback);
    });
};

/**
 * Does a call to the Fitbit API and passes the response body to the callback function
 * @param req
 * @param res
 * @param url
 * @param accessToken
 * @param fitbitid
 * @param userid
 * @param callback
 * @constructor
 */
function fitbitAPICall(req, res, url, accessToken, fitbitid, userid, callback) {
    request.get(url.replace('[id]', fitbitid),
        {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        }, function (error, response, body) {
            if (error !== undefined && response.statusCode !== 200) {
                if (response.statusCode === 401) {
                    logResponse(response.statusCode, 'Fitbit API authorization token expired for user: ' + userid + '.');
                    refreshToken(userid, function (success) {
                        if (success) {
                            fitbitAPICall(req, res, url, accessToken, fitbitid, userid, callback);
                        } else {
                            // if refreshing the token went wrong
                            return res.status(500).send({error: 'Token could not be refreshed.'});
                        }
                    });
                } else {
                    if (response.statusCode === 429) {
                        logResponse(response.statusCode, 'Fitbit API request limit reached for user: ' + userid + '.');
                    } else {
                        console.error(response.body);
                        logResponse(response.statusCode, 'Fitbit API error.');
                    }
                    return res.status(response.statusCode).send({error: 'Fitbit API error.'});
                }
            } else {
                callback(body);
            }
        });
}

/**
 * Refreshes the token and updates the record in the database of a certain user
 * @param userid id of the user to refresh its token
 * @param callback function to call after refreshing
 */
function refreshToken(userid, callback) {
    console.log('Going to refresh token of user: ' + userid + '.');

    User.findOne({id: userid}, function (err, user) {
        if (err) {
            console.error('0: ' + err.message);
            callback(false);
            return;
        }

        var options = {
            url: 'https://api.fitbit.com/oauth2/token',
            headers: {
                Authorization: ' Basic MjI4SFREOjQxNzY0Y2FmM2I0OGZhODExY2U1MTRlZjM4YzYyNzkx',
                'Content-Type': ' application/x-www-form-urlencoded'
            },
            body: "grant_type=refresh_token&refresh_token=" + user.fitbit.refreshToken
        };

        //send the request
        request.post(options, function (error, response, body) {
            if (error) {
                console.error('1: ' + err.message);
                callback(false);
                return;
            }

            var parsedRes = JSON.parse(body);

            var json = {
                userid: parsedRes.user_id, accessToken: parsedRes.access_token, refreshToken: parsedRes.refresh_token
            };
            console.log(json);

            //find the requested user and add the renewed fitbit
            User.findOneAndUpdate({id: userid}, {$set: {fitbit: json}}, function (err, result) {
                if (err) {
                    console.error('2: ' + err.message);
                    callback(false);
                    return;
                }

                callback(true);
            });
        });
    });
}

function logResponse(code, message, depth) {
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
}

module.exports.fitbitCall = prepareAPICall;