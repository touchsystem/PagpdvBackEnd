var mongoose = require('mongoose');
var numeral = require('numeral');
const pdf = require('html-pdf');
var settings = require('./config');
var moment = require('moment');
moment.locale('pt-br');

async function getAllStock(req, res, next) {
    var Stock = req.modelFactory.get('Stock');
    var stock = await Stock.aggregate([
            /*{"$match": {"measure": {"$lte": 0}}},        
            {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products_docs"}},
            {"$project": {
                "_id": 1,
                "name": {"$arrayElemAt": ["$products_docs.name", 0]},
                "groupId": {"$arrayElemAt": ["$products_docs.groupId", 0]},
                "measure": "$measure",
                "unitPrice": "$unitPrice",
                "productId": "$productId",
                "date": "$date",
                "createdAt": "$createdAt"
            }},
            {"$lookup": {"from": "ProductGroups", "localField": "groupId", "foreignField": "_id", "as": "groups_docs"}},
            {"$project": {
                "_id": 1,
                "name": 1,
                "groupId": 1,
                "accountNumber": {"$arrayElemAt": ["$groups_docs.accountNumber", 0]},
                "measure": 1,
                "unitPrice": 1,
                "productId": 1,
                "date": 1,
                "createdAt": 1
            }},
            {"$match": {"accountNumber": {"$in": ["331102", "331103", "331104", "331105", "331106", "331107"]}}},
            {"$group": {
                "_id": "$productId",
                "name": {"$first": "$name"},
                "data": {"$push": {"_id": "$_id", "productId": "$productId", 
                    "measure": "$measure", "unitPrice": "$unitPrice", "date": "$date", "createdAt": "$createdAt"}}
            }}*/
            {"$match": {"measure": {"$gte": 0}}},
            {"$group": {
                "_id": {
                    "productId": "$productId",
                    "measure": "$measure",
                    "unitPrice": "$unitPrice"
                },
                "data": {"$push": "$$ROOT"}
            }},
            {"$match": {"$expr": {"$gte":  [{"$size": "$data"}, 2]}}}
        
    ])
    res.send(stock);
    req.onSend();
}

async function calculateCMVPerDay(req, res, next) {
    var cmv = await req.modelFactory.get('Stock').aggregate([
        {"$match": {"measure": {"$lt": 0}}},
        {"$project": {
            "amount": {"$multiply": ["$unitPrice", "$measure"]},
            "date": "$date"
        }},
        {"$group": {
            "_id": "$date",
            "amount": {"$sum": "$amount"}
        }}
    ]).exec();

    var collection = cmv.reduce(function(acc, cur) {
        acc.push({"amount": cur.amount, "date": cur._id, "status": 0});
        return acc;
    }, []);

    req.modelFactory.get('CMV').insertMany(collection, function(err, results) {
        if(err) return next(err);
        res.send({"status": 1});
        req.onSend();
    });
}

