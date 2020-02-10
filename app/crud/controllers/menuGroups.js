var mongoose = require('mongoose');

exports.create = function(req, res, next){
    // Check if request is undefined
    if(typeof req != 'undefined') {
        // Get and set the parameters from the JSON body
        var params = req.body;
        if(typeof params.internalId != 'undefined') {
            req.modelFactory.get('MenuGroups').find({internalId: params.internalId}, function(err, result){
                if(Object.keys(result).length > 0) {
                    res.send({"msg": "This menu groups is duplicate"});
                    req.onSend();
                }
            });
        }
        var obj = {
            name: params.name,
            internalId: params.internalId,
            maximumNumber: params.maximumNumber,
            createdAt: params.createdAt
        }
        // Get the respective model and pass the parameters from the JSON
        var menuGroups = new req.modelFactory.getModels('MenuGroups').MenuGroups(obj);
        // Saves it
        menuGroups.save(function(err, result){
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
    // Check if the req is undefined
    if(typeof req != 'undefined'){
        // Get the ID from the URI
        var id = req.params.id;
        if(id != "undefined" || id != "null"){
            // Get the model from the modelFactory, passing the ID and find by them. 
            req.modelFactory.getModels('MenuGroups').MenuGroups.find({_id: id}, function(err, result){
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.send(result);
                // Close the connection
                req.onSend();
            });
        } else {
            next(new Error('ID must be provided'));
        }
    }
}

exports.list = function(req, res, next){
    // Get the parameters from the URI
    var queries = req.query;
    var page = queries.page;
    // Parse to Integer
    limit = parseInt(queries.limit, 10);
    // Get the respective model and pass parameters to the paginate method
    req.modelFactory.getModels('MenuGroups').MenuGroups.paginate({status: 0}, {page: page, limit: limit}, function(err, result){
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        // Close the connection
        req.onSend();
    });
}
exports.search = (req, res, next) => {
    var queries = req.query;
    var search = queries.search;
    limit = Number(queries.limit);
    var MenuGroups = req.modelFactory.get('MenuGroups');
    if(typeof limit != 'undefined') {
        MenuGroups.aggregate([
            {"$match": {"name": {"$regex": ".*" + search + ".*", "$options": 'i'}}},
            {"$limit": limit}
        ], (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }  
            res.send(result);
            req.onSend();
        });
    } else {
        next(new Error('Missed limit parameter'));
    }
}

exports.show = function(req, res, next){
    // Check if the request is undefined
    if(typeof req != 'undefined') {      
        // Get the ID and queries, page parameters from the URI
        var id = req.params.id;
        var queries = req.query;
        var page = queries.page;
        var match = { "$match": {} };
        if('favorites' == id) {
            match["$match"] = {"items.favorite": 1};
        } else {
            match["$match"] = {"items.menuGroupId": mongoose.Types.ObjectId(id)};
        }
        limit = parseInt(queries.limit, 10);
        // Get the model and then aggregates to join and project the documents
        var aggregate = req.modelFactory.getModels('MenuGroups').MenuGroups.aggregate([
            {"$lookup": {"from": "MenuItems", "localField": "_id", "foreignField": "menuGroupId", "as": "items"}},
            {"$unwind": "$items"},
            {"$match": {"items.status": 0}},
            match,
            {"$lookup": {"from": "ProductionPoints", localField: "items.productionPointId", foreignField: "_id", as: "production_points"}},
            {"$unwind": "$production_points"},
            {"$project": {
                "_id": "$items._id",
                "name": "$items.name",
                "price": "$items.price",
                "favorite": "$items.favorite",
                "imageUrl": "$items.imageUrl",
                "minimumStock": "$products_docs.minimumStock",
                "productionPointId": "$production_points._id",
                "productionPoint": "$production_points.name",
                "createdAt": "$production_points.createdAt",
                "updatedAt": "$production_points.updatedAt"
            }}
        ]);
        // Get the respective model and then pass the aggregate result to the aggregatePaginate function to paginate the results properly
        req.modelFactory.getModels('MenuGroups').MenuGroups.aggregatePaginate(aggregate, {page: page, limit: limit}, function(err, result, pageCount, count){
            if(err) {
                console.error(err);
                return next(err);
            }
            // Response with this JSON standard format
            res.json({"docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount, "match": match["$match"]});
            // Close the connection
            req.onSend();
        });
    }
}

exports.delete = function(req, res, next){
    // Check if the request is undefined
    if(typeof req != 'undefined'){
        // Get the ID from the URI
        var id = req.params.id;
        if(id != "undefined" || id != "null") {
            // Get the respective model and then find by ID
            var models = req.modelFactory.getModels('MenuGroups', 'MenuItems', 'Recipes');
            
            models.MenuItems.update({menuGroupId: id}, {$set: {'status': 1}}, (err, result) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
                let id = result._id;
                models.Recipes.update({_id: id}, {$set: {status: 1}}, (err, result) => {
                    if(err) {
                        console.error(err);
                        return next(err);
                    }
                });
            });
            models.MenuGroups.update({_id: id}, {$set: {status: 1}}, (err, result) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.json({'status': 1});
                req.onSend();
            });
            // Close the connection
        } else {
            next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
        }  
    }
}

exports.update = function(req, res, next){
    // Check if the request is undefined
    if(typeof req != 'undefined') {
        // Get the parameters from the URI and the JSON body
        var id = req.params.id;
        var queries = req.query;
        if(id != "undefined" || id != "null") {
            var params = req.body;
            var filter = "";
            if(typeof queries.internal != 'undefined' && queries.internal == 'true') {
                filter = {internalId: id};
            } else {
                filter = {_id: mongoose.Types.ObjectId(id)};
            }
            // Get the respective model, and find the document by ID
            req.modelFactory.get('MenuGroups').findOne(filter, function(err, p){
                // If the document doesn't exist return an error
                if(!p)
                    return next(err);
                else {
                    // Get the parameters from the JSON body
                    p.name = params.name,
                    p.maximumNumber = params.maximumNumber;
                    // Saves it
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