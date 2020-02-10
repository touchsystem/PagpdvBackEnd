var mongoose = require('mongoose'),
Schema = mongoose.Schema,
paginate = require('mongoose-paginate'),
aggregatePaginate = require('mongoose-aggregate-paginate');

var Cashflow = new Schema({
    documentNumber: String,
    accountNumber: {type: String, required: true},
    observations: Object,
    debitAmount: {type: Number, default: 0},
    creditAmount: {type: Number, default: 0},
    transactionId: Number,
    ref: String,
    date: {type: Date, default: Date.now}
}, {collection: 'Cashflow', timestamps: true});

Cashflow.plugin(paginate);
Cashflow.plugin(aggregatePaginate);

module.exports = Cashflow;