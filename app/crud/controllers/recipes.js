var mongoose = require('mongoose');

exports.create = function(req, res, next){
    var params = req.body;
    items = [];

    var obj = {
        menuItemId: mongoose.Types.ObjectId(params.menuItemId),
        recipe: params.recipe
    }

    /* 

        menuItemId: String,
        recipe: String,
        items: Object,
         {'productId': 783940242, recipeId: 3894920312, measure: 2 }

        extras: Object

        {'productId': 783940242, recipeId: 3894920312, measure: 2 }
    
        */

    if(Object.keys(params.items).length > 0) {
        var Recipe = new req.modelFactory.getModels('Recipes').Recipes(obj);
        Recipe.save((err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            for (let index = 0; index < params.items.length; index++) {
                let element = params.items[index];
                let productId = mongoose.Types.ObjectId(element.productId);
                let recipeId = mongoose.Types.ObjectId(result._id);
                items.push({'productId': productId, 'recipeId': recipeId, 'measure': element.measure, 'optional': element.optional, 'extra': false});
            }
            for (let index = 0; index < params.extra.length; index++) {
                let element = params.extra[index];
                let productId = mongoose.Types.ObjectId(element.productId);
                let recipeId = mongoose.Types.ObjectId(result._id);
                items.push({'productId': productId, 'measure': element.measure, 'recipeId': recipeId, 'price': element.price, 'optional': true, 'extra': true});
            }
            var RecipeItems = req.modelFactory.get('RecipeItems');
            RecipeItems.insertMany(items, (err, result) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.json({'status': 1});
                req.onSend();
            });
        });
    } else {
        return next(Error('Missing parameters on items'));
    }
}

exports.show = function(req, res, next) {
        var id = mongoose.Types.ObjectId(req.params.id);
    if(id != "undefined" || id != "null"){ 
        var queries = req.query;
        var page = queries.page;
        limit = parseInt(queries.limit, 10);
        var aggregate = req.modelFactory.getModels('Recipes').Recipes.aggregate([
            {"$match": {"menuItemId": id}},
            {"$lookup": {"from": "RecipeItems", "localField": "_id", "foreignField": "recipeId", "as": "items"}},
            {"$unwind": "$items"},
            {"$lookup": {"from": "Products", "localField": "items.productId", "foreignField": "_id", "as": "products"}},
            {"$unwind": "$products"},
            {"$project": {
                "_id": 1,
                "menuItemId": 1,
                "recipe": 1,
                "items": {
                    "productId": "$products._id",
                    "name": "$products.name",
                    "measure": "$items.measure",
                    "unit": "$products.unit",
                    "optional": "$items.optional",
                    "extra": "$items.extra",
                    "price": "$products.price"
                }
            }},
            {"$group": {
                "_id": "$_id",
                "menuItemId": {"$first": "$menuItemId"},
                "recipe": {"$first": "$recipe"},
                "items": {$push: "$items"}
            }},
            {"$project": {
                "_id": 1,
                "menuItemId": 1,
                "recipe": 1,
                "items": {
                    "$filter": {
                        "input": "$items",
                        "as": "item",
                        "cond": {$ne: ["$$item.extra", true]}
                    }
                },
                "extras": {
                    "$filter": {
                        "input": "$items",
                        "as": "item",
                        "cond": {$eq: ["$$item.extra", true]}
                    }
                }
            }
            }
        ]);
        req.modelFactory.getModels('Recipes').Recipes.aggregatePaginate(aggregate, {page: page, limit: limit}, function(err, result, pageCount, count){
            if(err) {
                console.error(err);
                return next(err);
            }
            res.json({"docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount});
            req.onSend();
        })
    } else {
        next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
    }
}

exports.list = function(req, res, next){
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    req.modelFactory.getModels('Recipes').Recipes.paginate({status: 0}, { page: page, limit: limit}, function(err, result){
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        req.onSend();
    });
}

exports.delete = function(req, res, next) {
    var id = req.params.id;
    if(id != "undefined" || id != "null") {
        req.modelFactory.get('Recipes').update({_id: id}, {$set: {status: 1}}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.json({'status': 1});
            req.onSend();
        });
    } else {
        next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
    }
}

exports.update = function(req, res, next){
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        var params = req.body;
        id =  mongoose.Types.ObjectId(id);
        var menuItemId = mongoose.Types.ObjectId(params.menuItemId);
        console.log('ID', id);
        req.modelFactory.getModels('Recipes').Recipes.findById(id, function(err, p) {
            console.log('Resultado del ID', p);
            if (!p)
              return next(err);
            else {
                p.menuItemId = menuItemId
                p.recipe = params.recipe;
                var items = [];
                p.save(function(err) {
                    if(err) {
                        console.error(err);
                        return next(err);
                    }
                    else
                        if(params.items) {
                            var RecipeItems = req.modelFactory.get('RecipeItems');
                            RecipeItems.deleteMany({recipeId: id}, function(err, result){
                                if(err) return next(err);
                                for (let index = 0; index < params.items.length; index++) {
                                    let element = params.items[index];
                                    let productId = mongoose.Types.ObjectId(element.productId);
                                    items.push({'productId': productId, 'measure': element.measure, 'recipeId': id, 'optional': element.optional, 'extra': element.extra});
                                }
                                for (let index = 0; index < params.extras.length; index++) {
                                    let element = params.extras[index];
                                    let productId = mongoose.Types.ObjectId(element.productId);
                                    items.push({'productId': productId, 'measure': element.measure, 'recipeId': id, 'optional': true, 'extra': element.extra});
                                }
                            //console.log('Items', recipeItems);
                                RecipeItems.insertMany(items, (err, result) => {
                                    if(err) return next(err);
                                    res.send({'status': 1});
                                    req.onSend();
                                });
                            });
                        }
                    });
                }
            });
        } else {
            next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
    }
}