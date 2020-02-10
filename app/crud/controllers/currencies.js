var mongoose = require('mongoose');

exports.create = async (req, res, next) => {
    // Set the params variable with the JSON body
    var Currencies = new req.modelFactory.get('Currency');
    var params = req.body;
    var accounts = [];
    var currencyAccount = 0;
    if(typeof params.internalId != 'undefined') {
        Currencies.find({internalId: params.internalId}, function(err, result) {
            if(Object.keys(result).length > 0) {
                res.send({"msg": "This currency is duplicated"});
                req.onSend();
            }
        });
    }
    // Función con promise para marcar a todos como default false
    function checkDefault(params){
        return new Promise((resolve, reject) => {
            if(params == true) {
                Currencies.update({}, {'$set': {'default': false}}, (err, result) => {
                    if(err) {
                        console.error(err);
                        reject();
                        return next(err);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    req.modelFactory.get('Accounts').find({'accountNumber': {"$regex": "1112.*", "$options": 'i'}},(err, result) => {
        accountNumber = result.accountNumber;
        accountNumber = parseInt(accountNumber) + 1;
        accounts.push({ 
            additionalInformation: params.additionalInformation,
            accountNumber: params.accountNumber,
            currency: params.symbol,
            denomination: 'Caixa '+params.name,
            type: 5,
        });
    }).sort({'accountNumber': -1}).limit(1);

    req.modelFactory.get('Accounts').find({'accountNumber': {"$regex": "8888.*", "$options": 'i'}}, (err, result) => {
        currencyAccount = parseInt(result.accountNumber) + 1;
        accounts.push({ 
            additionalInformation: params.additionalInformation,
            accountNumber: currencyAccount,
            denomination: params.name,
            type: 5,
        });
    }).sort({'accountNumber': -1}).limit(1);
    await checkDefault(params.default);
    var Accounts = new req.modelFactory.get('Accounts');
    Accounts.insertMany(obj, (err, result) => { 
        if(err) return next(err);
        var obj = {
            name: params.name,
            method: params.method,
            internalId: params.internalId,
            multiplyOrDivide: params.multiplyOrDivide,
            currencyAccount: currencyAccount,
            accountNumber: params.accountNumber,
            default: params.default
        }
        var Currencies = new req.modelFactory.getModels('Currencies').Contacts(obj);
        Currencies.save((err, result) => { 
            if(err) {
                console.error(err);
                return next(err);
            }
            res.json({'status': 1, 'id': result._id});
            // Close the connection
            req.onSend();
        });
    });
}
                     
exports.list = function(req, res, next){
    // Get the parameters form the URI
    var queries = req.query;
    var page = queries.page;
    // Parse to Integer the limit parameter
    limit = parseInt(queries.limit, 10);
    // Geet the Currencies model and then pass the parameters got to paginate method
    req.modelFactory.getModels('Currencies').Currencies.paginate({status: 0}, { page: page, limit: limit}, function(err, result) {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        // Close the connection
        req.onSend();
    });
}

exports.deleteInternal = function(req, res, next){
    // Get the ID parameters
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        // Get the respective model and then find the document by ID and removes it
        req.modelFactory.get('Currencies').update({internalId: id }, { $set: { status: 1 }}, (err, result) => {
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
        req.modelFactory.get('Currencies').update({_id: id}, {$set: {status: 1}}, (err, result) => {
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


exports.update = async function(req, res, next){
    function checkDefault(params){
        return new Promise((resolve, reject) => {
            if(params == true) {
                Currencies.update({}, {'$set': {'default': false}}, (err, result) => {
                    if(err) {
                        console.error(err);
                        reject();
                        return next(err);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
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
            await checkDefault(params.default);
            req.modelFactory.get('Currencies').findOne(filter, function(err, p){
                if (!p)
                    console.log(err);
                else {
                    p.name = params.name,
                    p.default = params.default,
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