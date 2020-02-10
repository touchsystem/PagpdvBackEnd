var mongoose = require('mongoose');
var S3Manager = require('../../../helpers/S3-manager');

exports.create = (req, res, next) => {
    // Check if the request is undefined
    if(typeof req != 'undefined') {
        // Get the body JSON parameters
        var params = req.body;
        var obj = {
            name: params.name,
            price: params.price,
            favorite: params.favorite,
            unit: params.unit,
            menuGroupId: params.menuGroupId,
            imageUrl: params.imageUrl,
            productionPointId: params.productionPointId,
            createdAt: params.createdAt,
            isForDelivery: true
        }
        // Get the model and then pass parameters 
        var MenuItem = new req.modelFactory.getModels('MenuItems').MenuItems(obj);
        // Save it on a new document
        MenuItem.save(function(err, result){
            if(err) {
                console.error(err);
                return next(err);
            }
            res.json({'status': 1, 'id': result._id});
            // Close the connection
            req.onSend();
        })
    }
}

exports.detail = function(req, res, next){
    // Check if the request is undefined 
    if(typeof req != 'undefined'){
        // Get the ID from the URL
        var id = mongoose.Types.ObjectId(req.params.id);
        if(id != "undefined" || id != "null") {
            // Find by ID
            req.modelFactory.get('MenuItems').find({_id: id}, function(err, result){
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.send(result);
                // Close the connection
                req.onSend();
            })
        } else { 
            next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
        }
    }
}

exports.list = function(req, res, next){
    // Get the parameters from the URI
    var queries = req.query;
    var page = queries.page;
    // Parse to Integer
    limit = parseInt(queries.limit, 10);
    // Get the MenuItems model and then pass the parameters to paginate the results 
    var aggregate = req.modelFactory.getModels('MenuItems').MenuItems.aggregate([
        {"$match": {"status": 0}},
        {"$match": {"isForDelivery": 1}},
        {"$lookup": {"from": "MenuGroups", "localField": "menuGroupId", "foreignField": "_id", "as": "groups"}},
        {"$lookup": {"from": "Recipes", "localField": "_id", "foreignField": "menuItemId", "as": "recipes"}},
        {"$unwind": "$groups"},
        {"$project": {
            "_id": 1,
            "name": 1,
            "price": 1,
            "favorite": 1,
            "unit": 1,
            "menuGroupId": 1,
            "menuGroup": "$groups.name",
            "recipeId": {"$arrayElemAt": ["$recipes._id", 0]},
            "imageUrl": 1,
            "productionPointId": 1,
            "createdAt": 1,
            "updatedAt": 1,
        }}
    ]);

    req.modelFactory.getModels('MenuItems').MenuItems.aggregatePaginate(aggregate, {page: page, limit: limit}, function(err, result, pageCount, count){
        if(err) {
            console.error(err);
            return next(err);
        }
        // Response with this JSON standard format
        res.json({"docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount});
        // Close the connection
        req.onSend();
    });
}


exports.search = (req, res, next) => {
    var query = req.query.search;
    limit = parseInt(req.query.limit, 10);
    var MenuItems = req.modelFactory.get('MenuItems').find({"name": {"$regex": ".*" + query + ".*", "$options": 'i'}}, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }  
        res.send(result);
        req.onSend();
    }).limit(limit);
}

