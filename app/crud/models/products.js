var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
Schema = mongoose.Schema;

var Products = new Schema({
    name: {type: String, required: [true, 'Campo nombre requerido.']},
    price: Number,
    cost: Number,
    minimumStock: Number,
    goalStock: Number,
    currentStock: Number,
    unit: String,
    internalId: String,
    groupId: {type: Schema.Types.ObjectId, ref: 'ProductGroups'},
    status: {type: Number, default: 0}
}, {timestamps: true, collection: 'Products'});

Products.plugin(mongoosePaginate);

module.exports = Products;