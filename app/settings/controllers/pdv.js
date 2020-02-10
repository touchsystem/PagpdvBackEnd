var mongoose = require('mongoose');

exports.create = (req, res, next) => {
    var params = req.body;
    var obj = {
        name: params.name,
        password: params.password,
        invoiceSerie: params.invoiceSerie,
        invoiceNumber: params.invoiceNumber,
        observations: params.observations
    }
    
    var PDV = req.modelFactory.get('PDV')(obj);
    PDV.save((err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send({'status': 1, 'id': result._id});
        req.onSend();
    })
}

exports.delete = (req, res, next) => {
    var id = req.params.id;
    if(typeof id != 'undefined') {
        var PDV = req.modelFactory.get('PDV');
        id = mongoose.Types.ObjectId(id);
        PDV.update({'id': id}, {$set: {'status': 1}}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.send(result);
            req.onSend();
        });
    } else {
        return next(new Error('Missing ID parameter'));
    }
}

exports.show = (req, res, next) => {
    var id = req.params.id; 
    if(typeof id != 'undefined') {
        var Enterpises = req.modelFactory.get('PDV');
        id = mongoose.Types.ObjectId(id);
        Enterprises.find({'id': id, 'status': 0}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.send(result);
            req.onSend();
        });
    } else {
        return next(new Error('Missing ID parameter'));
    }
}

exports.list = (req, res, next) => {
    var page = req.query.page;
    limit = parseInt(req.query.limit, 10);
    var PDV = req.modelFactory.get('PDV');
    PDV.paginate({'status': 0}, {page: page, limit: limit}, (err, result) => {
        if(err) return next(err);
        res.send(result);
        req.onSend();
    });
}


exports.update = function(req, res, next){
    var id = mongoose.Types.ObjectId(req.params.id);
    var params = req.body;
    if(typeof id != 'undefined') {
        var MenuItems = req.modelFactory.get('PDV');
        MenuItems.findById(id, function(err, result){
            result.name = params.name,
            result.password = params.password,
            result.invoiceSerie = params.invoiceSerie,
            result.invoiceNumber = params.invoiceNumber,
            result.observations = params.observations;
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