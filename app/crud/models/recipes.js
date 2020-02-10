var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
mongooseAggregatePaginate = require('mongoose-aggregate-paginate'),
Schema = mongoose.Schema;

var Recipes = new Schema({
    menuItemId: {type: Schema.Types.ObjectId, ref: 'MenuItems', required: true, index: { unique: true }},
    recipe: String,
    internalId: String,
    status: {type: Number, default: 0}
}, {timestamps: true, collection: 'Recipes'});

Recipes.plugin(mongoosePaginate);
Recipes.plugin(mongooseAggregatePaginate);

module.exports = Recipes;