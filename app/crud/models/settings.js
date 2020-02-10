var mongoose = require('mongoose'),
Schema = mongoose.Schema;

var Settings = new Schema({
    name: String,
    date: Date,
    language: String,
    currency: String,
    theme: String,
    address: String,
    icon: String,
    schedule: Object,
    tenantId: String,
    methods: Object,
    lat: String,
    lng: String
});

module.exports = Settings;