async function calcAverage(req, res, next) { 
    var Stock = req.modelFactory.get('Stock');
    var stock = await Stock.aggregate([
        {"$match": {"measure": {"$gte": 0}}},
        {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products_docs"}},
        {"$project": {
            "_id": 1,
            "name": {"$arrayElemAt": ["$products_docs.name", 0]},
            "measure": "$measure",
            "unitPrice": "$unitPrice",
            "productId": "$productId",
            "date": "$date"
        }},
        {
            "$group": {
                "_id": "$productId",
                "name": {"$first": "$name"},
                "data": {"$push": {"_id": "$_id", "productId": "$productId", 
                "measure": "$measure", "unitPrice": "$unitPrice", "date": "$date"}}
            }
        }
    ]).exec();
    res.send(stock);
    req.onSend();
}

module.exports.calcAverage = calcAverage;
module.exports.calculateCMVPerDay = calculateCMVPerDay;
module.exports.getAllStock = getAllStock;

exports.export = (req, res, next) => {
    (async () => {
        var Cashflow = req.modelFactory.get('Cashflow');
        var Stock = req.modelFactory.get('Stock');
        var Documents = req.modelFactory.get('Documents');
        Object
        var cashflow = await Cashflow.aggregate([
            {"$project": {
                "_id": "$_id",
                "amount": {"$subtract": ["$debitAmount", "$creditAmount"]},
                "date": "$date"
            }}
        ]).exec();

        console.log('cashflow', Object.keys(cashflow).length);
    
        var stock = await Stock.aggregate([
            {"$project": {
                "_id": "$productId",
                "measure": "$measure",
                "amount": "$unitPrice",
                "date": "$date"
            }}  
        ]).exec();

        console.log('stock', Object.keys(stock).length);

        // Compra
        var documents = await Documents.aggregate([
            {"$match": {"documentType": 1}},
            {"$project": {
                "_id": 1,
                "amount": "$documentAmount",
                "date": "$date"
            }}
        ]).exec();

        res.send(stock);
        req.onSend();
    })();
    
}

exports.difference = (req, res, next) => {
    var stock = db.Stock.aggregate([
        {"$match": {"measure": {"$lte": 0}}},
        {"$project": {
            "productId": "$productId",
            "subtotal": {"$multiply": ["$measure", "$unitPrice"]}
        }},
        {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products_docs"}},
        {"$project": {
            "id": 1,
            "productId": 1,
            "subtotal": 1,
            "groupId": {"$arrayElemAt": ["$products_docs.groupId", 0]},
        }},
        {"$lookup": {"from": "ProductGroups", "localField": "groupId", "foreignField": "_id", "as": "groups_docs"}},
        {"$project": {
            "_id": 1,
            "productId": 1,
            "subtotal": 1,
            "groupId": 1,
            "groupName": {"$arrayElemAt": ["$groups_docs.name", 0]},
            "accountNumber": {"$arrayElemAt": ["$groups_docs.accountNumber", 0]}
        }},
        {"$group": {
            "_id": null,
            "total": {"$sum": "$subtotal"}
        }}
    ]).exec();
    console.log('stock', stock);
}

/**
 *  Hablar con Erasmo para saber como tomar el CMV de la venta,
 *  asi tambien como se calcula el average del costo del estoque
 * 
 *  En GetActualStock ver bien la parte del calculo del CMV en outputPrice esta tomando el costo del producto, deberia ver si es el promedio o como
 */

exports.purchases = (req, res, next) => {
    var params = req.body;
    var invoices = [];
    var products = [];
    var productsItems = [];
    var finances, businessPartnerId;
    var date = params.date;
    var transactionId = new Date().getTime();
    var Stock = req.modelFactory.get('Stock');
    var Products = req.modelFactory.get('Products');


    for(let i = 0; i < Object.keys(params.products).length; i++) {
        let element = params.products[i];
        productsItems.push(mongoose.Types.ObjectId(element.productId));
        products.push({'productId': mongoose.Types.ObjectId(element.productId), 'measure': element.quantity, 'unitPrice': element.unitPrice, 'subtotalPrice': element.subtotalPrice, 'stockGroupId': null, 'transactionId': transactionId, 'date': date});
    }

    for(let i = 0; i < Object.keys(params.invoices).length; i++) {
        let element = params.invoices[i];
        timestamp = new Date().getTime();
        invoices.push({'id': timestamp, 'documentNumber': params.documentNumber, 'date': element.date, 'amount': element.amount, 'status': element.status, 'expirationDate': element.expirationDate, 'observations': element.observations});
    }

    if(!params.businessPartnerId) {
        businessPartnerId = null;
    } else {
        businessPartnerId = params.businessPartnerId;
    }

    var obj = {
        businessPartnerId: businessPartnerId,
        documentAmount: params.documentAmount,
        documentNumber: params.documentNumber,
        invoices: invoices,
        products: products,
        documentType: params.documentType,
        observations: params.observations,
        transactionId: transactionId,
        date: params.date,
        emissionDate: params.emissionDate,
        accountNumber: params.accountNumber
     }

     var Documents =  req.modelFactory.get('Documents')(obj);
     // Creates the document
     Documents.save((err, data) => {
        if(err) return next(err);

        var cashflow = [];
        var documentId = data._id;
        var hasProduct;
        if(params.documentType == 2) {
            if(Object.keys(products).length > 0) {
                hasProduct = 1;
                // Insert the products
                req.modelFactory.get('Stock').insertMany(products, (err, result) => {
                    if(err) return next(err);
                });
            } else {
                hasProduct = 0;
            }
        }

        debitAmount = 0;
        creditAmount = 0;

        hasProduct == 1 ? accountNumber = "113101" : accountNumber = params.accountNumber;
        // Get the settings for the cashflow, it depends on the type of the document
        if(hasProduct == 1) {
            (async () => {
                Stock.aggregate(
                    [
                        {
                            "$sort": {"createdAt": 1}
                        },
                        {
                            "$match": {
                                "productId": {"$in": productsItems}
                            }
                        },
                        { 
                            "$match" : {
                                "measure" : {
                                    "$gt" : 0
                                }
                            }
                        }, 
                        { 
                            "$group" : {
                                "_id" : "$productId", 
                                "products" : {
                                    "$push" : {
                                        "productId" : "$productId", 
                                        "measure" : "$measure", 
                                        "unitPrice" : "$unitPrice", 
                                        "subtotalPrice" : "$subtotalPrice", 
                                        "createdAt" : "$createdAt"
                                    }
                                }
                            }
                        }, 
                        /*{ 
                            "$project" : {
                                "_id" : 1, 
                                "products" : {
                                    "$slice" : [
                                        "$products", 
                                        10
                                    ]
                                }
                            }
                        },*/ 
                        { 
                            "$unwind" : {
                                "path" : "$products"
                            }
                        }, 
                        { 
                            "$project" : {
                            "measure" : "$products.measure", 
                            "unitPrice" : "$products.unitPrice", 
                            "subtotalPrice" : "$products.subtotalPrice"
                        }
                    }, 
                    { 
                        "$group" : {
                            "_id" : "$_id", 
                            "measure" : {
                                "$sum" : "$measure"
                            }, 
                            "averageCost" : {
                                "$avg" : "$unitPrice"
                            }
                        }
                    }
                ], (err, result) => {
                    if(err) return next(err);
                    for(let i = 0; i < Object.keys(result).length; i++) {
                        Products.update({_id: result[i]._id}, {$set: {'price': result[i].averageCost}}).exec();
                    }
                    console.log('updated');
                    params.documentType == 2 ? finances = settings.createDocumentsToPay(params.documentAmount, accountNumber) : finances = settings.createDocumentsToReceive(params.documentAmount, accountNumber);
                    Object.keys(finances).forEach(childElement => {
                        let childParams = finances[childElement];
                        cashflow.push({
                            documentNumber: params.documentNumber,
                            accountNumber: childParams.accountNumber,
                            observations: [{'description': params.observations}],
                            date: moment().toISOString(),
                            transactionId: transactionId,
                            creditAmount: childParams.creditAmount,
                            debitAmount: childParams.debitAmount
                        });
                    });
                    req.modelFactory.get('Cashflow').insertMany(cashflow, (err, result) => {
                        if(err) {
                            console.error(err);
                            return next(err);
                        }
                        res.send({'status': 1, 'id': documentId});
                        req.onSend();
                    });
                });
            })();
            
        } else {
            params.documentType == 2 ? finances = settings.createDocumentsToPay(params.documentAmount, accountNumber) : finances = settings.createDocumentsToReceive(params.documentAmount, accountNumber);
            Object.keys(finances).forEach(childElement => {
                console.log('Child element', childElement);
                let childParams = finances[childElement];
                cashflow.push({
                    documentNumber: params.documentNumber,
                    accountNumber: childParams.accountNumber,
                    observations: [{'description': params.observations}],
                    transactionId: transactionId,
                    date: moment().toISOString(),
                    creditAmount: childParams.creditAmount,
                    debitAmount: childParams.debitAmount
                });
            });
            req.modelFactory.get('Cashflow').insertMany(cashflow, (err, result) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
                console.log(result);
                res.send({'status': 1, 'id': documentId});
                req.onSend();
            });
        }
    });
}

exports.manualTransaction = (req, res, next) => {
    /* 	
        {
        "stockGroupId": ObjectId("5ad66a3e581952c9b8d10a"),
        "products": [{"productId": "5ad66a3e36213211c9b8d10a", "quantity": 7, "unitPrice": 2.00, "subtotalPrice": 14.00},
		{"productId": "5ad66a5136213211c9b8d10b", "quantity": 5, "unitPrice": 15.00, "subtotalPrice": 75.00},
        {"productId": "5ad66a6636213211c9b8d10c", "quantity": 12, "unitPrice": 13.00, "subtotalPrice": 156.00}]} */

        (async () => {
            var params = req.body;
            var stock = [];
            var stockGroupId = params.stockGroupId;
            var transactionId = new Date().getTime();
            var Stock = req.modelFactory.get('Stock');
            var Cashflow = req.modelFactory.get('Cashflow');
            var Products = req.modelFactory.get('Products');
            var items = [];
            var cashflow = [];
            console.log(params.products, 'params');
            for(let i = 0; i < Object.keys(params.products).length; i++) {
                let element = params.products[i];
                items.push(mongoose.Types.ObjectId(element.productId));
            }
            var treatedProducts = [];
            totalStockCashflow = 0;
            console.log(items);
            var products = await Products.aggregate([
                {"$match": {"_id": {"$in": items}}},
                {"$lookup": {"from": "ProductGroups", "localField": "groupId", "foreignField": "_id", "as": "groups_docs"}},
                {"$project": {
                    "name": 1,
                    "price": 1,
                    "accountNumber": {"$arrayElemAt": ["$groups_docs.accountNumber", 0]},
                    "groupName": {"$arrayElemAt": ["$groups_docs.name", 0]}
                }}
            ]);

            console.log(products, 'products');
            for(let j = 0; j < Object.keys(products).length; j++) {
                treatedProducts[products[j]._id] = {'price': products[j].price, 'name': products[j].name, "groupName": products[j].groupName, 'accountNumber': products[j].accountNumber};
            }

            console.log(treatedProducts, 'treated');


            for(let i = 0; i < Object.keys(params.products).length; i++){
                let element = params.products[i];
                let unitPrice = element.unitPrice;
                let costPrice = treatedProducts[element.productId].price;
                let subtotalPrice = unitPrice * element.measure;
                let subtotalCost = costPrice * element.measure;
                totalStockCashflow += subtotalCost;
                stock.push({'productId': mongoose.Types.ObjectId(element.productId), 'measure': -element.measure, 'observations': [{description: 'Saida de Produtos Manual '+element.date}], 'unitPrice': unitPrice, 'subtotalPrice': subtotalPrice, 'stockGroupId': stockGroupId, 'transactionId': transactionId, 'outputType': 'manual', "isProcessed": true, 'date': element.date});
                cashflow.push({'documentNumber': '', 'accountNumber': treatedProducts[element.productId].accountNumber, 'observations': [{description: 'CMV Venda '+treatedProducts[element.productId].groupName}], 'transactionId': transactionId, 'creditAmount': 0, 'debitAmount': subtotalCost, 'date': moment().toISOString()});
                //cashflow.push({'documentNumber': '', 'accountNumber': accountNumber, 'observations':  {description: 'Saida de Produtos Manual'}, 'creditAmount': 0, 'debitAmount': subtotalCost, 'date': moment().toISOString()});
            }
            
            cashflow.push({'documentNumber': '', 'accountNumber': '113101', 'observations': [{description: 'Saida de Produtos Manual'}], 'transactionId': transactionId, 'creditAmount': totalStockCashflow, 'debitAmount': 0, 'date': moment().toISOString()});
            Stock.insertMany(stock, (err, result) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
                Cashflow.insertMany(cashflow, (err, result) => {
                    if(err) return next(err);
                    res.send({'status': 1, 'transactionId': transactionId});
                    req.onSend();
                });
            });


        })();
}

