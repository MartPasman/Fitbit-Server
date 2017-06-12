var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var resultSchema = new Schema({
    userid: {type: Number, required: true},
    score: {type: Number, required: true, default: 0},
    goalAchieved: {type: Boolean, required: true, default: false}
});

module.exports = mongoose.model('result', resultSchema);

var competitionSchema = new Schema({
    id: {type: Number, required: true, unique: true},
    start: {type: Date, required: true, default: new Date()},
    end: {type: Date, required: true, default: new Date().setDate(new Date().getDate() + 6)},
    goal: {type: Number, required: true, default: 3000},
    defaultGoal: {type: Number, required: true, default: 3000},
    sharedGoal: {type: Number, required: true, default: 50000},
    sharedScore: {type: Number, required: true, default: 0},
    defaultSharedGoal: {type: Number, required: true, default: 50000},
    sharedGoalProgress: {type: Number, required: true, default: 0},
    sharedGoalAchieved: {type: Boolean, required: true, default: false},
    defaultLength: {type: Number, required: true, default: 7},
    results: [resultSchema]
});

module.exports = mongoose.model('competition', competitionSchema);