exports.create = (req, res, next) => {
    var params = req.body;
    var obj = {
        name: params.name,
        creditAccount: params.creditAccount, 
        debitAccount: params.debitAccount
    }
    var Shortcut = req.modelFactory.getModels('Shortcuts').Shortcuts(obj);
    Shortcut.save((err, result) => {
        if(err) return next(err);
         res.json({'status': 1, 'id': result._id});
         req.onSend();
    });
}

exports.search = (req, res, next) => {
    var queries = req.query;
    var query = queries.q;
    limit = parseInt(queries.limit, 10);
    var Shortcut = req.modelFactory.get('Shortcuts');
    Shortcut.aggregate([
        {"$match": {"status": 0}},
        {"$match": {"name": {"$regex": "" + query + "", "$options": 'i'}}},
        {"$lookup": {"from": "Accounts", "localField": "debitAccount", "foreignField": "accountNumber", "as": "debit_docs"}},
        {"$lookup": {"from": "Accounts", "localField": "creditAccount", "foreignField": "accountNumber", "as": "credit_docs"}},
        {"$project": {
            "_id": 1,
            "name": 1,
            "debitAccount": "$debitAccount",
            "debitDenomination": {$arrayElemAt: ["$debit_docs.denomination", 0]},
            "creditAccount": "$creditAccount",
            "creditDenomination": {$arrayElemAt: ["$credit_docs.denomination", 0]}
        }},
        {"$limit": limit}
    ], function(err, result){
        if(err) {
            console.error(err);
            return next(err);
        }
        res.json(result);
    });
}

exports.delete = (req, res, next) => {
    var id = req.params.id;
    req.modelFactory.get('Shortcuts').update({_id: id}, {$set: {'status': 1}}, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.json({'status': 1});
    });
}

exports.list = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    var Shortcut = req.modelFactory.get('Shortcuts');
    var aggregate = Shortcut.aggregate([
        {"$match": {"status": 0}},
        {"$lookup": {"from": "Accounts", "localField": "debitAccount", "foreignField": "accountNumber", "as": "debit_docs"}},
        {"$lookup": {"from": "Accounts", "localField": "creditAccount", "foreignField": "accountNumber", "as": "credit_docs"}},
        {"$project": {
            "_id": 1,
            "name": 1,
            "debitAccount": "$debitAccount",
            "debitDenomination": {$arrayElemAt: ["$debit_docs.denomination", 0]},
            "creditAccount": "$creditAccount",
            "creditDenomination": {$arrayElemAt: ["$credit_docs.denomination", 0]}
        }}
    ]);
    Shortcut.aggregatePaginate(aggregate, {page: page, limit: limit}, function(err, result, pageCount, count){
        if(err) {
            console.error(err);
            return next(err);
        }
        res.json({"docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount});
        req.onSend();
    })
}
