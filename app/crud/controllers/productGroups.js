var mongoose = require('mongoose');

exports.create = function(req, res, next){
    if(typeof req != 'undefined'){
        // Get the parameters from the JSON body
        var params = req.body;
        if(typeof params.internalId != 'undefined') {
            req.modelFactory.get('Productgroups').find({internalId: params.internalId}, function(err, result){
                if(Object.keys(result).length > 0){
                    res.send({"msg": "This product group is duplicate"});
                    req.onSend();
                }
            });
        }
        var obj = {
            name: params.name,
            internalId: params.internalId,
            accountNumber: params.accountNumber,
            createdAt: params.createdAt
        }
        // Get the ProductGroups model and then pass the parameters
        var ProductGroup = new req.modelFactory.getModels('ProductGroups').ProductGroups(obj);
        // Save the initialized method
        ProductGroup.save(function(err, result){
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
    limit = Number(queries.limit);
    var ProductGroups = req.modelFactory.get('ProductGroups');
    if(typeof limit != 'undefined') {
        ProductGroups.aggregate([
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

exports.accounts = (req, res, next) => {
    var queries = req.query;
    var search = queries.search;
    limit = parseInt(queries.limit, 10);
    var Account = req.modelFactory.get('Accounts');
    Account.find({"level": 5, "denomination": {"$regex": ".*" + search + ".*", "$options": 'i'}}, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.json(result);
        req.onSend();
    }).limit(limit);
}

exports.show = function(req, res, next){ 
    // Get the ID and then cast to ObjectID
    var id = mongoose.Types.ObjectId(req.params.id);
    var queries = req.query;
    var page = queries.page;
    // Parse to Integer
    limit = parseInt(queries.limit, 10);
    // Get the ProductGroups model and then aggregate to join documents and project the result
    var aggregate = req.modelFactory.getModels('ProductGroups').ProductGroups.aggregate([
        {"$lookup" : { "from" : "Products" , "localField" : "_id" , "foreignField" : "groupId" , "as" : "products_docs"}},
        {"$match": {"products_docs.groupId": id}},
        {"$unwind": "$products_docs"},
        {"$project": {
            "_id": "$products_docs._id",
            "name": "$products_docs.name",
            "price": "$products_docs.price",
            "minimumStock": "$products_docs.minimumStock",
            "goalStock": "$products_docs.goalStock",
            "createdAt": "$products_docs.createdAt",
            "updatedAt": "$products_docs.updatedAt"
        }},
    ]);
    // Get the ProductGroup and pass the results from the aggregate to paginate
    req.modelFactory.get('ProductGroups').aggregatePaginate(aggregate, {page: page, limit: limit}, function(err, result, pageCount, count){
        if(err) {
            console.error(err);
            return next(err);
        }
        res.json({"docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount});
        // Close the connection
        req.onSend();
    });
}

exports.list = function(req, res, next){
    // Get the parameters from the URI
    var queries = req.query;
    var page = queries.page;
    // Parse limit parameter to Integer 
    limit = parseInt(queries.limit, 10);
    // Get the ProductGroups model and then pass parameters to the paginate method 
    req.modelFactory.get('ProductGroups').paginate({status: 0}, {page: page, limit: limit}, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        // Close the connection on request
        req.onSend();
    });
}

exports.detail = function(req, res, next){
    // Get the ID from the URL
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        // Get the ProductGroups model and find the documents by ID
        req.modelFactory.getModels('ProductGroups').ProductGroups.find({_id: id}, function(err, result){
            if(err) {
                console.error(err);
                return next(err);
            }
            res.send(result);
            // close the connection
            req.onSend();
        }).limit(1);
    } else {
        next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
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
        req.modelFactory.get('Products').update({groupId: id}, {$set: {status: 1}}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
        });
        req.modelFactory.get('ProductGroups').update({_id: id}, {$set: {status: 1}}, (err, result) => {
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
    var params = req.body;
    var queries = req.query;
    if(id != "undefined" || id != "null") {
        if(typeof queries.internal != 'undefined' && queries.internal == 'true') {
            filter = {internalId: id};
        } else {
            filter = {_id: mongoose.Types.ObjectId(id)};
        }
        req.modelFactory.get('ProductGroups').findOne(filter, function(err, p) {
            // If the document doesn't exist return an error
            if(!p)
                return next(new Error('There is a problem with a document or doesnt exist'));
            else {
                // Set parameters got on the JSON body
                p.name = params.name;
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