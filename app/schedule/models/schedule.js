var mongoose = require('mongoose'),
Schema = mongoose.Schema,
aggregatePaginate = require('mongoose-aggregate-paginate');

var Schedule = new Schema({
    contactId: {type: Schema.Types.ObjectId, ref: 'Contacts'},
    documentId: String,
    contactInfo: Object,
    tables: Array,
    scheduleDate: Date,
    observations: String,
    date: Date,
    condition: Number,
    status: Boolean
}, {collection: 'Schedule', timestamps: true});

Schedule.plugin(aggregatePaginate);

module.exports = Schedule;