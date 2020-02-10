var mongoose = require('mongoose');
var moment = require('moment');

// Multiply: 1, Divide: 2
exports.create = (req, res, next) => {
    var params = req.body;
    var PaymentMethods = req.modelFactory.get('PaymentMethods');
    var Exchange = req.modelFactory.get('Exchange');
    var obj = {
        currencyId: params.currencyId,
        amount: params.amount
    }

    Exchange.aggregate(
        [
            {
                "$match": {"currencyId": mongoose.Types.ObjectId(params.currencyId)}
            },
            { 
                "$sort" : {
                    "createdAt" : 1
                }
            }, 
            { 
                "$group" : {
                    "_id" : "$currencyId", 
                    "exchange" : {
                        "$push" : {
                            "id" : "$_id", 
                            "amount" : "$amount", 
                            "operator" : "$operator"
                        }
                    }
                }
            }, 
            { 
                "$project" : {
                    "_id" : 1, 
                    "exchange" : {
                        "$slice" : [
                            "$exchange", 
                            10
                        ]
                    }
                }
            }, 
            { 
                "$unwind" : {
                    "path" : "$exchange"
                }
            }, 
            { 
                "$group" : {
                    "_id" : "$_id", 
                    "amount" : {
                        "$avg" : "$exchange.amount"
                    }
                }
            }, 
            { 
                "$project" : {
                    "_id" : 0, 
                    "currencyId" : "$_id", 
                    "amount" : 1
                }
            }
        ], (err, result) => {
            var exchange = result;
            NewExchange = Exchange(obj);
            NewExchange.save((err, result) => {
                var exchangeResult = result;
                if(err) return next(err);
                PaymentMethods.update({'_id': mongoose.Types.ObjectId(params.id)}, {$set: {'exchange': exchangeResult.amount}}, (err, result) => {
                    if(err) return next(err);
                    res.send({'status': 1, 'id': exchangeResult._id});
                    req.onSend();
                });
            });
        });
}

exports.sell = (req, res, next) => {
    var params = req.body;
    var sell = params.sell;
    var date = moment().toISOString();
    var amount = params.amount;
    var diferential = params.diferential;
    var selledLocalAmount = params.selledLocalAmount;

    var cashflow = [];
    var diferentialAccount; 
    var PaymentMethods = req.modelFactory.get('PaymentMethods');
    (async () => {
        var defaultMethod = await PaymentMethods .find({'default': true, 'isCurrency': true}).exec();
        var sellData = await PaymentMethods.find({'_id': mongoose.Types.ObjectId(sell), 'isCurrency': true}).exec();
        if(sellData == []) {
            return next(new Error('This currency is not setted like a payment method, please be sure that is enabled on Payment Methods'));
        }
        if(sellData[0].exchange == 0) {
            return next(new Error('Exchange was empty, there is not flow for this currency: '+params.sell));
        }
        // Valor contratado
        cashflow.push({
            documentNumber: "",
            accountNumber: sellData.accountNumber,
            observations: "Contrato cambio "+sellData.name+": "+date,
            date: date,
            creditAmount: selledLocalAmount,
            debitAmount: 0
        })
        // Valor moneda extranjera
        cashflow.push({
            documentNumber: "",
            accountNumber: "111101",
            observations: "Contrato cambio "+sellData.name+": "+date,
            date: date,
            creditAmount: 0,
            debitAmount: amount
        });

        // Diferencial
        cashflow.push({
            documentNumber: "",
            accountNumber: sellData.accountNumber,
            observations: "Contrato cambio "+sellData.name+" Diferencia: "+date,
            date: date,
            creditAmount: diferential,
            debitAmount: 0
        });
        // Ganancia o perdida
        diferential < 0 ? diferentialAccount = "333501" : diferentialAccount = "313401";
        cashflow.push({
            documentNumber: "",
            accountNumber: diferentialAccount,
            observations: "Contrato cambio "+defaultMethod.name+" Diferencia: "+date,
            date: date,
            creditAmount: 0,
            debitAmount: diferential
        });

        // Agregado en el currency Account 888888
        cashflow.push({
            documentNumber: "",
            accountNumber: sellData.currencyAccount,
            observations: "Contrato cambio "+defaultMethod.name+" ME "+date,
            date: date,
            creditAmount: 0,
            debitAmount: amount
        });

        var Cashflow = req.modelFactory.get('Cashflow');
        Cashflow.insertMany(cashflow, function(err, result){
            if(err) return next(err);
            res.send({'status': 1});
            req.onSend();
        });
        /*if(defaultMethod.operator == 1) {
            result = amount*sellData.exchange;
        } else {
            result = amount/sellData.exchange;
        }
        /*cashflow.push({
            documentNumber: "",
            accountNumber: sellData.accountNumber,
            observations: "Venda "+sellData.name+": "+date,
            date: date,
            creditAmount: amount,
            debitAmount: 0
        })
        cashflow.push({
            documentNumber: "",
            accountNumber: defaultMethod.accountNumber,
            observations: "Compra "+defaultMethod.name+": "+date,
            date: date,
            creditAmount: 0,
            debitAmount: result
        })*/
    })();
}

