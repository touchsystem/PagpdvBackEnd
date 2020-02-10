exports.create = (req, res, next) => {
    var params = req.body;
    var obj = {
        denomination: params.denomination
    }
    var StockGroups = req.modelFactory.get('StockGroups')(obj);
    StockGroups.save((err, result) => {
        if(err) return next(err);
        res.send({'status': 1, 'id': result._id});
        req.onSend();
    })
}

exports.list = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    var StockGroups = req.modelFactory.get('StockGroups');
    StockGroups.paginate({status: 0}, {page: page, limit: limit}, (err, result) => {
        res.send(result);
        req.onSend();
    });
}

exports.delete = (req, res, next) => {
    var id = req.params.id;
    var StockGroups = req.modelFactory.get('StockGroups');
    StockGroups.update({_id: id}, {$set: {'status': 1}}, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send({'status': 1});
        req.onSend();
    });
}

exports.update = (req, res, next) => {
    var id = req.params.id;
    var params = req.body;
    var StockGroups = req.modelFactory.get('StockGroups');
    StockGroups.findById(id, function(err, p){
        if(!p) {
            return next(err);
        } else {
            p.denomination = params.denomination,
            p.save(function(err){
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.send({'status': 1});
                req.onSend();
            });
        }
    });
}