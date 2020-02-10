var mongoose = require('mongoose'),
Schema = mongoose.Schema,
paginate = require('mongoose-paginate');

var StockGroup = new Schema({
    denomination: String,
    accountNumber: String,
    status: {type: Number, default: 0}    
}, {collection: 'StockGroups', timestamps:true})

StockGroup.plugin(paginate);

module.exports = StockGroup;