/**
 * Created by martpasman on 15-05-17.
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var fitbitSchema = new Schema({
    userid: {type: String, required:true},
    accesToken: {type: String, required:true},
    refreshtoken: {type: String, required:true}
});

module.exports = mongoose.model('fitbit', fitbitSchema);
