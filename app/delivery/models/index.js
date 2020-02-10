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
    items: Object,
    min: Number,
    max: Number,
    hasDelivery: Boolean,
    paused: Boolean,
    open: Boolean,
    default: Boolean,
    days: Array,
    internalId: Number,
    fiscalNCM: Number,
    fiscalOrigin: Number,
    fiscalCSOSN: Number,
    fiscalCNAE: String, 
    fiscalAliquot: String,
    status: {type: Number, default: 0}
}, {timestamps: true, collection: 'MenuItems'});

MenuItems.plugin(mongoosePaginate);
MenuItems.plugin(mongooseAggregatePaginate);

module.exports = MenuItems