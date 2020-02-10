var mongoose = require('mongoose'),
mongoosePaginate = require('mongoose-paginate'),
    Schema = mongoose.Schema;

var RecipeItems = new Schema({
    productId: {type: Schema.Types.ObjectId, ref: 'Products'},
    recipeId: {type: Schema.Types.ObjectId, ref: 'Recipes'},
    measure: Number,
    optional: Boolean,
    price: Number,
    extra: Boolean,
    status: {type: Number, default: 0}
}, {timestamps: true, collection: 'RecipeItems'});

RecipeItems.plugin(mongoosePaginate);

module.exports = RecipeItems;