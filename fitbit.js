/**
 * Created on 22-05-17.
 * Fitbit API framework
 */
const User = require('./model/model_user');
const request = require('request');
const mongoose = require('mongoose');
const fitbitClient = require('fitbit-node');
const logResponse = require('./support').logResponse;

const client_id = '228HTD';
const client_secret = '41764caf3b48fa811ce514ef38c62791';
const client = new fitbitClient(client_id, client_secret);

const ADMIN = 2;

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
    if (res.user.type !== ADMIN && parseInt(res.user.id) !== parseInt(userid)) {
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

        fitbitAPICall(req, res, url, user.fitbit.accessToken, user.fitbit.refreshToken, user.fitbit.userid, userid, callback);
    });
};

/**
 * Does a call to the Fitbit API and passes the response body to the callback function
 * @param req
 * @param res
 * @param url
 * @param accessToken
 * @param refreshToken
 * @param fitbitid
 * @param userid
 * @param callback
 * @constructor
 */
function fitbitAPICall(req, res, url, accessToken, refreshToken, fitbitid, userid, callback) {
    request.get(url.replace('[id]', fitbitid),
        {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        }, function (error, response, body) {
            if (error !== undefined && response.statusCode !== 200) {
                if (response.statusCode === 401) {
                    // token expires
                    logResponse(response.statusCode, 'Fitbit API authorization token expired for user: ' + userid + '.');
                    // try to refresh tokens
                    doRefreshToken(userid, accessToken, refreshToken, function (success) {
                        if (success) {
                            // start over
                            prepareAPICall(req, res, url, callback);
                        } else {
                            // if refreshing the token went wrong, remove the Fitbit connection
                            User.findOneAndUpdate({id: user.id}, {$unset: {fitbit: 1}}, function (err) {
                                if (err) {
                                    console.error(err.message);
                                }

                                logResponse(500, 'Token could not be refreshed! Removed Fitbit connection.');
                                return res.status(500).send({error: 'Token could not be refreshed! Removed Fitbit connection.'});
                            });
                        }
                    });
                } else {
                    if (response.statusCode === 429) {
                        // call limit reached
                        logResponse(response.statusCode, 'Fitbit API request limit reached for user: ' + userid + '.');
                        return res.status(response.statusCode).send({error: 'Fitbit API request limit reached for user: ' + userid + '.'});
                    } else {
                        // all other errors
                        console.error(response.body);
                        logResponse(response.statusCode, 'Fitbit API error.');
                        return res.status(response.statusCode).send({error: 'Fitbit API error.'});
                    }
                }
            } else {
                callback(body);
            }
        });
}

function fitbitAPICallNoResponse(url, user, callback) {
    request.get(url.replace('[id]', user.fitbit.userid),
        {
            headers: {
                Authorization: 'Bearer ' + user.fitbit.accessToken
            }
        }, function (error, response, body) {
            if (error !== undefined && response.statusCode !== 200) {
                if (response.statusCode === 401) {
                    // token expires
                    logResponse(response.statusCode, 'Fitbit API authorization token expired for user: ' + user.id + '.');
                    // try to refresh tokens
                    doRefreshToken(user.id, user.fitbit.accessToken, user.fitbit.refreshToken, function (success) {
                        if (success) {
                            // get the new access token
                            User.find({id: user.id}, {}, function (err, newUser) {
                                fitbitAPICallNoResponse(url, newUser, callback);
                            });
                        } else {
                            // if refreshing the token went wrong, remove the Fitbit connection
                            User.findOneAndUpdate({id: user.id}, {$unset: {fitbit: 1}}, function (err) {
                                if (err) {
                                    console.error(err.message);
                                }

                                logResponse(500, 'Token could not be refreshed! Removed Fitbit connection.');
                            });
                        }
                    });
                } else {
                    if (response.statusCode === 429) {
                        // call limit reached
                        logResponse(response.statusCode, 'Fitbit API request limit reached for user: ' + user.id + '.');
                    } else {
                        // all other errors
                        console.error(response.body);
                        logResponse(response.statusCode, 'Fitbit API error.');
                    }
                }
            } else {
                callback(body);
            }
        });
}

/**
 * Refreshes the token and updates the record in the database of a certain user
 * @param userid id of the user to refresh its token
 * @param accessToken
 * @param refreshToken
 * @param callback function to call after refreshing
 */
function doRefreshToken(userid, accessToken, refreshToken, callback) {
    console.log('Going to refresh token of user: ' + userid + '.');
    const promise = client.refreshAccessToken(accessToken, refreshToken);

    promise.then(function (success) {
        // if the request succeeds

        var json = {
            userid: success.user_id,
            accessToken: success.access_token,
            refreshToken: success.refresh_token
        };

        //find the requested user and add the renewed fitbit
        User.findOneAndUpdate({id: userid}, {$set: {fitbit: json}}, function (err) {
            if (err) {
                console.error('MongoDB: ' + err.message);
                return callback(false);
            }

            // successfully saved new access and refresh token
            console.log('Refreshing token succeeded.');
            callback(true);
        });
    }, function (error) {
        // refreshing fails
        console.error('Refreshing token failed.');
        callback(false);
    });
}

function addSubscription(userid, callback) {

    User.findOne({id: userid}, {fitbit: true}, function (err, result) {
        if (err) {
            console.error('MongoDB: ' + err.message);
            callback(false);
            return;
        }

        // if the user was not found
        if (result === undefined) {
            console.error('Tried to add subscription for unknown userid.');
            callback(false);
            return;
        }

        // if the user is not connected to a fitbit
        if (result.fitbit === undefined) {
            console.error('Tried to add subscription for non connected user.');
            callback(false);
            return;
        }

        // prepare the POST request
        const options = {
            headers: {
                Authorization: 'Bearer ' + result.fitbit.accessToken
            }
        };

        const subscriptionId = (new Date()).getTime();

        request.post(
            'https://api.fitbit.com/1/user/-/activities/apiSubscriptions/' + subscriptionId + '.json',
            options,
            function (error, response, body) {
                if (error) {
                    console.error(error);
                    callback(false);
                    return;
                }

                console.log(body);

                if (response.statusCode === 200 || response.statusCode === 201) {
                    // success
                    callback(true);
                } else if (response.statusCode === 409) {
                    console.error('Subscription not unique.');
                    callback(false);
                } else {
                    console.error('Unexpected response: '  + response.statusCode);
                    callback(false);
                }
            });
    });
}

module.exports.fitbitCall = prepareAPICall;
module.exports.fitbitCallSimple = fitbitAPICallNoResponse;
module.exports.doRefreshToken = doRefreshToken;
module.exports.addSubscription = addSubscription;