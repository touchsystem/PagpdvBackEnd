var mongoose = require('mongoose');
exports.create = (req, res, next) => {
    // Get parameters and data from JSON body
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
        username: params.username,
        pin: params.pin,
        roles: params.roles,
        internalId: params.internalId
    }
    var User = new req.modelFactory.getModels('Users').Users(obj);
    User.save((err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.json({'status': 1, 'id': result._id});
        req.onSend();
    })
}

exports.waiter = (req, res, next) => {
    var queries = req.query;
    var search = queries.search;
    limit = queries.limit;
    var User = req.modelFactory.get('Users');
    if(typeof limit != 'undefined') {
        User.find({'name': {$regex: ".*" + search + ".*", "$options": 'i'}, 'roles': {$in: ['Garçom']}}, (err, result) => {
            if(err) return next(err);
            res.send(result);
            req.onSend();
        }).limit(limit);
    } else {
        next(new Error('Missed limit parameter'));
    }
}

exports.list = (req, res, next) => {
    // Get the parameters from the URI
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    // Get the respective models
    var user = req.modelFactory.get('Users');
    // Paginate the results
    user.paginate({status: 0}, {page: page, limit: limit}, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        req.onSend();
    });
}

exports.allByRol = (req, res, next) => {
    var rol = req.params.rol;
    var User = req.modelFactory.get('Users');
    User.aggregate([
        {"$match": {"roles": {"$in": [rol]}}},
    ], (err, result) => {
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
    limit = Number(queries.limit);
    var User = req.modelFactory.get('Users');
    if(typeof limit != 'undefined') {
        User.aggregate([
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

exports.deleteInternal = function(req, res, next){
    // Get the ID parameters
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        // Get the respective model and then find the document by ID and removes it
        req.modelFactory.get('Users').update({internalId: id }, { $set: { status: 1 }}, (err, result) => {
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

exports.delete = (req, res, next) => {
    var id = req.params.id;
    if(id != "undefined" || id != "null") {
        var user = req.modelFactory.get('Users');
        user.update({_id: id}, {$set: {status: 1}}, (err, result) => {
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

exports.update = (req, res, next) => {
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        var params = req.body;
        var queries = req.query;
        var filter = "";
        if(typeof queries.internal != 'undefined' && queries.internal == 'true') {
            filter = {internalId: id};
        } else {
            filter = {_id: mongoose.Types.ObjectId(id)};
        }
        req.modelFactory.get('Users').findOne(filter, (err, p) => {
            p.name = params.name,
            p.username = params.username,
            p.pin = params.pin,
            p.roles = params.roles;
            p.save((err) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.json({'status': 1});
                req.onSend();
            });
        })
    } else {
        next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
    }

}