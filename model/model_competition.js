var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var resultSchema = new Schema({
    userid: {type: Number, required: true},
    score: {type: Number, required: true},
    goalAchieved: {type: Boolean, required: true}
});

module.exports = mongoose.model('result', resultSchema);

var competitionSchema = new Schema({
    id: {type: Number, required: true, unique: true},
    goal: {type: Number, required: true},
    defaultGoal: {type: Number, required: true},
    defaultLength: {type: Number, required: true},
    length:{type: Number, required: true},
    start: {type: Date, required: true},
    end: {type: Date, required: true},
    results: [resultSchema],
    sharedGoal: {type:Number, required: true},
    defaultSharedGoal: {type:Number, required:true},
    sharedGoalProcess: {type:Number, required:true},
    sharedGoalAchieved: {type:Boolean, required:true}
});

module.exports = mongoose.model('competition', competitionSchema);