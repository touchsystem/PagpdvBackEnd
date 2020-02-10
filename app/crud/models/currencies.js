var mongoose = require('mongoose'),
Schema = mongoose.Schema;

var Currency = new Schema({
    name: String,
    method: {type: mongoose.Types.ObjectId, ref: 'MethodPayments'},
    multiplyOrDivide: Number,
    internalId: String,
    currencyAccount: String,
    accountNumber: String,
    default: Boolean,
    status: {type: Number, default: 0}
}, {collection: 'Currencies', timestamps: true});

module.exports = Currency;