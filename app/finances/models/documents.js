const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    paginate = require('mongoose-paginate'),
    paginateAggregate = require('mongoose-aggregate-paginate');

var Documents = new Schema({
    businessPartnerId: { type: Schema.Types.ObjectId, nullable: true },
    date: Date,
    emissionDate: Date,
    invoices: Object,
    accountNumber: String,
    products: Object,
    observations: String,
    currency: String,
    documentAmount: Number,
    documentType: Number,
    documentNumber: String,
    transactionId: Number,
    status: { type: Number, default: 0 }
}, { timestamps: true, collection: 'Documents' });

Documents.plugin(paginate);
Documents.plugin(paginateAggregate);

module.exports = Documents;