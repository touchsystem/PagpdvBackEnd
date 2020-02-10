exports.list = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    var Pendants = req.modelFactory.get('Pendants');
    Pendants.paginate({}, {page: page, limit: limit}, (err, result) => {
        if(err) return next(err);
        res.send(result);
        req.onSend();
    });
}