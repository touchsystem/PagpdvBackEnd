var mongoose = require('mongoose'),
moment = require('moment'),
iFoodAPI = require(process.cwd()+'/integrations/ifood/controllers/index');

exports.create = function(req, res, next) {
    var params = req.body;
    var MenuItems = req.modelFactory.get('MenuItems');
    var obj = {
        groupId: params.groupId,
        related: params.related,
        name: params.name,
        description: params.description,
        price: params.price,
        imageUrl: params.imageUrl,
        internalId: params.internalId,
        items: params.items,
        min: params.min,
        hasDelivery: 1,
        max: params.max,
        default: params.default,
        paused: params.paused,
        open: params.open,
        favorite: params.favorite,
        days: params.days
    }
    var newMenuItem = MenuItems(obj);
    newMenuItem.save(function(err, result){
        if(err) return next(err);
        res.send({'status': 1, 'id': result._id});
        req.onSend();
    });
}

exports.update = function(req, res, next){
    var id = mongoose.Types.ObjectId(req.params.id);
    var params = req.body;
    if(typeof id != 'undefined') {
        var MenuItems = req.modelFactory.get('MenuItems');
        if(typeof res.locals.ifood != 'undefined') {
            if(typeof params.paused != 'undefined') {
                if(params.paused == true) {
                    iFoodAPI.menuAvailibility(id, "AVAILABLE");
                } else {
                    iFoodAPI.menuAvailibility(id, "UNAVAILABLE");
                }
            }
        }
        MenuItems.findById(id, function(err, result){
            result.groupId = params.groupId,
            result.related = params.related,
            result.name = params.name,
            result.description = params.description,
            result.price = params.price,
            result.imageUrl = params.imageUrl,
            result.items = params.items,
            result.internalId = params.internalId,
            result.min = params.min,
            result.max = params.max,
            result.default = params.default,
            result.paused = params.paused,
            result.open = params.open,
            result.hasDelivery = params.hasDelivery,
            result.days = params.days,
            result.favorite = params.favorite;
            result.save(function(err) {
                if(err) {
                    console.error(err);
                    return next(err);
                }
                else
                    res.json({'status': 1});
                    req.onSend();
            });
        });
    } else {
        next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
    }

}

exports.show = function(req, res, next) {
    // Get the query param from the URI
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    // Cast to ObjectId 
    var id = mongoose.Types.ObjectId(req.params.id);
    // Get the model from modelFactory passing the name as argument
    var MenuItems = req.modelFactory.get('MenuItems');
    MenuItems.find({_id: id}, (err, result) => {
        if(err) return next(err);
        console.log(result);
        var result = result;
        // Making a promise, it will wait until the response arrives
        let MenuItems = new Promise((resolve, reject) => {
            var response = result;
            if(response) {
                // Resolve the promise with the response
                resolve(response);
            }
        });          
        MenuItems.then(response => {
            res.send(response);
            req.onSend();
        });
    });
}

/*
exports.delete = function(req, res, next) {
    var id = req.params.id;
    if(typeof id != 'undefined') {
        var id = mongoose.Types.ObjectId(id);
        var MenuItems
    }
}*/


exports.delete = function(req, res, next){
    // Check if request is undefined
    if(typeof req != 'undefined') {
        // Get the ID and the JSON body
        var id = req.params.id;
        if(id != "undefined" || id != "null") {
            var imageUrl = req.body.imageUrl;
            if(typeof imageUrl != 'undefined') {
                imageUrl = imageUrl.split('https://seurestaurante.s3.us-east-2.amazonaws.com/');
                if(S3Manager.delete(imageUrl[1])) {
                    console.log('Imagen eliminada');
                }
            }
            // Call the delete function S3 to delete from AWS the file
            var MenuItems = req.modelFactory.get('MenuItems');
            // Get the recipe model and then remove it, also get the MenuItem model and then remove it
            MenuItems.update({_id: id}, {$set: {status: 1}}, (err, result) => {
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

exports.list = function(req, res, next) {
    var queries = req.query; 
    var page = queries.page;
    var today = moment().format('dddd').toString().toLowerCase(); //moment('dddd').toString().toLowerCase();
    console.log(today);
    limit = parseInt(queries.limit, 10); 
    var MenuItems = req.modelFactory.get('MenuItems');
    MenuItems.paginate({hasDelivery: 1}, {page: page, limit: limit}, (err, result) => {
        if(err) return next(err);
        res.send(result);
        req.onSend();
    });
}

