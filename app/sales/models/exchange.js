var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
Schema = mongoose.Schema;

var Exchange = new Schema({
    currencyId: {type: Schema.Types.ObjectId, ref: 'Banks'},
    amount: Number,
    operator: Number
}, {collection: 'Exchange', timestamps: true});

Exchange.plugin(mongoosePaginate);

module.exports = Exchange;