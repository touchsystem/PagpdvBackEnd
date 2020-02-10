var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
Schema = mongoose.Schema;

var  ProductionPoints = new Schema({
    name: {type: String, required: [true, 'Campo nombre requerido.']},
    address: String,
    internalId: String,
    status: {type: Number, default: 0}
}, {timestamps: true, collection: 'ProductionPoints'});

ProductionPoints.plugin(mongoosePaginate);

module.exports = ProductionPoints;