var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
mongooseAggregatePaginate = require('mongoose-aggregate-paginate'),
Schema = mongoose.Schema;

var MenuItems = new Schema({
    groupId: {type: Schema.Types.ObjectId, ref: 'MenuGroups'},
    name: {type: String, required: [true, 'Campo nombre requerido.']},
    price: Number,
    favorite: Boolean,
    productionPointId: {type: Schema.Types.ObjectId, ref: 'ProductionPoints'},
    unit: String,
    imageUrl: String,
    description: String,
    items: Object,
    min: Number,
    deliveryPrice: Number,
    max: Number,
    related: {type: Schema.Types.ObjectId, nullable: true},
    hasDelivery: Boolean,
    paused: Boolean,
    open: Boolean,
    default: Boolean,
    days: Array,
    internalId: String,
    fiscalNCM: {type: String},
    fiscalOrigin: {type: Number},
    fiscalCSOSN: {type: Number},
    fiscalCEST: String, 
    fiscalAliquot: {type: Number},
    status: {type: Number}
}, {timestamps: true, collection: 'MenuItems'});

MenuItems.plugin(mongoosePaginate);
MenuItems.plugin(mongooseAggregatePaginate);

module.exports = MenuItems