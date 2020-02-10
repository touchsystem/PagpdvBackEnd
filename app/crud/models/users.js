var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
Schema = mongoose.Schema;

var Users = new Schema({
    name: String,
    username: String,
    pin: {type: Number, unique: true},
    roles: Object,
    internalId: String,
    status: {type: Number, default: 0},
}, {collection: 'Users', timestamps: true});

Users.plugin(mongoosePaginate);

module.exports = Users;