exports.stockDifferenceReports = (req, res, next) => {
    (async () => {
        var Accounts = req.modelFactory.get('Accounts');
        var Cashflow = req.modelFactory.get('Cashflow');

        var systemPurchases = {};
        var manualPurchases = {};
        var systemOutput = {};
        var manualOutput = {};
        var difference = {};
     
            var accountNumber = "113101";
            systemPurchases[accountNumber] = {"debit": 0, "credit": 0};
            manualPurchases[accountNumber] = {"debit": 0, "credit": 0};
            systemOutput[accountNumber] = {"debit": 0, "credit": 0};
            manualOutput[accountNumber] = {"debit": 0, "credit": 0};
            difference[accountNumber] = {"debit": 0, "credit": 0};

            await Cashflow.aggregate([
                {"$match": {"accountNumber": "113101"}},
                {"$match": {"$or": [{"observations.description": /^Compra de*./}, {"observations.description": /^Saida de*./}]}},
                {"$group": {
                    "_id": null, 
                    "debitAmount": {"$sum": "$debitAmount"},
                    "creditAmount": {"$sum": "$creditAmount"}
                }}
            ], (err, result) => {
                if(err) next(err);
                console.log(result, 'result');
                console.log(typeof result[0], 'typeof');
                systemPurchases[accountNumber].debit = (typeof result[0] === 'undefined') ? 0 : result[0].debitAmount;
                systemOutput[accountNumber].credit = (typeof result[0] === 'undefined') ? 0 : result[0].creditAmount;
            }).exec();

            await Cashflow.aggregate([
                {"$match": {"accountNumber": "113101"}},
                {"$match": {"$or": [{"observations.description": {"$not": /^Compra de*./}}, {"observations.description": {"$not": /^Saida de*./}}]}},
                {"$group": {
                    "_id": null, 
                    "debitAmount": {"$sum": "$debitAmount"},
                    "creditAmount": {"$sum": "$creditAmount"}
                }}
            ], (err, result) => {
                if(err) next(err);
                console.log(result, 'result');
                manualPurchases[accountNumber].debit = (typeof result[0] === 'undefined') ? 0 : result[0].debitAmount;
                manualOutput[accountNumber].credit = (typeof result[0] === 'undefined') ? 0 : result[0].creditAmount;
               
            }).exec();

            await Cashflow.aggregate([
                {"$match": {"accountNumber": "113101"}},
                {"$match": {"observations": /^./}},
                {"$group": {
                    "_id": null,
                    "debitAmount": {"$sum": "$debitAmount"},
                    "creditAmount": {"$sum": "$creditAmount"}
                }}], (err, result) => {
                    difference[accountNumber].debit = (typeof result[0] === 'undefined') ? 0 : result[0].debitAmount;
                    difference[accountNumber].credit = (typeof result[0] === 'undefined') ? 0 : result[0].creditAmount;

                    res.send({"system": [{"purchases": systemPurchases, "output": systemOutput}], "manual": [{"purchases": manualPurchases, "output": manualOutput, }], "differences": difference});
                    req.onSend();
                }).exec();
    })();
}

