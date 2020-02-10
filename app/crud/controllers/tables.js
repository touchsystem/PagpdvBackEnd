var mongoose = require('mongoose');

exports.create = function(req, res, next){
    var params = req.body;
    if(typeof params.internalId != 'undefined') {
        req.modelFactory.get('Tables').find({internalId: params.internalId}, function(err, result){
            if(Object.keys(result).length > 0){
                return res.send({"msg": "This table is duplicated"})
            }
        })
    }
    var obj = {
        name: params.name,
        internalId: params.internalId,
        number: params.number,
        condition: params.condition,
        mapData: params.mapData
    }
    var Tables = req.modelFactory.get('Tables');
    Tables.find({number: params.number}, (err, result) => {
        if(Object.keys(result).length == 1) {
            if(result[0].status == 1) {
                Tables.update({_id: result[0]._id}, {$set: {'status': 0}});
                res.json({'status': 1, '_id': result[0]._id});
            } else {
                res.json({'status': 0, 'msg': 'There is an active table already'});
            }
        } else {
            createTable = new Tables(obj);
            createTable.save(function(err, result){
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.json({'status': 1, 'id': result._id});
                req.onSend();
            })
        }
    });
}

exports.bulkCreate = function(req, res, next) {
    var start = req.body.start;
    var end = req.body.end;
    var tables = [];
    console.log(req.body);
    for(let i = start; i <= end; i++) {
        tables.push({name: i, number: i, condition: "Free"});
    }
    var Tables = req.modelFactory.get('Tables');
    Tables.insertMany(tables, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send({'status': 1});
        req.onSend();
    });
}

exports.list = function(req, res, next){
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    req.modelFactory.get('Tables').paginate({status: 0}, {page: page, limit: limit}, function(err, result){
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        req.onSend();
    });  
}

exports.search = (req, res, next) => {
    var queries = req.query;
    var search = queries.search;
    limit = parseInt(queries.limit, 10);
    var MenuItems = req.modelFactory.get('Tables');
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
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        var queries = req.query;
        var page = queries.page;
        limit = parseInt(queries.limit, 10);
        req.modelFactory.get('Tables').paginate({_id: id}, {page: page, limit: limit}, function(err, result){
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

exports.deleteInternal = function(req, res, next){
    // Get the ID parameters
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        // Get the respective model and then find the document by ID and removes it
        req.modelFactory.get('Tables').update({internalId: id }, { $set: { status: 1 }}, (err, result) => {
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
    console.log(id);
    if(id != "undefined" || id != "null") {
        req.modelFactory.get('Tables').update({_id: id}, {$set: {status: 1}}, (err, result) => {
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

exports.condition = (req, res, next) => {
    var id = req.query.id;
    var condition = req.query.condition;
    if(id.length < 24) {
        return next(new Error("This ID is not an ObjectId. Please try again"));
    }
    var Tables = req.modelFactory.get('Tables');
    Tables.update({_id: mongoose.Types.ObjectId(id)}, {$set: {'condition': condition}}, (err, result) => {
        if(err) return next(err);
        res.send({'status': 1});
        req.onSend();
    });
}

exports.update = function(req, res, next){
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
        req.modelFactory.get('Tables').findOne(filter, function(err, p){
            if(!p)
                return next(err)
            else {
                p.name = params.name,
                p.number = params.number,
                p.condition = params.condition,
                p.mapData = params.mapData;
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