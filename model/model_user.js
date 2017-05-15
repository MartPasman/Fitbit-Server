/**
 * Created by sveno on 15-5-2017.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var fitbitSchema = new Schema({
    userid: {type: String, required:true},
    accesToken: {type: String, required:true},
    refreshtoken: {type: String, required:true}
});

module.exports = mongoose.model('fitbit', fitbitSchema);

var goalSchema = new Schema({
    id: {type: Number, required:true},
    start: {type: Date, required:true},
    end: {type: Date, required:true},
    progress: {type: Number, required:true, default: 0},
    percentage: {type: Number, required:true, default: 0}

});

module.exports = mongoose.model('goal', goalSchema);

var userSchema = new Schema({
    id: {type: Number, required: true, unique: true},
    password: {type: String, required: true},
    salt: {type: String, required: true},
    fitbit: {type: fitbitSchema, required: false},
    goals: {type: [goalSchema], required: false},
    email: {type: String, required: true},
    active: {type: Boolean, required: true, default: true},
    handicap: {type: Number, required: false, default: 1},
    type: {type: Number, required: true, default: 1}
});

module.exports = mongoose.model('user', userSchema);