exports.differenceReports = (req, res, next) => {
    (async () => {
        var Accounts = req.modelFactory.get('Accounts');
        var accounts = await Accounts.find({"$or": [{$or: [ { "accountNumber": /^321/ }, { "accountNumber": /^331/ } ] }, {"accountNumber": "332802"}]});
        var Cashflow = req.modelFactory.get('Cashflow');

        var objectCMV = {};
        var objectWCMV = {};
        for(let i = 0; i < Object.keys(accounts).length; i++) {
            let element = accounts[i];
            objectCMV[element.accountNumber] = {"name": element.denomination, "debit": 0, "credit": 0};
            objectWCMV[element.accountNumber] = {"name": element.denomination, "debit": 0, "credit": 0};
            await Cashflow.aggregate([
                {"$match": {"accountNumber": element.accountNumber}},
                {"$match": {"observations.description": /^CMV/}},
                {"$group": {
                    "_id": null, 
                    "debitAmount": {"$sum": "$debitAmount"},
                    "creditAmount": {"$sum": "$creditAmount"}
                }}
            ], (err, result) => {
                if(err) next(err);
                console.log(result, 'result');
                console.log(typeof result[0], 'typeof');
                objectCMV[element.accountNumber].debit = (typeof result[0] === 'undefined') ? 0 : result[0].debitAmount;
                objectCMV[element.accountNumber].credit = (typeof result[0] === 'undefined') ? 0 : result[0].creditAmount;
            }).exec();

            await Cashflow.aggregate([
                {"$match": {"accountNumber": element.accountNumber}},
                {"$match": {"observations.description": {"$not": /^CMV/}}},
                {"$group": {
                    "_id": null, 
                    "debitAmount": {"$sum": "$debitAmount"},
                    "creditAmount": {"$sum": "$creditAmount"}
                }}
            ], (err, result) => {
                if(err) next(err);
                objectWCMV[element.accountNumber].debit = (typeof result[0] === 'undefined') ? 0 : result[0].debitAmount;
                objectWCMV[element.accountNumber].credit = (typeof result[0] === 'undefined') ? 0 : result[0].creditAmount;
            }).exec();
        }
        res.send({"system": objectCMV, "manual": objectWCMV});
        req.onSend();
    })();
}

exports.recalculateProducts = (req, res, next) => {
        var Products = req.modelFactory.get('Products');
        var Stock = req.modelFactory.get('Stock');
        Stock.aggregate([
            {"productId": mongoose.Types.ObjectId('5c73e3ed39c9e14ef74cd74a')},
            {"$match": {"measure": {"$gte": 0}}},
            {"$match": {"date": {"$lte": moment().toDate()}}},
            {"$project": {
                "_id": 1,
                "productId": "$productId",
                "unitPrice": "$unitPrice",
            }},
            {"$group": {
                "_id": "$productId",
                "costPrice": {"$avg": "$unitPrice"},
            }},

        ], function(err, result) {
            (async () => {
                for(let i = 0; i < Object.keys(result).length; i++) {
                    try {
                        console.log('update');
                        await Products.update({_id: result[i]._id}, {$set: {'price': result[i].costPrice}}).exec();
                    } catch(e) {
                        return next(e);
                    }
                }
                res.send({"status": 1});
                req.onSend();
            })();
        });
}

exports.recalculatePurchases = (req, res, next) => {
    var Documents = req.modelFactory.get('Documents');
    var Stock = req.modelFactory.get('Stock');
    var Cashflow = req.modelFactory.get('Cashflow');
    Documents.aggregate([
        {"$match": {"products.productId": mongoose.Types.ObjectId('5c73e3ed39c9e14ef74cd74a')}},
        {"$match": {"documentType": 2}},
        {"$match": {"products": {"$exists": true}}},
        {"$project": {
            "observations": 1,
            "documentAmount": 1,
            "documentNumber": 1,
            "products": 1,
            "transactionId": 1,
            "date": 1 
        }}
    ], (err, result) => {
       if(err) return next(err);
       var stock = [];
       var cashflow = [];
       for(let i = 0; i < Object.keys(result).length; i++) {
            for(let j = 0; j < Object.keys(result[i].products).length; j++){
                let product = result[i].products[j];
                stock.push({"productId": mongoose.Types.ObjectId(product.productId), "measure": product.measure, "unitPrice": product.unitPrice, "subtotalPrice": product.subtotalPrice, "observations": [{"description": result[i].observations}], "transactionId": result[i].transactionId, "date": result[i].date});
            }
            cashflow.push({
                documentNumber: result[i].documentNumber,
                accountNumber: "211101",
                observations: [{'description': result[i].observations}],
                date: result[i].date,
                creditAmount:  result[i].documentAmount,
                debitAmount: 0
            });
            cashflow.push({
                documentNumber: result[i].documentNumber,
                accountNumber: "113101",
                observations: [{'description': result[i].observations}],
                date: result[i].date,
                creditAmount: 0,
                debitAmount: result[i].documentAmount
            });
        }
        
        console.log(stock);
        Stock.insertMany(stock, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.send({"status": 1});
            req.onSend();
            /*Cashflow.insertMany(cashflow, (err, result) => {
                if(err) return next(err);
                res.send({'status': 1});
                req.onSend();
            });*/
        });
    });
}

