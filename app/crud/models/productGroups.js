var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
Schema = mongoose.Schema;

var ProductGroups = new Schema({
    name: {type: String, required: [true, 'Campo nombre requerido.']},
    accountNumber: String,
    internalId: String,
    status: {type: Number, default: 0}
}, {timestamps: true, collection: 'ProductGroups'});

ProductGroups.plugin(mongoosePaginate);
ProductGroups.plugin(mongooseAggregatePaginate);

module.exports = ProductGroups;