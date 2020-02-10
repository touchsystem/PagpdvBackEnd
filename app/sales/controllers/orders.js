var express = require('express');
var router = express.Router();

exports.list = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);

    var Orders = req.modelFactory.get('Orders');
    Orders.paginate({}, {page: page, limit: limit}, (err, result) => {
        if(err) return next(err);
        res.send(result);
        req.onSend();
    });
}

exports.last = (req, res, next) => {
    var params = req.body;
    var date = params.date;
    var Orders = req.modelFactory.get('Orders');
    Orders.aggregate([
        {"$match": {"createdAt": {$gt: new Date(date)}}},
        {"$match": {"transaction": { $size: 1 }}},
        {"$match": {"status": false}},
    ], (err, result) => {
        if(err) return next(err);
        res.send(result);
        req.onSend();
    });
}

exports.update = (req, res, next) => {
    var params = req.body;
    (typeof params.id != 'undefined') ? id = mongoose.Types.ObjectId(params.id) : next(new Error('Empty ID')); 
    var status = params.status;
    // pendant, confirmed, processed, shipped, delivered
    Orders.update({'_id': id}, {$push: {'transaction': status}}, (err) => {
        if(err) return next(err);
        if(status == 'delivered') {
            Orders.update({'_id': id}, {$set: {'status': 1}}, (err, result) => {
                if(err) return next(err);
                res.send({'status': 1});
                req.onSend();
            });
        }
    });
}

exports.cancel = (req, res, next) => { 
    var params = req.body; 
    (typeof params.id != 'undefined') ? id = mongoose.Types.ObjectId(params.id) : next(new Error('Empty ID'));
    Orders.update({'_id': id}, {$set: {'status': 0}}, (err) => {
        if(err) return next(err);
        res.send({'status': 1});
        req.onSend();
    });
}