exports.getActualStock = (req, res, next) => {
    var Stock = req.modelFactory.get('Stock');
    var startDate = moment(req.query.startDate).startOf('day');
    var endDate = moment(req.query.endDate).endOf('day');
    var groupMatch = {"$match": {}};

    if(typeof req.query.group != 'undefined') {
        groupMatch["$match"] = {"groupId": mongoose.Types.ObjectId(req.query.group)}
    }

    Stock.aggregate([
        {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products_docs"}},
        {
            "$project": {
            "_id": "$_id",
            "productId": 1,
            "name": {"$arrayElemAt": ["$products_docs.name", 0]},
            "internalId": {"$arrayElemAt": ["$products_docs.internalid", 0]},
            "measure": "$measure",
            "unit": {"$arrayElemAt": ["$products_docs.unit", 0]},
            "groupId": {"$arrayElemAt": ["$products_docs.groupId", 0]},
            "stockPrice": "$unitPrice",
            "outputType": "$outputType",
            "subtotalPrice": "$subtotalPrice",
            "date": 1
        }},
        //{"$match": {"$or": [{"productId": mongoose.Types.ObjectId("5c73e3ed39c9e14ef74cd74a")}, {"productId": mongoose.Types.ObjectId("5c64178fcbbe6e08571a873b")}]}},
        groupMatch,
        {"$group": {
            "_id": "$productId",
            "unit": {"$first": "$unit"},
            "groupId": {"$first": "$groupId"},
            "name": {"$first": "$name"}, 
            "products_docs": {"$push": {"productId": "$productId", "internalId": "$internalId", "measure": "$measure", "groupId": "$groupId", "stockPrice": "$stockPrice", "subtotalPrice": "$subtotalPrice", "price": "$price", "date": "$date", "outputType": "$outputType"}}
        }},
        {"$project": {
            "_id": 1,
            "name": 1,
            "unit": 1,
            "groupId": 1,
            "measure": {"$sum": "$products_docs.measure"},
            "outputManual": {
                "$filter": {
                    "input": "$products_docs",
                    "as": "sales",
                    "cond": {"$and": [{"$eq": ["$$sales.outputType", "manual"]}, {"$and": [
                        {"$gte": ["$$sales.date", startDate.toDate()]},
                        {"$lte": ["$$sales.date", endDate.toDate()]}]}]
                    }
                }
            },
            "outputSales": {
                "$filter": {
                    "input": "$products_docs",
                    "as": "sales",
                    "cond": {"$and": [{"$eq": ["$$sales.outputType", "sales"]}, {"$and": [
                        {"$gte": ["$$sales.date", startDate.toDate()]},
                        {"$lte": ["$$sales.date", endDate.toDate()]}]}]
                    }
                }
            },
            "output": {
                "$filter": {
                    "input": "$products_docs",
                    "as": "sales",
                    "cond": {"$and": [{"$or": [{"$eq": ["$$sales.outputType", "sales"]},{"$eq": ["$$sales.outputType", "manual"]}]},{"$and": [
                        {"$gte": ["$$sales.date", startDate.toDate()]},
                        {"$lte": ["$$sales.date", endDate.toDate()]}]}]
                    }
                }
            },
            "previous_docs": {
                "$filter": {
                    "input": "$products_docs",
                    "as": "previous",
                    "cond": {"$lte": ["$$previous.date", startDate.toDate()]}
                }
            },
            "entries_docs": 
                {"$filter": {
                    "input": "$products_docs",
                    "as": "entries",
                    "cond": {"$and": [{"$gte": ["$$entries.measure", 0]},{"$and": [
                                {"$gte": ["$$entries.date", startDate.toDate()]},
                                {"$lte": ["$$entries.date", endDate.toDate()]}]}]
                            }
                        
                }}
            }  
        },
        {"$project": {
            "_id": 1,
            "name": 1,
            "unit": 1,
            "groupId": 1,
            "outputMeasure": {"$sum": "$output.measure"},
            "outputPrice": {"$avg": "$output.stockPrice"},
            "outputManual": {"$sum": "$outputManual.measure"},
            "outputSales": {"$sum": "$outputSales.measure"},
            "previous": {"$sum": "$previous_docs.measure"},
            "entries": {"$sum": "$entries_docs.measure"},
            "entriesSubtotal": {"$sum": "$entries_docs.subtotalPrice"},
            "measure": 1,
        }},
        {"$project": {
            "_id": 1,
            "name": 1,
            "unit": 1,
            "groupId": 1,
            "entries": 1,
            "outputMeasure": 1,
            "outputPrice": 1,
            "outputSales": 1,
            "outputManual": 1,
            "previous": 1,
            "totalEntries": "$entriesSubtotal",
            "measure": 1,
        }},
        {"$group": {
            "_id": "$groupId",
            "stock": {"$push": {"name": "$name", "unit": "$unit", "previous": "$previous", "outputPrice": "$outputPrice", "outputMeasure": "$outputMeasure", "entries": "$entries", "averageCost": "$averageCost", "outputSales": "$outputSales", "outputManual": "$outputManual", "totalEntries": "$totalEntries", "measure": "$measure", "cost": "$cost", "totalStock": "$totalStock"}}
        }},
        {"$lookup": {"from": "ProductGroups", "localField": "_id", "foreignField": "_id", "as": "groups_docs"}},
        {"$project": {
            "_id": 1,
            "name": {"$arrayElemAt": ["$groups_docs.name", 0]},
            "stock": 1
        }},
        {"$sort": {"name": 1}}
    ], (err, result) => {
        if(err) return next(err);
        totalStock = 0; 
        totalEntries = 0;
        totalPrevious = 0;
        totalCMV = 0;
        totalSales = 0;
        totalManual = 0;
        subtotalStock = 0;
        subtotalSales = 0;

        var hidden;
        if(moment(endDate).toDate() == moment().endOf('day').toDate()) {
            hidden = "color: white !important";
        }

        var html = `<html>
            <head>
            <style>
                html {
                    zoom: 0.55
                }
            </style>
            </head>
            <body>
            <div align="left">
                <h1 style="font-family: Arial">Inventario de Produtos</h1>
                <span style="font-family: Arial">Periodo: ${moment(startDate).format('L')} a ${moment(endDate).format('L')}</span><br><br>
            </div>
            <table align="center" width="100%">
                <thead style="padding-bottom: 1em;">
                        <tr style="border: 1px solid black; border-width: 2px 0px 2px 0px; padding-bottom: 1em;">
                            <th  style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px;">PRODUTO</th>
                            <th width="30" style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px">UNIDADE</th>
                            <th style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">ENTRADA</th>
                            <th style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">CST MED</th>
                            <th style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">TOTAL ENTR</th>
                            <th style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">SAIDA (D)</th>
                            <th style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">SAIDA (M)</th>
                            <th style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px" algin="right">CMV</th>
                            <th  style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px; ${hidden}" align="right">ESTOQUE</th>
                            <th  style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px; ${hidden}" align="right">CUSTO</th>
                            <th  style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px; ${hidden}" align="right">TOTAL</th>
                        </tr>
                </thead>
            <tbody>
            <tr></tr>`;
                //console.log(JSON.stringify(result), 'result');
                for(let i = 0; i < Object.keys(result).length; i++) {
                    let element = result[i];
                    averageCost = 0;
                    subtotalCMV = 0;
                    outputManual = 0;
                    outputSales = 0;
                    subtotalEntries = 0;
                    subtotalManual = 0;

                    html += `
                    <tr>
                        <td colspan="7"><b style="text-transform: uppercase; font-family: Arial">GRUPO: ${element.name}</b></td>
                    </tr>`;
                    for(let j = 0; j < Object.keys(element.stock).length; j++) {
                        var background;
                        if(j % 2 == 0){ 
                            background = "#CCC"; 
                        } else{ 
                            background = "#FFF"; 
                        }    
                        var price = 0;
                        (element.stock[j].outputPrice == null) ? price = 0 : price = element.stock[j].outputPrice;
                        averageCost = Number(element.stock[j].totalEntries) / Number(element.stock[j].entries) || 0;
                        amountEntries = Number(element.stock[j].entries) * averageCost;

                        cmv = amountEntries - (Math.abs(element.stock[j].measure) * averageCost);

                        outputManual = (element.stock[j].outputManual == null) ? 0 : element.stock[j].outputManual;
                        outputSales = (element.stock[j].outputSales == null) ? 0 : element.stock[j].outputSales;
                        amountStock = element.stock[j].measure * averageCost;

                        subtotalStock += amountStock;
                        subtotalEntries += Number(amountEntries);
                        subtotalSales += element.stock[j].outputSales;
                        subtotalManual += element.stock[j].outputManual;
                        subtotalCMV += cmv;
                        html += `
                        <tr style="background-color: ${background}; PAGE-BREAK-AFTER: always" cellspacing="0">
                            <td style="border-top: 0px solid black"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].name}</span></td>
                            <td style="border-top: 0px solid black"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].unit}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].entries}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(averageCost).format('0,0.00')}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(amountEntries).format('0,0.00')}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${Math.abs(element.stock[j].outputSales)}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${Math.abs(element.stock[j].outputManual)}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${Math.abs(cmv).toFixed(3)}</span></td>
                            <td style="border-top: 0px solid black; width: 100px" align="right"><span style="text-transform: uppercase; font-family: Arial; ${hidden}">${element.stock[j].measure.toFixed(3)}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial; ${hidden}">${numeral(averageCost).format('0,0.00')}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span  style="text-transform: uppercase; font-family: Arial; ${hidden}">${numeral(element.stock[j].measure * averageCost|| 0).format('0,0.00')}</span></td>
                        </tr>`;
                    }
                    totalEntries += subtotalEntries;
                    totalStock += subtotalStock;
                    totalCMV += subtotalCMV;
                    totalSales += subtotalSales;
                    totalManual += subtotalManual;
                    html += `
                    <tr>
                        <td style="border-bottom: 1px solid black"colspan="2"><b style="text-transform: uppercase; font-family: Arial">SOMA GRUPO</b></td>
                        <td style="border-bottom: 1px solid black" align="right" colspan="3"><b style="text-transform: uppercase; font-family: Arial">${numeral(subtotalEntries).format('0,0.00')}</td>
                        <td style="border-bottom: 1px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${Math.abs(subtotalSales)}</td>
                        <td style="border-bottom: 1px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${Math.abs(subtotalManual)}</td>
                        <td style="border-bottom: 1px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(subtotalCMV).format('0,0.00')}</td>
                        <td style="border-bottom: 1px solid black" align="right" colspan="3"><b style="text-transform: uppercase; font-family: Arial">${numeral(subtotalStock).format('0,0.00')}</b></td>
                    </tr>`;
                }
                
                html += `
                <tr>
                    <td colspan="2"><b style="text-transform: uppercase; font-family: Arial">TOTAL GERAL</b></td>
                    <td align="right" colspan="3"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalEntries).format('0,0.00')}</td>
                    <td align="right"><b style="text-transform: uppercase; font-family: Arial">${Math.abs(totalSales)}</td>
                    <td align="right"><b style="text-transform: uppercase; font-family: Arial">${Math.abs(totalManual)}</td>
                    <td align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalCMV).format('0,0.00')}</td>
                    <td align="right" colspan="3"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalStock).format('0,0.00')}</b></td>
                </tr>
                </tbody>
                </table>
                </body>
                </html>`;
                
                res.setHeader('Content-Type', 'application/pdf');
                var options = {
                    "html": html,
                    paperSize: {
                        format: 'A4', 
                        orientation: 'landscape', 
                        "border": "1cm"
                    },
                }

                var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
                var endDate = moment(req.query.endDate).format('DD-MM-YYYY');
                
                pdf.convert(options, function(err, result) {
                    if(err) return next(err);
                    var tmpPath = result.getTmpPath();
                    console.log(tmpPath);
                    S3Manager.uploadFromFile(tmpPath, 'pdf/stock-'+startDate+'-ao-'+endDate+'-', function(err, data){ 
                        console.log(data, 'response');
                        res.send(data);
                        req.onSend();
                    });
                });
    });
}

exports.recalculateSales = (req, res, next) => {
    var StockProvider = req.modelFactory.get('StockProvider');
    var Stock = req.modelFactory.get('Stock');
    var Cashflow = req.modelFactory.get('Cashflow');
    (async () => {
        var stockProvider = await StockProvider.find({"measure": {"$lte": 0}}).exec();

        var grouped = stockProvider.reduce(function (r, a) {
            r[a.createdAt] = r[a.createdAt] || [];
            r[a.createdAt].push(a);
            return r;
        }, Object.create(null));

        var totalCashflow = 0;
        var stock = [];
        var treatedProducts = [];
        var cashflow = [];
        var Products = req.modelFactory.get('Products');
        var products = await Products.aggregate([
            {"$lookup": {"from": "ProductGroups", "localField": "groupId", "foreignField": "_id", "as": "groups_docs"}},
            {"$project": {
                "name": 1,
                "price": 1,
                "accountNumber": {"$arrayElemAt": ["$groups_docs.accountNumber", 0]},
                "groupName": {"$arrayElemAt": ["$groups_docs.name", 0]}
            }}
        ]);
        for(let j = 0; j < Object.keys(products).length; j++) {
            //console.log(resultElement[j].costPrice);
            //console.log(resultElement[j], 'productId');
            treatedProducts[products[j]._id] = {'price': products[j].price, 'name': products[j].name, "groupName": products[j].groupName, "accountNumber": products[j].accountNumber};
        }
        for(let key in grouped){
            console.log('---------- START GROUP -------');
            var transactionId = new Date().getTime();
            for(let i = 0; i < Object.keys(grouped[key]).length; i++){
                //console.log(grouped[key][i], 'grouped');
                try {
                    let aggregate = await StockProvider.aggregate([
                        {"$match": {"measure": {"$gte": 0}}},
                        {"$match": {"date": {"$lte": moment(grouped[key[i].date]).toDate()}}},
                        {"$match": {"productId": mongoose.Types.ObjectId(grouped[key][i].productId)}},
                        {"$project": {
                            "_id": 1,
                            "unitPrice": "$unitPrice",
                        }},
                        {"$group": {
                            "_id": null,
                            "costPrice": {"$avg": "$unitPrice"},
                        }}
                    ]).exec();
                    var unitPrice = Number(aggregate[0].costPrice);
                    var absMeasure = Math.abs(grouped[key][i].measure);
                    var subtotalPrice = absMeasure*unitPrice;
                    totalCashflow += subtotalPrice;
                    console.log(totalCashflow);
                    console.log(grouped[key][i].measure, 'measure');
                    stock.push({"productId": mongoose.Types.ObjectId(grouped[key][i].productId), "isProcessed": true, "status": 0, "outputType": grouped[key][i].outputType, 'observations': [{description: 'Saida de Produtos Manual '+moment(grouped[key][i].date).format("L")}], 'measure': grouped[key][i].measure, 'unitPrice': unitPrice, "subtotalPrice": subtotalPrice, "transactionId": transactionId, "date": grouped[key][i].date});

                    cashflow.push({'documentNumber': '', 'accountNumber': treatedProducts[grouped[key][i].productId].accountNumber, 'observations': [{description: 'CMV Venda '+treatedProducts[grouped[key][i].productId].groupName}], 'creditAmount': 0, 'debitAmount': subtotalPrice, "transactionId": transactionId, 'date': grouped[key][i].date});
                } catch(e) {
                    return next(e);
                }
            }
            cashflow.push({'documentNumber': '', 'accountNumber': '113101', 'observations': [{description: 'Saida de Produtos Manual'}], 'creditAmount': totalCashflow, 'debitAmount': 0, 'date': moment(key).toDate(), "transactionId": transactionId});
            totalCashflow = 0;
            console.log('---------- END GROUP -------');
        }
        
        console.log(Object.keys(cashflow).length, 'totalcashflow');
        Stock.insertMany(stock, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            Cashflow.insertMany(cashflow, (err, result) => {
                if(err) return next(err);
                res.send({'status': 1});
                req.onSend();
            });
        });
            /*var aggregate = Stock.aggregate([
                {'$sort': {'createdAt': -1}}, 
                {"$group": {
                    "_id": "$productId",
                    "products": {"$push": {"id": "$_id", "quantity": "$quantity", "unitPrice": "$unitPrice", "subtotalPrice": "$subtotalPrice", "createdAt": "$createdAt"}}
                    }
                },
                {"$project": {
                  "_id": 1,
                  "products": {"$filter": {
                        "input": "$products",
                        "as": "product",
                        "cond": {"$gte": ["$$product.quantity", 0]}
                  }}
                }},
                {"$project": {
                    "_id": 1,
                    "products": 1,
                    "quantity": {"$sum": "$products.quantity"}
                }},
                {"$project": 
                    {
                        "products": {
                            "$slice": ["$products", 10]
                        },
                        "quantity": 1
                    }
                },
                {"$unwind": "$products"},
                {"$project": {
                    "_id": 1,
                    "amount": "$products.quantity",
                    "unitPrice": "$products.unitPrice",
                    "quantity": 1
                }},
                {"$group": {
                    "_id": "$_id",
                    "costPrice": {"$avg": {"$multiply": ["$amount",  "$unitPrice"]}},
                    "quantity": {"$first": "$quantity"}
                }}
            ]).toArray();*/
    })(); 
}

