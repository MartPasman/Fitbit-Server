
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var resultSchema = new Schema({
    userid: {type: String, required:true},
    score: {type: Number, required:true},
    goalAchieved: {type: Boolean, required:true}
});

module.exports = mongoose.model('result', resultSchema);

var competitionSchema = new Schema({
    id: {type: Number, required:true},
    goal: {type: Number, required:true},
    defaultGoal: {type: Number, required:true},
    start: {type: Date, required:true},
    end: {type: Date, required:true},
    results: [resultSchema]
});

module.exports = mongoose.model('competition', competitionSchema);