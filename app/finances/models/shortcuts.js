var mongoose = require('mongoose'),
Schema = mongoose.Schema,
paginate = require('mongoose-paginate'),
paginateAggregate = require('mongoose-aggregate-paginate');

var Shortcut = new Schema({
    name: String,
    creditAccount: String,
    debitAccount: String,
    status: {type: Number, default: 0}
}, {collection: 'Shortcuts', timestamps:true});

Shortcut.plugin(paginate);
Shortcut.plugin(paginateAggregate);

module.exports = Shortcut;
