const  mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var CMV = new Schema({
    amount: Number,
    date: Date,
    status: Number,
}, {collection: 'CMV', timestamps: true});

module.exports = CMV;