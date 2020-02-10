var mongoose = require('mongoose'),
Schema = mongoose.Schema,
paginate = require('mongoose-paginate');

var Pendants = new Schema({
    name: String,
    measure: Number,
    date: Date,
    menuItemId: Schema.Types.ObjectId,
    status: Number
}, {collection: 'Pendants', timestamps: true});

Pendants.plugin(paginate);

module.exports = Pendants;