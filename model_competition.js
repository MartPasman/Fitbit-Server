/**
 * Created by sveno on 15-5-2017.
 */
/**
 * Created by sveno on 15-5-2017.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var resultSchema = new Schema({
    userid: {type: String, required:true},
    score: {type: Number, required:true},
    goalAchieved: {type: bool, required:true},
});

module.exports = mongoose.model('result', resultSchema);

var competitionSchema = new Schema({
    id: {type: Number, required:true},
    goal: {type: Number, required:true},
    defaultgoal: {type: Number, required:true},
    start: {type: Date, required:true},
    end: {type: Date, required:true},
    results: [resultSchema]
});

module.exports = mongoose.model('competition', competitionSchema);