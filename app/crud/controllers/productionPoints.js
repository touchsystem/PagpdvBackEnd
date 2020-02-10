var mongoose = require('mongoose');
exports.create = function(req, res, next){
    // Check if request is undefined
    if(typeof req != 'undefined') {
        var params = req.body;
        if(typeof params.internalId != 'undefined') {
            req.modelFactory.get('ProductionPoints').find({internalId: params.internalId}, function(err, result){
                if(Object.keys(result).length > 0){
                    res.send({"msg": "This production point is duplicated"});
                    req.onSend();
                }
            });
        }
        var obj = {
            name: params.name,
            internalId: params.internalId,
            address: params.address,
            printerType: params.printerType
        }
        // Get the respective model and then pass the parameters
        var ProductionPoint = new req.modelFactory.getModels('ProductionPoints').ProductionPoints(obj);
        // Saved the method
        ProductionPoint.save(function(err, result){
            if(err) {
                console.error(err);
                return next(err);
            }
            res.json({'status': 1, 'id': result._id});
            // Close the connection on send
            req.onSend();
        });
    }
}

exports.list = function(req, res, next){
    // Get the parameters from the URI
    var queries = req.query;
    var page = queries.page;
    // Parse to Integer
    limit = parseInt(queries.limit, 10);
    // Get the ProductionPoints model and then pass the parameters to paginate the result
    req.modelFactory.getModels('ProductionPoints').ProductionPoints.paginate({status: 0}, { page: page, limit: limit}, function(err, result){
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
    limit = parseInt(queries.limit, 10);
    var MenuItems = req.modelFactory.get('ProductionPoints');
    MenuItems.find({"name": {"$regex": ".*" + search + ".*", "$options": 'i'}}, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.json(result);
        req.onSend();
    }).limit(limit);
}

exports.detail = function(req, res, next){
    // Check if the request is undefined
    if(typeof req != 'undefined') {
        // Get the ID from the URL
        var id = req.params.id;
        if(id != "undefined" || id != "null") {
            // Get the ProductionPoints model and then find the documents by ID
            req.modelFactory.getModels('ProductionPoints').ProductionPoints.find({_id: id}, function(err, result){
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.send(result);
                // Close the connection on send
                req.onSend();
            });
        } else {
            next(new Error('ID must be provided'));
        }
    }
}

exports.deleteInternal = function(req, res, next){
    // Get the ID parameters
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        // Get the respective model and then find the document by ID and removes it
        req.modelFactory.get('ProductionPoints').update({internalId: id }, { $set: { status: 1 }}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }  
            res.json({'status': 1});
            // Close the connectiond
            req.onSend();
        });
    } else {
        next(new Error('InternalId must be provided, was passing: ', id));
    }
}

exports.delete = function(req, res, next) {
    // Get the ID from the URL
    var id = req.params.id;
    if(id != "undefined" || id != "null") {
        // Get the MenuItems model and then find by the documents by ID
        var models = req.modelFactory.getModels('MenuItems', 'ProductionPoints', 'Recipes');
        /*models.MenuItems.update({productionPointId: id}, {$set: {status: 1}}, (err, result) => {
            if(err) return console.log(err);
            let id = result._id;
            models.Recipes.update({menuItemId: id}, {$set: {status: 1}}, (err, result) => {
            if(err) return console.log(err); 
            });
        });*/
        models.ProductionPoints.update({_id: id}, {$set: {status: 1}}, (err, result) => {
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
    // Check if request is undefined 
    if(typeof req != 'undefined') {
        // JSON parameters to variable
        var params = req.body;
        var id = req.params.id;
        var queries = req.query;
        if(id != "undefined" || id != "null") {
            if(typeof queries.internal != 'undefined' && queries.internal == 'true') {
                filter = {internalId: id};
            } else {
                filter = {_id: mongoose.Types.ObjectId(id)};
            }
            req.modelFactory.get('ProductionPoints').findOne(filter, function(err, p) {
                // If the document doesn't exist return an error
                if(!p)
                    return next(err);
                else {
                p.name = params.name,
                p.printerType = params.printerType,
                p.address = params.address;
                // Save it
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