exports.calculate = (req, res, next) => {
    var start = req.query.start;
    var end = req.query.end;
    var Cashflow = req.modelFactory.get('Cashflow');
    var Stock = req.modelFactory.get('Stock');
    var Documents = req.modelFactory.get('Documents');

   Documents.find({"documentType": 2}, (err, result) => {
        res.send(result);
        req.onSend();
   }); 

    console.log(end);
        Cashflow.aggregate([
            {
                "$match": {"createdAt": {"$gte": moment(start).toDate(), "$lte": moment(end).toDate()}}
            },
            {
            "$match": {"accountNumber": /^113101*./}
            },
            {"$group": {
                "_id": "$createdAt",
                "data": {"$push": "$$ROOT"},
            }},
            {"$project": {
                "_id": 1,
                "data": 1,
                "stock": []
            }}
        ], (err, result) => {
                (async () => {
                    console.log(result, 'result');
                    var data = [];
                    for(let i = 0; i < Object.keys(result).length; i++) {
                        
                            let date = result[i].data[0].createdAt;
                            let startDate = moment(date).subtract(400, 'ms');
                            let endDate = moment(date).add(400, 'ms');
                            let stock = await Stock.find({"createdAt": {"$gte": startDate.toDate(), "$lte": endDate.toDate()}}).exec();
                            result[i].stock = stock;
                            data.push(result[i]);
                        
                    }
                    res.send(data);
                    req.onSend();
                })();
                /*for(let i = 0; i < Object.keys(result).length; i++) {
                    let date = result[i].createdAt;
                    let startDate = moment(date).subtract(20, 'seconds');
                    let endDate = moment(date).add(20, 'seconds');

                    let stock = await Stock.find({"date": {"$gte": startDate.toDate(), "$lte": endDate.toDate()}}).exec();
                    console.log(stock);
                }*/
           
        });
   
}


