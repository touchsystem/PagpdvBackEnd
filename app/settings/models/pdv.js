var mongoose = require('mongoose'),
Schema = mongoose.Schema,
paginate = require('mongoose-paginate');

var PDV = new Schema({
    name: String,
    password: String,
    observations: Object,
    invoiceSerie: Number,
    invoiceNumber: Number,
    status: {type: Number, default: 0}
}, {collection: 'PDV', timestamps: true});

PDV.plugin(paginate);

module.exports = PDV;