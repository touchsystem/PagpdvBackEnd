var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
Schema = mongoose.Schema;


/* 
    "name": "Dario Olmedo",
    "documentId": "800522111-1",
    "documentType": "",
    "roles": ["Legal Person", "Provider", "Customer", "Employee"],
    "contacts":,
    "address"
*/


// 1: CPF, 2: CNPJ

var Contacts = new Schema({
    name: String,
    tradeName: String,
    documentId: String,
    documentType: String,
    internalId: String,
    type: Number,
    roles: Object,
    stateRegistration: String,
    informations: {type: Array, default: []},
    addresses: {type: Array, default: []},
    isForeigner: Boolean,
    status: {type: Number, default: 0}
}, {timestamps: true, collection: 'Contacts'});

Contacts.plugin(mongoosePaginate);

module.exports = Contacts;