exports.totalSales = (req, res, next) => {
    var startDate = moment(req.query.startDate).startOf('day');
    var endDate = moment(req.query.endDate).endOf('day');
    var Sales = req.modelFactory.get('Sales');

    Sales.aggregate([
        {"$match": {"createdAt": {"$gte": startDate.toDate(), "$lte": endDate.toDate()}}},
            //{"$match": {"isProcessed": true}},
            {"$unwind": "$menuItems"},
            {"$project": 
                {
                    "_id": "$menuItems._id",
                    "unitPrice": "$menuItems.unitPrice", 
                    "name": "$menuItems.name",
                    "date": "$date",
                    "quantity": "$menuItems.quantity"
                }
            },
            {"$lookup": {"from": "MenuItems", "localField": "_id", "foreignField": "_id", "as": "menus_docs"}},
            {"$project": 
                {
                    "_id": 1,
                    "name": 1,
                    "subtotal": {"$multiply": ["$unitPrice", "$quantity"]},
                    "quantity": 1,
                    "date": 1,
                    "groupId": {"$arrayElemAt": ["$menus_docs.groupId", 0]}
                }
            },
            {"$group": 
                {
                     "_id": null,
                     "subtotal": {"$sum": "$subtotal"},
                     "quantity": {"$sum": "$quantity"}
                }
            }
    ], (err, result) => {
        if(err) return next(err);
        var subtotal = (typeof result[0] == 'undefined') ? 0 : result[0].subtotal;
        var quantity = (typeof result[0] == 'undefined') ? 0 : result[0].quantity;
        res.send({"subtotal": subtotal, "itemsQuantity": quantity});
        req.onSend();
    });
}

