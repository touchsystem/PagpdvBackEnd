const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const Contracts = new Schema({
    observation: String,
    accountId: {type: Schema.Types.ObjectId},
    amount: Number,
    day: Number,
    contactId: {type: Schema.Types.ObjectId}
}, {collection: 'Contracts', timestamps: true});

module.exports = Contracts;