var mongoose = require('mongoose');

exports.create = function(req, res, next){
    // Check if request is undefined
    if(typeof req != 'undefined'){
        // Set paramaters from JSON body
        var params = req.body;
        if(typeof params.internalId != 'undefined') {
            req.modelFactory.get('Products').find({internalId: params.internalId}, function(err, result){
                if(Object.keys(result).length > 0) {
                    res.send({"msg": "This product is duplicated"});
                    req.onSend();
                }
            })
        }
        var obj = {
            name: params.name,
            internalId: params.internalId,
            price: params.price,
            cost: params.cost,
            minimumStock: params.minimumStock,
            unit: params.unit,
            goalStock: params.goalStock,
            favorite: params.favorite,
            groupId: params.groupId,
        }
        // Get the Products model and set the object as parameters to create a new document
        var Product = new req.modelFactory.getModels('Products').Products(obj);
        // Save the document with this method
        Product.save(function (err, result) {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.json({'status': 1, 'id': result._id});
            // Close the connection
            req.onSend();
        });
    }
}


exports.search = (req, res, next) => {
    var queries = req.query;
    var search = queries.search;
    limit = parseInt(queries.limit, 10);
    var Documents = req.modelFactory.get('Products');
    Documents.find({"status": 0, "name": {"$regex": ".*" + search + ".*", "$options": 'i'}}, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.json(result);
        req.onSend();
    }).limit(limit);
}

exports.test = function(req, res, next) {
    var products = req.modelFactory.get('Products');
    var params = req.body;
    var id = req.params.id;
    var queries = req.query;

    if(typeof queries.internal != 'undefined' && queries.internal == 'ok') {
        filter = {internalId: id};
        console.log('internal Id');
    } else {
        filter = {_id: mongoose.Types.ObjectID(id)};
        console.log('id');
    }

    products.findOne(filter, function(err, p){
        p.name = 'Hamburguer Carne',
        p.price = params.price,
        p.groupId = params.groupId,
        p.unit = params.unit;
        p.save(function(err, result) {
            if(err) return next(err);
            res.send(result);
            req.onSend();
        })
    });
}

exports.list = function(req, res, next){
    // Get the parameters form the URI
    var queries = req.query;
    var page = queries.page;
    // Parse to Integer the limit parameter
    limit = parseInt(queries.limit, 10);
    // Geet the Products model and then pass the parameters got to paginate method
    req.modelFactory.getModels('Products').Products.paginate({status: 0}, { page: page, limit: limit}, function(err, result) {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        // Close the connection
        req.onSend();
    });
}

exports.details = function(req, res, next){
    if(typeof req != 'undefined') {
        var id = req.params.id;
        if(id != "undefined" || id != "null"){
            req.modelFactory.getModels('Products').Products.find({_id: id}, function(err, result){
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.send(result);
                req.onSend();
            });
        } else {
            next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
        }
    }

}

exports.deleteInternal = function(req, res, next){
    // Get the ID parameters
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        // Get the respective model and then find the document by ID and removes it
        req.modelFactory.get('Products').update({internalId: id }, { $set: { status: 1 }}, (err, result) => {
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

exports.delete = function(req, res, next){
    var id = req.params.id;
    if(id != "undefined" || id != null){
        req.modelFactory.get('Products').update({_id: id}, {$set: {status: 1}}, (err, result) => {
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
    if(typeof req != 'undefined') {
        var id = req.params.id;
        if(id != "undefined" || id != "null") {
            var params = req.body;
            var queries = req.query;
            var filter = "";
            if(typeof queries.internal != 'undefined' && queries.internal == 'true') {
                filter = {internalId: id};
            } else {
                filter = {_id: mongoose.Types.ObjectId(id)};
            }
            req.modelFactory.get('Products').findOne(filter, function(err, p){
                if(!p) 
                    return next(err);
                else {
                    p.name = params.name,
                    p.price = params.price,
                    p.minimumStock = params.minimumStock,
                    p.unit = params.unit,
                    p.internalId = params.internalId,
                    p.groupId = params.groupId,
                    p.goalStock = params.goalStock,
                    p.favorite = params.favorite,
                    p.currentStock = params.currentStock;
                    p.save(function(err) {
                        if(err) {
                            console.error(err);
                            return next(err);
                        }
                        else
                            res.json({'status': 1});
                            req.onSend();
                    });
                }
            });
        } else {
            next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
        }
    }
}