var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
Schema = mongoose.Schema;

var Tables = new Schema({
    name: String,
    number: Number,
    mapData: Object,
    internalId: String,
    condition: {type: String, default: 'Free'},
    status: {type: Number, default: 0}
}, {timestamps: true, collection: 'Tables'});

Tables.plugin(mongoosePaginate);

module.exports = Tables