exports.getActualCash = (req, res, next) => {
        /*var Accounts = req.modelFactory.get('Accounts');
        Accounts.aggregate([
        {"$match": {"accountNumber":  /^1111.*/ /*}},
        /*{"$match": {"accountNumber": {"$nin": ["111108", "1111"]}}},
        {"$lookup": {"from": "Cashflow", "localField": "accountNumber", "foreignField": "accountNumber", "as": "cashflow_docs"}},
        {"$project": {
            "_id": 1,
            "denomination": 1,
            "accountNumber": 1,
            "debitAmount": {"$sum": "$cashflow_docs.debitAmount"},
            "creditAmount": {"$sum": "$cashflow_docs.creditAmount"}
        }},
        {"$group": {
            "_id": "$accountNumber",
            "denomination": {"$first": "$denomination"},
            "debitAmount": {"$first": "$debitAmount"},
            "creditAmount": {"$first": "$creditAmount"}
        }},
        {"$project": {
            "_id": 1,
            "amount": {"$subtract": ["$debitAmount", "$creditAmount"]}
        }},
        {"$lookup": {"from": "PaymentMethods", "localField": "_id", "foreignField": "accountNumber", "as": "payment_docs"}},
        {"$project": {
            "_id": 1,
            "denomination": {"$arrayElemAt": ["$payment_docs.name", 0]},
            "amount": 1
        }}
    ], (err, result) => {
            res.send(result);
            req.onSend();
    });*/
    var PaymentMethods = req.modelFactory.get('PaymentMethods');
    PaymentMethods.aggregate([
        {"$lookup": {"from": "Cashflow", "localField": "accountNumber", "foreignField": "accountNumber", "as": "caixa_docs"}},
        {"$lookup": {"from": "Cashflow", "localField": "currencyAccount", "foreignField": "accountNumber", "as": "auxiliar_docs"}},
        {"$project": {
            "_id": 1,
            "denomination": "$name",
            "accountNumber": 1,
            "currencyAccount": 1,
            "caixaDebitAmount": {"$sum": "$caixa_docs.debitAmount"},
            "caixaCreditAmount": {"$sum": "$caixa_docs.creditAmount"},
            "auxiliarDebitAmount": {"$sum": "$auxiliar_docs.debitAmount"},
            "auxiliarCreditAmount": {"$sum": "$auxiliar_docs.creditAmount"},
        }},
        {"$project": {
            "_id": 1,
            "denomination": 1,
            "accountNumber": 1,
            "currencyAccount": 1,
            "amount": {"$subtract": ["$caixaDebitAmount", "$caixaCreditAmount"]},
            "auxAccountAmount": {"$subtract": ["$auxiliarDebitAmount", "$auxiliarCreditAmount"]}
        }}
    ], (err, result) => {
        res.send(result);
        req.onSend();
    });
}

exports.exchange = (req, res, next) => {
    var Exchange = req.modelFactory.get('Exchange');
    Exchange.aggregate(
        [
            { 
                "$sort" : {
                    "createdAt" : 1
                }
            }, 
            { 
                "$group" : {
                    "_id" : "$method", 
                    "exchange" : {
                        "$push" : {
                            "id" : "$_id", 
                            "exchange" : "$exchange", 
                            "operator" : "$operator"
                        }
                    }
                }
            }, 
            { 
                "$project" : {
                    "_id" : 1, 
                    "exchange" : {
                        "$slice" : [
                            "$exchange", 
                            10
                        ]
                    }
                }
            }, 
            { 
                "$unwind" : {
                    "path" : "$exchange"
                }
            }, 
            { 
                "$group" : {
                    "_id" : "$_id", 
                    "exchange" : {
                        "$avg" : "$exchange.exchange"
                    }
                }
            }, 
            { 
                "$project" : {
                    "_id" : 0, 
                    "symbol" : "$_id", 
                    "exchange" : 1
                }
            }
        ], (err, result) => {
            if(err) return next(err);
            res.send(result);
            req.onSend();
        });
}

exports.delete = (req, res, next) => {
    var id = req.params.id;
    if(typeof id != 'undefined' | id != null) {
        var Exchange = req.modelFactory.get('Exchange');
        Exchange.remove({"_id": mongoose.Types.ObjectId(id)}, (err, result) => {
            if(err) return next(err);
            res.send({'status': 1});
            req.onSend();
        })
    } else {
        next(new Error('Id was missing or passing null'));
    }

} 