exports.delete = function(req, res, next){
    // Check if request is undefined
    if(typeof req != 'undefined') {
        // Get the ID and the JSON body
        var id = req.params.id;
        if(id != "undefined" || id != "null") {
            var imageUrl = req.body.imageUrl;
            imageUrl = imageUrl.split('https://seurestaurante.s3.us-east-2.amazonaws.com/');
            // Call the delete function S3 to delete from AWS the file
            if(S3Manager.delete(imageUrl[1])) {
                console.log('Imagen eliminada');
            }
            var models = req.modelFactory.getModels('Recipes', 'MenuItems');
            // Get the recipe model and then remove it, also get the MenuItem model and then remove it
            models.Recipes.update({_id: id}, {$set: {status: 1}}, (err, result) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
            });
            models.MenuItems.update({_id: id}, {$set: {status: 1}}, (err, result) => {
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
}

exports.clone = (req, res, next) => {
    if(typeof req.params.id != 'undefined') {
        var id = mongoose.Types.ObjectId(req.params.id);
        var MenuItems = req.modelFactory.get('MenuItems');
        MenuItems.findById(id, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            let document = result;
            var imageUrl = document.imageUrl;
            console.log('image url', imageUrl);
            var S3Promise = new Promise(function(resolve, reject) {
                var imageResponse = S3Manager.uploadFromUrl(imageUrl);
                console.log('image response', imageResponse);
                if(imageResponse) {
                    resolve(imageResponse);
                } else {
                    reject();
                }
            });

            S3Promise.then(function(data){
                if(imageResponse != 'error') {
                    var newImageUrl = imageResponse;
                }
                let obj = {
                    name: document.name,
                    price: document.price,
                    favorite: document.favorite,
                    unit: document.unit,
                    imageUrl: newImageUrl,
                    menuGroupId: document.menuGroupId,
                    productionPointId: document.productionPointId,
                    isForDelivery: true 
                }
    
                var NewMenuItem = MenuItems(obj);
                NewMenuItem.save((err, result) => {
                    if(err){
                        console.error(err);
                        return next(err);
                    }
                    newMenuItemId = result._id;
                    var Recipes = req.modelFactory.get('Recipes').find({'menuItemId': id}, (err, result) => {
                        var recipeId = result._id;
                        let obj = {
                            menuItemId: newMenuItemId,
                            recipe: result.recipe
                        }
                        var NewRecipe = req.modelFactory.get('Recipes')(obj);
                        NewRecipe.save((err, result) => {
                            if(err){
                                console.error(err);
                                return next(err);
                            }
                            var newRecipeId = result._id;
                            var RecipeItems = req.modelFactory.get('RecipeItems').find({'recipeId': recipeId}, (err, result) => {
                                let document = result;
                                newRecipeItems = [];
                                for(i = 0; i < document.length; i++) {
                                    newRecipeItems.push({'productId': document[i].productId , 'recipeId': newRecipeId, 'measure': document[i].productId, 'optional': document[i].optional, 'price': document[i].price, 'extra': document[i].extra});
                                }
                                var NewRecipeItems = req.modelFactory.get('RecipeItems');
                                NewRecipeItems.insertMany(newRecipeItems, (err, result) => {
                                    if(err){
                                        console.error(err);
                                        return next(err);
                                    }
                                    res.send({'status': 1, 'id': newMenuItemId });
                                    req.onSend();
                                });
                            })
                        })
                    });
                })
            });
        })
    }
}


exports.update = function(req, res, next){
    // Check if request is undefined
    if(typeof req != 'undefined') {
        // Get the parameters from the URI
        var id = req.params.id;
        var params = req.body;
        var queries = req.query;
        var filter = "";
        if(id != "undefined" || id != "null"){
            // Get the MenuItems model and then find the document by ID
            if(typeof queries.internal != 'undefined' && queries.internal == 'true') {
                filter = {internalId: id};
            } else {
                filter = {_id: mongoose.Types.ObjectId(id)};
            }
            req.modelFactory.get('MenuItems').findOne(filter, function(err, p) {
                if(!p)
                    return next(err);
                else {
                    // Set the parameters got from JSON body
                    p.name = params.name,
                    p.price = params.price,
                    p.favorite = params.favorite, 
                    p.unit = params.unit,
                    p.imageUrl = params.imageUrl,
                    p.menuGroupId = params.menuGroupId,
                    p.productionPointId = params.productionPointId;
                    // Update it with save method
                    p.save(function(err) {
                        if(err) {
                            console.error(err);
                            return next(err);
                        }
                        else
                            res.json({'status': 1});
                            // Close the connection
                            req.onSend();
                    });
                }
            });
        } else {
            next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
        }
        
    }
}