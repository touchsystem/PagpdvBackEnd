var mongoose = require('mongoose');

exports.create = async (req, res, next) => {
    // Set the params variable with the JSON body
    var params = req.body;
    var currencyAccount = 0;
    var accounts = [];
    var Accounts = req.modelFactory.get('Accounts');
    Accounts.find({internalId: params.internalId}, function(err, result) {
        if(Object.keys(result).length > 0) {
            res.send({"msg": "This payment method is duplicated"});
            req.onSend();
        }
    });
    Accounts.find({'accountNumber': {"$regex": "1112.*", "$options": 'i'}},(err, result) => {
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

    Accounts.find({'accountNumber': {"$regex": "8888.*", "$options": 'i'}}, (err, result) => {
        currencyAccount = parseInt(result.accountNumber) + 1;
        accounts.push({ 
            additionalInformation: params.additionalInformation,
            accountNumber: currencyAccount,
            denomination: params.name,
            type: 5,
        });
    }).sort({'accountNumber': -1}).limit(1);

    var obj = {
        name: params.name,
        accountNumber: params.accountNumber,
        currencyAccount: currencyAccount,
        internalId: params.internalId,
        isCurrency: params.isCurrency,
        multiplyOrDivide: params.multiplyOrDivide,
        default: params.default,
        attachment: params.attachment
    }
    
    var PaymentMethod = req.modelFactory.get('PaymentMethods');
    function checkDefault(params){
        return new Promise((resolve, reject) => {
            if(params == true) {
                PaymentMethod.update({}, {'$set': {'isCurrency': true, 'default': false}}, (err, result) => {
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
    await checkDefault(params.default);
    
    Accounts.insertMany(accounts, (err, result) => { 
        if(err) return next(err);
        var createPayment = PaymentMethod(obj);
        createPayment.save((err, result) => { 
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

exports.show = function(req, res, next) {
    if(typeof req.params.id != 'undefined' | req.params.id != null) {
        var PaymentMethod = req.modelFactory.get('PaymentMethods');
        PaymentMethod.find({_id: mongoose.Types.ObjectId(id)}, (err, result) => {
            if(err) return next(err);
            res.send(result);
            req.onSend();
        });
    } else {
        return next(new Error('ID parameter was missed or was passing null.'));
    }
}

exports.list = function(req, res, next){
    // Get the parameters form the URI
    var queries = req.query;
    var page = queries.page;
    // Parse to Integer the limit parameter
    limit = parseInt(queries.limit, 10);
    // Geet the Currencies model and then pass the parameters got to paginate method
    req.modelFactory.get('PaymentMethods').paginate({status: 0}, { page: page, limit: limit}, function(err, result) {
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
        req.modelFactory.get('PaymentMethods').update({internalId: id }, { $set: { status: 1 }}, (err, result) => {
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
        req.modelFactory.get('PaymentMethods').update({_id: id}, {$set: {status: 1}}, (err, result) => {
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
            req.modelFactory.get('PaymentMethods').findOne(filter, function(err, p){
                if (!p)
                    console.log(err);
                else {
                    p.name = params.name,
                    p.description = params.description,
                    p.isCurrency = params.isCurrency,
                    p.isMethodPayment = params.isMethodPayment,
                    p.attachment = params.attachment,
                    p.symbol = params.symbol,
                    p.default = params.default,
                    p.enableOnDelivery = params.enableOnDelivery;
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

            /*req.modelFactory.get('PaymentMethods').update({_id: mongoose.Types.ObjectId(id)}, {$set: {name: params.name, attachment: params.attachment, accountNumber: params.accountNumber, isMethodPayment: params.isMethodPayment}}, (err, result) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }  
                else {
                    res.json({'status': 1});
                    req.onSend();
                }

            });
            /* req.modelFactory.getModels('Banks').Currencies.findById(id, function(err, p) {
                if (!p)
                    console.log(err);
                else {
                    p.name = params.name,
                    p.description = params.description,
                    p.isCurrency = params.isCurrency,
                    p.accountNumber = params.accountNumber,
                    p.isMethodPayment = params.isMethodPayment,
                    p.symbol = params.symbol,
                    p.default = params.default,
                    p.enableOnDelivery = params.enableOnDelivery;
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
            })*/
        } else {
            next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
        }
    }
}