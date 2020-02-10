var mongoose = require('mongoose'),
aggregatePaginate = require('mongoose-aggregate-paginate'),
Schema = mongoose.Schema;

var Sales = new Schema({
    tableId: {type: Schema.Types.ObjectId, nullable: true},
    businessPartnerId: String,
    fiscal: Object,
    salesType: Number,
    saleId: Number,
    deliveryId: String,
    cashierId: {type: Schema.Types.ObjectId, ref: 'Users'},
    waiterId: {type: Schema.Types.ObjectId, ref: 'Users'},
    billType: Number,
    total: Number,
    taxes: Number,
    serviceTaxes: {type: Number, default: 0},
    status: {type: Number, default: 0},
    isProcessed: {type: Boolean, default: false},
    discounts: Object,
    observations: String,
    menuItems: Object,
    payment: Object,
    date: Date,
    systemDate: Date,
}, {collection: 'Sales', timestamps: true});

Sales.plugin(aggregatePaginate);

module.exports = Sales;