var mongoose = require('mongoose');

exports.create = (req, res, next) => {
    var id = mongoose.Types.ObjectId(req.params.id);
    var items = [];
    var extras = req.body.extras;
    var RecipeItems = req.modelFactory.get('RecipeItems');
    if(typeof extras != 'undefined') {
        extras.map(function(e, i) {
            items.push({'productId': e.productId, 'measure': e.measure, 'price': e.price, 'recipeId': id, 'extra': true, 'optional': true});
        });
        RecipeItems.insertMany(items, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.send({'status': 1});
            req.onSend();
        });
    } else {
        res.send({'status': 0});
        req.onSend();
    }
}

exports.update = (req, res, next) => {
    var id = mongoose.Types.ObjectId(req.params.id);
    var items = [];
    var extras = req.body.extras;
    var RecipeItems = req.modelFactory.get('RecipeItems');
    if(typeof extras != 'undefined') {
        extras.map(function(e, i) {
            items.push({'productId': e.productId, 'measure': e.measure, 'price': e.price, 'recipeId': id, 'extra': true, 'optional': true});
        });
        RecipeItems.deleteMany({'recipeId': id, 'extra': true}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            RecipeItems.insertMany(items, (err, result) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.send({'status': 1});
                req.onSend();
            });
        });
    } else {
        res.send({'status': 0});
        req.onSend();
    }
}

exports.show = (req, res, next) => {
    var id = mongoose.Types.ObjectId(req.params.id);
    var RecipeItems = req.modelFactory.get('RecipeItems');
    RecipeItems.aggregate([
        {"$match": {"recipeId": id}},
        {"$match": {"extra": true}},
        {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products"}},
        {"$project": {
            "_id": "$_id",
            "name": {"$arrayElemAt": ["$products.name", 0]},
            "measure": "$measure",
            "productId": "$productId",
            "extra": 1,
            "optional": 1
        }}
    ], (err, result) => {
        res.send(result);
        req.onSend();
    });
}