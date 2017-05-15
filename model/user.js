/**
 * Created by sveno on 15-5-2017.
 */
var mongoose = require('mongoose');


var Schema = mongoose.Schema;

var userSchema = new Schema({
    id: {type: Number, required: true, unique: true},
    password: {type: String, required: true},
    salt: {type: String, required: true},
    email: {type: String, required: true},
    active: {type: bool, required: true, default: true},
    handicap: {type: Number, required: false, default: 1},
    type: {type: Number, required: true, default: 1}
});

module.exports = mongoose.model('user', userSchema);