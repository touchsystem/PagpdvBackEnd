var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

var MenuGroups = new Schema({
   name: {type: String, require: true},
   maximumNumber: Number,
   internalId: String,
   status: {type: Number, default: 0}
}, {timestamps: true, collection: 'MenuGroups'});

MenuGroups.plugin(mongoosePaginate);
MenuGroups.plugin(mongooseAggregatePaginate);

module.exports = MenuGroups;