exports.closure = (req, res, next) => {
    /* 
           Ejemplo de JSON 
    {
        "date": "2018-04-21T00:00:00",
        payments: [
            {"_id": "19c13db32fa911sed", localCurrencyAmount: 2000},
            {"_id": "191a9d49c1a12259dc", localCurrencyAmount: 300},
            {"_id": "1a9d13e9cb19a3f59c", localCurrencyAmount: 50},

        ]
        "discount": 100,
        "lack": 50
    }
    
            params.payments[element.symbol];
    */
    (async () => {
        var body = req.body;
        var payed = 0;
        var unpayed = 0;
        var serviceTaxes = 0;
        console.log(Object.keys(body).length, 'size');
        var methodPayments = [];
        var paymentMethods = await req.modelFactory.get('PaymentMethods').find({}).exec();
        console.log(paymentMethods, 'payment');
        for(let j = 0; j < Object.keys(paymentMethods).length; j++) {
            let result = paymentMethods[j];
            methodPayments[result._id] = {"name": result.name, "accountNumber": result.accountNumber, 'currencyAccount': result.currencyAccount};
        }

        for(var index in body) {
            let element = body[index];
            var cashierId = "5c61c695cbbe6e08571a86d7";
            var date = moment(element.date).toDate();
            var Sales = req.modelFactory.get('Sales');

            var params = element;
            var startDate = moment(element.date).startOf('day').toDate();
            var endDate = moment(element.date).endOf('day').toDate();    
    
            await Sales.aggregate([
                {"$match": {"isProcessed": false}},
                {"$match": {"cashierId": mongoose.Types.ObjectId(cashierId)}},
                {"$match": {"date":  {'$gte': startDate, '$lt': endDate}}},
                {"$group": {
                    "_id": null,
                    "serviceTaxes": {"$sum": "$serviceTaxes"},
                    "payment": {"$push": {"$arrayElemAt": ["$payment", 0]}}
                }},
                {"$project": {
                    "_id": 1,
                    "serviceTaxes": 1,
                    "payed": {
                        "$filter": {
                            "input": "$payment",
                            "as": "payed",
                            "cond": {"$eq": ["$$payed.paid", "true"]}
                        }
                    },
                    "unpayed": {
                        "$filter": {
                            "input": "$payment",
                            "as": "unpayed",
                            "cond": {"$eq": ["$$unpayed.paid", "false"]}
                        }
                    }
                }},
                {"$project": {
                    "_id": 1,
                    "serviceTaxes": 1,
                    "payed": {"$sum": "$payed.localCurrencyAmount"},
                    "unpayed": {"$sum": "$unpayed.localCurrencyAmount"}
                }}
            ], (err, result) => {
                var processedResult = result;
                console.log(processedResult, 'process result');
                payed += processedResult[0].payed;
                unpayed += processedResult[0].unpayed;
                serviceTaxes += processedResult[0].serviceTaxes;
                if(Object.keys(processedResult).length == 0) {
                    return false;
                } else {
                        (async () => {
                            var cashflow = [];
                            var netTotal = 0;
                            netTotal = parseFloat(processedResult[0].payed) - parseFloat(processedResult[0].serviceTaxes);
        
                            for(let j = 0; j < Object.keys(params.payments).length; j++) {
                                let element = params.payments[j];
                                var localeMoment = moment(date);
                                localeMoment.locale('pt-br');
                                cashflow.push({
                                    documentNumber: "",
                                    accountNumber: methodPayments[element._id].accountNumber,
                                    observations: [{"type": "closure", "userId": cashierId, "description": "Venda "+localeMoment.format('L')+" ("+methodPayments[element._id].name+")"}],
                                    date: date,
                                    creditAmount: 0,
                                    debitAmount: element.localCurrencyAmount
                                });  
                                if(methodPayments[element._id].currencyAccount != '0') {
                                    cashflow.push({
                                        documentNumber: "",
                                        accountNumber: methodPayments[element._id].currencyAccount,
                                        observations: [{"type": "closure", "userId": cashierId, "description": "Venda ME "+localeMoment.format('L')+" Auxiliar ("+methodPayments[element._id].name+")"}],
                                        date: date,
                                        creditAmount: 0,
                                        debitAmount: element.amount
                                    });  
                                }
                            }
        
                            cashflow.push({
                                documentNumber: "",
                                accountNumber: "311102",
                                observations: [{
                                    description: "Vendas a Receber "  + moment(date).format("L")
                                }],
                                date: date,
                                creditAmount: processedResult[0].unpayed,
                                debitAmount: 0
                            });
        
                            cashflow.push({
                                documentNumber: "", //
                                accountNumber: "112101",
                                observations: [{
                                    description: "Vendas a Receber " + moment(date).format("L")
                                }],
                                date: date,
                                creditAmount: 0,
                                debitAmount: processedResult[0].unpayed
                            });
        
                            cashflow.push({
                                documentNumber: "",
                                accountNumber: "313601",
                                observations: [{description: "Taxa de Vendas "+moment(date).format('L')}],
                                date: date,
                                creditAmount: processedResult[0].serviceTaxes,
                                debitAmount: 0
                            });
        
                            var lack = parseFloat(params.lack);
                            cashflow.push({
                                documentNumber: "",
                                accountNumber: "311101",
                                observations: [{
                                    description: "Vendas a Vista Caixa " + moment(date).format("L")
                                }],
                                date: date,
                                creditAmount: (netTotal - lack - parseFloat(processedResult[0].serviceTaxes)),
                                debitAmount: 0
                            });
        
                            if(typeof params.discount != 'undefined' | params.discount != 0){
                                cashflow.push({
                                    documentNumber: "",
                                    accountNumber: "331106",
                                    observations: [{"type": "closure", "userId": cashierId, "description": "Desconto Venda "+localeMoment.format('L')}],
                                    date: date,
                                    creditAmount: params.discount,
                                    debitAmount: 0
                                })
                                cashflow.push({
                                    documentNumber: "",
                                    accountNumber: "331106",
                                    observations: [{"type": "closure", "userId": cashierId, "description": "Desconto Venda "+localeMoment.format('L')}],
                                    date: date,
                                    creditAmount: 0,
                                    debitAmount: params.discount
                                })
                            }
                            
                            if(typeof params.lack != 'undefined') {
                                if(params.lack < 0) {
                                    cashflow.push({
                                        documentNumber: "",
                                        accountNumber: "334201",
                                        observations: [{"type": "closure", "userId": cashierId, "description": "Falta/Sobra Venda "+localeMoment.format('L')}],
                                        date: date,
                                        creditAmount: Math.abs(params.lack),
                                        debitAmount: 0
                                    })
                                } else {
                                    cashflow.push({
                                        documentNumber: "",
                                        accountNumber: "334201",
                                        observations: [{"type": "closure", "userId": cashierId, "description": "Falta/Sobra Venda "+localeMoment.format('L')}],
                                        date: date,
                                        creditAmount: 0,
                                        debitAmount:  params.lack
                                    })
                                }
                            }
                        })();
                }
            });
        }
        await req.modelFactory.get('Cashflow').insertMany(cashflow, (err, result) => {
            if(err) return next(err);
        });
        await req.modelFactory.get('Sales').update({'isProcessed': false, "date":  {'$gte': startDate, '$lte': endDate}}, {"$set": {"isProcessed": true}}, (err, result) => {
            if(err) return next(err);
        });
        console.log('last +++');
        console.log(payed, 'payed');
        console.log(unpayed, 'unpayed');
        console.log(serviceTaxes, 'serviceTaxes');
    })();
}
