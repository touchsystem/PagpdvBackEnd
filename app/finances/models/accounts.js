var mongoose = require('mongoose'),
Schema = mongoose.Schema,
paginate = require('mongoose-paginate');

var Account = new Schema({
    accountNumber: {type: String, unique: true},
    additionalInformation: Object,
    denomination: String,
    level: Number,
    currency: String,
    previousBalance: {type: Number, default: 0},
    debit: {type: Number, default: 0},
    credit: {type: Number, default: 0},
    balance: {type: Number, default: 0},
    status: {type: Number, default: 0}
}, {collection: 'Accounts', timestamps: true});

Account.plugin(paginate);

module.exports = Account;