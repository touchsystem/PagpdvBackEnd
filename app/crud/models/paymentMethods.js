var mongoose = require('mongoose'),
paginate = require('mongoose-paginate'),
Schema = mongoose.Schema;

var PaymentMethod = new Schema({
    name: {type: String, unique: true},
    internalId: String,
    accountNumber: String,
    currencyAccount: String,
    accountNumber: String,
    multiplyOrDivide: Number,
    attachment: Object,
    isCurrency: Boolean,
    default: Number,
    status: {type: Number, default: 0}
}, {collection: 'PaymentMethods', timestamps: true});

PaymentMethod.plugin(paginate);
module.exports = PaymentMethod;