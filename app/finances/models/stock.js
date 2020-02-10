var mongoose = require('mongoose'),
Schema = mongoose.Schema,
aggregatePaginate = require('mongoose-aggregate-paginate');
paginate = require('mongoose-paginate');

var Stock = new Schema({
    productId: {type: Schema.Types.ObjectId, ref: 'Products'},
    measure: Number,
    unitPrice: Number,
    date: Date,
    subtotalPrice: Number,
    stockGroupId: {type: Schema.Types.ObjectId, nullable: true},
    transactionId: Number,
    isProcessed: {type: Boolean, default: false},
    outputType: String,
    ref: String,
    status: {type: Number, default: 0}    
}, {collection: 'Stock', timestamps:true})

Stock.plugin(aggregatePaginate);
Stock.plugin(paginate);

module.exports = Stock;