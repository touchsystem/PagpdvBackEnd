var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
Schema = mongoose.Schema;

var Orders = new Schema({
    customer: Object,
    address: Object,
    items: Object,
    status: Boolean,
    transaction: Array
}, {collection: 'Orders', timestamps: true});

Orders.plugin(mongoosePaginate);

module.exports = Orders;