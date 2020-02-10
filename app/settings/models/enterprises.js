var mongoose = require('mongoose'),
Schema = mongoose.Schema,
paginate = require('mongoose-paginate');

var Enterprises = new Schema({
    name: String,
    businessName: String,
    businessCode: String,
    isLegalPerson: Boolean,
    schedule: Object,
    icon: String,
    address: String,
    addressNumber: Number,
    addressComplement: String,
    codeUF: String,
    iFoodConfig: Object,
    UF: String,
    zipCode: String,
    email: String,
    neighborhood: String,
    city: String,
    codeCity: String,
    IE: String,
    phone: String,
    fiscalStatus: Number,
    tenantId: String,
    language: String,
    currency: String,
    deliveryType: Number,
    theme: String,
    methods: Object,
    date: Date,
    lat: String,
    lng: String,
    status: {type: Number, default: 0}
}, {collection: 'Enterprises', timestamps: true});

Enterprises.plugin(paginate);

module.exports = Enterprises;