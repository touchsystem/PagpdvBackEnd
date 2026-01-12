var settings = require('../config');
var mongoose = require('mongoose');
var util = require('util');
var numeral = require('numeral');
var moment = require('moment');
var pdf = require('phantom-html2pdf');

// documentType: Tipo Documento
// Documento a Cobrar: 1
// Documento a Pagar: 2
// Documento a Cobrar - Contrato: 3
//var Shortcut = req.modelFactory.getModels('Shortcuts').Shortcuts(obj);

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */

exports.create = (req, res, next) => {
    var params = req.body;
    var invoices = [];
    var products = [];
    var productsItemsId = [];
    var finances, businessPartnerId;
    var date = params.date;
    var transactionId = new Date().getTime();
    var Stock = req.modelFactory.get('Stock');
    var Products = req.modelFactory.get('Products');

    params.products.forEach(element => {
        productsItemsId.push(mongoose.Types.ObjectId(element.productId));
        products.push({ 'productId': mongoose.Types.ObjectId(element.productId), 'measure': element.quantity, 'unitPrice': element.unitPrice, 'subtotalPrice': element.subtotalPrice, 'stockGroupId': null, 'transactionId': transactionId, 'date': date });
    });
    params.invoices.forEach(element => {
        timestamp = new Date().getTime();
        invoices.push({ 'id': timestamp, 'documentNumber': params.documentNumber, 'date': element.date, 'amount': element.amount, 'status': element.status, 'expirationDate': element.expirationDate, 'observations': element.observations });
    });
    if (!params.businessPartnerId) {
        businessPartnerId = null;
    } else {
        businessPartnerId = params.businessPartnerId;
    }

    var obj = {
        businessPartnerId: businessPartnerId,
        currency: params.currency,
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

    var Documents = req.modelFactory.get('Documents')(obj);
    console.log(obj);
    // Creates the document
    Documents.save((err, data) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        if (data) {
            var cashflow = [];
            var documentId = data._id;
            var hasProduct;
            // Check the Document Type, if has products then push it to the products array
            if (params.documentType == 2) {
                if (Object.keys(products).length > 0) {
                    hasProduct = 1;
                    // Insert the products
                    req.modelFactory.get('Stock').insertMany(products, (err, result) => {
                        if (err) return next(err);
                    });
                } else {
                    console.log("There isn't products");
                    hasProduct = 0;
                }
            }

            debitAmount = 0;
            creditAmount = 0;

            hasProduct == 1 ? accountNumber = "113101" : accountNumber = params.accountNumber;
            // Get the settings for the cashflow, it depends on the type of the document
            console.log(productsItemsId);
            if (hasProduct == 1) {
                console.log(productsItemsId);
                setTimeout(function () {
                    Stock.aggregate(
                        [
                            {
                                "$sort": { "createdAt": 1 }
                            },
                            {
                                "$match": {
                                    "productId": { "$in": productsItemsId }
                                }
                            },
                            {
                                "$match": {
                                    "measure": {
                                        "$gt": 0
                                    }
                                }
                            },
                            {
                                "$group": {
                                    "_id": "$productId",
                                    "products": {
                                        "$push": {
                                            "productId": "$productId",
                                            "measure": "$measure",
                                            "unitPrice": "$unitPrice",
                                            "subtotalPrice": "$subtotalPrice",
                                            "createdAt": "$createdAt"
                                        }
                                    }
                                }
                            },
                            {
                                "$project": {
                                    "_id": 1,
                                    "products": {
                                        "$slice": [
                                            "$products",
                                            10
                                        ]
                                    }
                                }
                            },
                            {
                                "$unwind": {
                                    "path": "$products"
                                }
                            },
                            {
                                "$project": {
                                    "measure": "$products.measure",
                                    "unitPrice": "$products.unitPrice",
                                    "subtotalPrice": "$products.subtotalPrice"
                                }
                            },
                            {
                                "$group": {
                                    "_id": "$_id",
                                    "measure": {
                                        "$sum": "$measure"
                                    },
                                    "averageCost": {
                                        "$avg": "$unitPrice"
                                    }
                                }
                            }
                        ], (err, result) => {
                            if (err) return next(err);
                            console.log(result);
                            for (let i = 0; i < Object.keys(result).length; i++) {
                                console.log('update');
                                Products.update({ _id: result[i]._id }, { $set: { 'price': result[i].averageCost } }).exec();
                            }
                            console.log('updated');
                            params.documentType == 2 ? finances = settings.createDocumentsToPay(params.documentAmount, accountNumber) : finances = settings.createDocumentsToReceive(params.documentAmount, accountNumber);
                            Object.keys(finances).forEach(childElement => {
                                console.log('Child element', childElement);
                                let childParams = finances[childElement];
                                cashflow.push({
                                    documentNumber: params.documentNumber,
                                    accountNumber: childParams.accountNumber,
                                    observations: [{ 'description': params.observations }],
                                    date: moment().toISOString(),
                                    currency: params.currency,
                                    creditAmount: childParams.creditAmount,
                                    debitAmount: childParams.debitAmount
                                });
                            });
                            console.log(cashflow, 'cashflow');
                            req.modelFactory.get('Cashflow').insertMany(cashflow, (err, result) => {
                                if (err) {
                                    console.error(err);
                                    return next(err);
                                }
                                res.send({ 'status': 1, 'id': documentId });
                                req.onSend();
                            });
                            /*(async () => {
                                for(let i = 0; i < Object.keys(result).length; i++) {
                                    await Products.update({_id: result[i]._id}, {$set: {'cost': result[i].averageCost}}).exec();
                                }
                                params.documentType == 2 ? finances = settings.createDocumentsToPay(params.documentAmount, accountNumber) : finances = settings.createDocumentsToReceive(params.documentAmount, accountNumber);
                                Object.keys(finances).forEach(childElement => {
                                    console.log('Child element', childElement);
                                    let childParams = finances[childElement];
                                    cashflow.push({
                                        documentNumber: params.documentNumber,
                                        accountNumber: childParams.accountNumber,
                                        observations: params.observations,
                                        date: params.date,
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
                            })();*/
                        });
                }, 200)

            } else {
                params.documentType == 2 ? finances = settings.createDocumentsToPay(params.documentAmount, accountNumber) : finances = settings.createDocumentsToReceive(params.documentAmount, accountNumber);
                Object.keys(finances).forEach(childElement => {
                    console.log('Child element', childElement);
                    let childParams = finances[childElement];
                    cashflow.push({
                        documentNumber: params.documentNumber,
                        accountNumber: childParams.accountNumber,
                        observations: [{ 'description': params.observations }],
                        date: moment().toISOString(),
                        currency: params.currency,
                        creditAmount: childParams.creditAmount,
                        debitAmount: childParams.debitAmount

                    });
                });
                req.modelFactory.get('Cashflow').insertMany(cashflow, (err, result) => {
                    if (err) {
                        console.error(err);
                        return next(err);
                    }
                    console.log(result);
                    res.send({ 'status': 1, 'id': documentId });
                    req.onSend();
                });
            }
        }
    });
}


exports.deletePurchases = (req, res, next) => {
    var transactionId = req.params.transactionId;
    var Documents = req.modelFactory.get('Documents');
    var Stock = req.modelFactory.get('Stock');
    var cashflow = [];
    Documents.find({ 'transactionId': transactionId }, (err, result) => {
        if (Object.keys(result).length == 1) {
            var documentAmount = result[0].documentAmount;
            finances = settings.counterpartDocumentsToPay(documentAmount, "113101");
            Object.keys(finances).forEach(childElement => {
                let childParams = finances[childElement];
                cashflow.push({
                    documentNumber: result[0].documentNumber,
                    accountNumber: childParams.accountNumber,
                    observations: "Cancelamento Compra de Produtos",
                    date: moment().toDate(),
                    creditAmount: childParams.creditAmount,
                    debitAmount: childParams.debitAmount
                });
            });
            req.modelFactory.get('Cashflow').insertMany(cashflow, (err, result) => {
                if (err) {
                    console.error(err);
                    return next(err);
                }
                Stock.deleteMany({ 'transactionId': transactionId }, (err, result) => {
                    Documents.update({ 'transactionId': transactionId }, { $set: { 'status': 1 } }, (err, result) => {
                        if (err) {
                            console.error(err);
                            return next(err);
                        }
                        res.send({ 'status': 1 });
                        req.onSend();
                    });
                });
            });
        } else {
            res.send({ 'status': 0, 'message': "This document doesn't exist" });
            req.onSend();
        }

    });
}

exports.customers = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    var Documents = req.modelFactory.get('Documents');
    var aggregate = Documents.aggregate([
        { "$match": { "businessPartnerId": { $ne: null } } },
        { "$match": { "documentType": 2 } },
        { "$lookup": { "from": "Users", "localField": "_id", "foreignField": "businessPartnerId", "as": "users_docs" } },
        {
            "$group": {
                "_id": "businessPartnerId",
                "name": { "$first": "$users_docs.name" },
                "total": { "$sum": 1 }
            }
        }
    ]);

    Documents.aggregatePaginate(aggregate, { page: page, limit: limit }, (err, result, pageCount, count) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        // Response with JSON in this standard format
        res.json({ "docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount });
        // Close the connection
        req.onSend();
    });
}

exports.purchases = (req, res, next) => {
    var queries = req.query;
    page = queries.page || 1
    if (!queries.limit) {
        limit = 10;
    } else {
        limit = parseInt(queries.limit, 10);
    }
    skip = (page - 1) * limit;
    var documentId = queries.documentId;
    var documentNumber = queries.documentNumber;
    var startDate = queries.startDate;
    var endDate = queries.endDate;
    limit = parseInt(queries.limit, 10);
    var Documents = req.modelFactory.get('Documents');

    var provider = { "$match": {} };
    if (typeof documentId != 'undefined' && documentId != "null") {
        provider["$match"] = { "documentId": documentId };
    }
    var document = { "$match": {} };
    if (typeof documentNumber != 'undefined' && documentNumber != "null") {
        document["$match"] = { "documentNumber": { "$regex": ".*" + documentNumber + ".*" } };
    }
    var date = { "$match": {} };
    if (typeof (startDate && endDate) != 'undefined') {
        date["$match"] = { "emissionDate": { $gte: new Date(startDate), $lte: new Date(endDate) } };
    }
    Documents.aggregate([
        { "$sort": { "date": -1 } },
        { "$match": { "products": { $ne: [] } } },
        { "$match": { "documentType": 2 } },
        date,
        document,
        { "$lookup": { "from": "Contacts", "localField": "businessPartnerId", "foreignField": "_id", "as": "business_docs" } },
        {
            "$project": {
                "documentNumber": 1,
                "documentAmount": 1,
                "name": { "$arrayElemAt": ["$business_docs.name", 0] },
                "documentId": { "$arrayElemAt": ["$business_docs.documentId", 0] },
                "emissionDate": 1,
                "transactionId": 1,
                "date": 1,
                "status": 1,
                "createdAt": 1
            }
        },
        provider,
        { "$sort": { "createdAt": -1 } },
        {
            $facet: {
                total: [
                    { $group: { _id: null, count: { $sum: 1 } } },
                ],
                docs: [
                    { $skip: skip },
                    { $limit: limit }
                ]
            }
        },
        {
            "$project": {
                "total": { $arrayElemAt: ["$total.count", 0] },
                "docs": 1
            }
        },
        {
            "$project": {
                "total": 1,
                "pages": { "$ceil": { "$divide": ["$total", limit] } },
                "docs": 1,
                "page": page
            }
        },
    ], (err, result) => {
        if (err) {
            req.onSend();
            return next(err);
        }
        res.send(result);
        req.onSend();
    });
}

exports.pay = (req, res, next) => {
    /* 
        {
            "payAmount": "150",
            "invoiceAmount": "500.25",
            "type": 2,
            "id": "1524168648911"
            "increaseAmount": 0,
            "discountAmount": 0
            "accountNumber": "221101"
        }
    */
    (async () => {
        var params = req.body;
        var payAmount = params.payAmount;
        var documentType = params.documentType;
        var observations = params.observations;
        var invoiceId = params.id;
        var accountNumber = params.accountNumber;
        var Documents = req.modelFactory.get('Documents');
        var Cashflow = req.modelFactory.get('Cashflow');
        var documentNumber;
        var documentConfig;
        var cashflow = [];

        if (typeof documentType == 'undefined') {
            res.send({
                "status": 0,
                "msg": "Query parameter documentType is not defined"
            });
            req.onSend();
        }


        var results = await Documents.aggregate([
            { "$unwind": "$invoices" },
            { "$match": { "invoices.id": invoiceId } },
            {
                "$project": {
                    "_id": 1,
                    "invoiceId": "$invoices.id",
                    "documentNumber": 1,
                    "status": "$invoices.status",
                    "invoiceAmount": "$invoices.amount"
                }
            }
        ]).exec();

        if (Object.keys(results).length == 0 || typeof results == 'undefined') {
            res.send({
                "status": 0,
                "msg": "Document not found"
            })
        }

        if (results[0].status == 1) {
            res.send({
                "status": 0,
                "msg": "A payment has already been made some time ago for this invoice"
            })
        }

        invoiceAmount = results[0].invoiceAmount;

        if (payAmount > invoiceAmount) {
            res.send({
                "status": 0,
                "msg": "payAmount is more than the invoiceAmount"
            });
            req.onSend();
        }

        documentId = results[0]._id;
        documentNumber = (typeof results.documentNumber == 'undefined') ? "" : results.documentNumber;
        (documentType == 2) ? documentConfig = settings.payDocumentsToPay(payAmount, accountNumber) : documentConfig = settings.payDocumentsToReceive(payAmount, accountNumber);

        console.log(documentConfig, 'document');

        Object.keys(documentConfig).forEach(childElement => {
            let childParams = documentConfig[childElement];
            cashflow.push({
                documentNumber: documentNumber,
                accountNumber: childParams.accountNumber,
                observations: [{ "description": observations }],
                creditAmount: childParams.creditAmount,
                debitAmount: childParams.debitAmount,
                currency: params.currency,
                date: moment().toISOString(true)
            });
        });
        var observationString;
        if (params.increaseAmount > 0 | params.discountAmount > 0) {
            if (documentType == 2) {
                if (params.increaseAmount > 0) {
                    finances = settings.toPayIncrementSettings(params.increaseAmount, accountNumber);
                    observationString = "Juro ";
                } else {
                    finances = settings.toPayDiscountSettings(params.discountAmount, accountNumber);
                    observationString = "Desconto ";
                }
            } else {
                if (params.increaseAmount > 0) {
                    finances = settings.toReceiveIncrementSettings(params.increaseAmount, accountNumber);
                    observationString = "Juro a Receber ";
                }
                else {
                    finances = settings.toReceiveDiscountSettings(params.discountAmount, accountNumber);
                    observationString = "Desconto a Receber ";
                }
            }

            Object.keys(finances).forEach(childElement => {
                let childParams = finances[childElement];
                cashflow.push({
                    documentNumber: documentNumber,
                    accountNumber: childParams.accountNumber,
                    observations: [{ "description": observationString + " Documento: " + documentNumber }],
                    debitAmount: childParams.debitAmount,
                    creditAmount: childParams.creditAmount,
                    currency: params.currency,
                    date: moment().toISOString(true)
                });
            });
        }

        Cashflow.insertMany(cashflow, (err, result) => {
            if (err) {
                console.error(err);
                return next(err);
            }
            Documents.updateOne({
                "invoices.id": invoiceId
            }, {
                $set: {
                    "invoices.$.status": 1,
                    "invoices.$.payDate": moment().toISOString(true)
                }
            }, (err, result) => {
                (async () => {
                    var count = await Documents.countDocuments({ "_id": mongoose.Types.ObjectId(documentId), "invoices.status": 0 }).exec();
                    console.log(count, 'count');
                    if (count == 0) {
                        Documents.update({ "_id": mongoose.Types.ObjectId(documentId) }, { $set: { "status": 1 } }, (err, result) => {
                            if (err) {
                                console.error(err);
                                return next(err);
                            }
                            res.send({ 'status': 1 });
                            req.onSend();
                        });
                    } else {
                        res.send({ 'status': 1 });
                        req.onSend();
                    }
                })();

            });
        });
    })();
}


/*exports.pay = async (req, res, next) => {
  
    (async () => {
        var params = req.body;
        var payAmount = params.payAmount;
        var documentType = params.documentType;
        var observations = params.observations;
        var invoiceId = params.id;
        var accountNumber = params.accountNumber;
        var Documents = req.modelFactory.get('Documents');
        var Cashflow = req.modelFactory.get('Cashflow');
        var documentNumber;
        var cashflow = [];
        function gettingFromDatabase() {
            return new Promise((resolve, reject) => {
                Documents.findOne({"invoices.id": invoiceId}, (err, result) => {
                    if(typeof result.documentNumber != 'undefined') {
                        documentNumber = result.documentNumber;
                    } else {
                        documentNumber = "";
                    }
                    resolve(result._id);
                });
            });
        }
        const documentId = await gettingFromDatabase();
        console.log(documentId, 'documentId');
        documentType == 2 ? finances = settings.payDocumentsToPay(payAmount, accountNumber) : finances = settings.payDocumentsToReceive(payAmount, accountNumber);
        if (typeof documentType != 'undefined') {
            Object.keys(finances).forEach(childElement => {
                let childParams = finances[childElement];
                cashflow.push({
                    documentNumber: documentNumber,
                    accountNumber: childParams.accountNumber,
                    observations: [{"description": observations}],
                    creditAmount: childParams.creditAmount,
                    debitAmount: childParams.debitAmount,
                    date: moment().toISOString(true)
                });
            });
        }
        var observationString;
        if(params.increaseAmount > 0 | params.discountAmount> 0) {
            if(documentType == 2) {
                if(params.increaseAmount > 0) {
                    finances = settings.toPayIncrementSettings(params.increaseAmount, accountNumber);
                    observationString = "Juro ";
                } else {
                    finances = settings.toPayDiscountSettings(params.discountAmount, accountNumber);
                    observationString = "Desconto ";
                }
            } else {
                if(params.increaseAmount > 0) {
                    finances = settings.toReceiveIncrementSettings(params.increaseAmount, accountNumber);
                    observationString = "Juro a Receber ";
                }
                else {
                    finances = settings.toReceiveDiscountSettings(params.discountAmount, accountNumber);
                    observationString = "Desconto a Receber ";
                }
            }
            //documentType == 2 ? finances = settings.payDocumentsToPay(payAmount, accountNumber) : finances = settings.payDocumentsToReceive(payAmount, accountNumber);
            Object.keys(finances).forEach(childElement => {
                let childParams = finances[childElement];
                cashflow.push({
                    documentNumber: documentNumber,
                    accountNumber: childParams.accountNumber,
                    observations: [{"description": observationString+" Documento: "+ documentNumber}],
                    debitAmount: childParams.debitAmount,
                    creditAmount: childParams.creditAmount,
                    date: moment().toISOString(true)
                });
            });
        }
        Cashflow.insertMany(cashflow, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            Documents.updateOne({
                "invoices.id": invoiceId
            }, {
                $set: {
                    "invoices.$.status": 1,
                    "invoices.$.payDate": moment().toISOString(true)
                }
            }, (err, result) => {
                setTimeout(function(){
                    var count = Documents.find({"invoices.id": mongoose.Types.ObjectId(invoiceId), "invoices.status": 0}).countDocuments();
                    console.log(count, 'count');
                    if(count == 0) {
                        Documents.update({"invoices.id": invoiceId}, {$set: {"status": 1}}, (err, result) => {
                            if(err) {
                                console.error(err);
                                return next(err);
                            }
                            res.send({'status': 1});
                            req.onSend();
                        });
                    } else {
                        res.send({'status': 1});
                        req.onSend();
                    }
                }, 200);
            })
        });
    })();
}*/

exports.payAndSplit = async (req, res, next) => {
    /* 
    {
        "payAmount": "150",
        "invoiceAmount": "500.25",
        "type": 2,
        "id": "1524168648911"
        "increaseAmount": 0,
        "discountAmount": 0
        "accountNumber": "221101"
    }
    */
    (async () => {
        var params = req.body;
        var payAmount = params.payAmount;
        var documentType = params.documentType;
        var observations = params.observations;
        var invoiceId = params.id;
        var accountNumber = params.accountNumber;
        var Documents = req.modelFactory.get('Documents');
        var Cashflow = req.modelFactory.get('Cashflow');
        var documentNumber;
        var cashflow = [];

        if (typeof documentType == 'undefined') {
            res.send({
                "status": 0,
                "msg": "Query parameter documentType is not defined"
            });
            req.onSend();
        }


        var results = await Documents.aggregate([
            { "$unwind": "$invoices" },
            { "$match": { "invoices.id": invoiceId } },
            {
                "$project": {
                    "_id": 1,
                    "invoiceId": "$invoices.id",
                    "documentNumber": 1,
                    "status": "$invoices.status",
                    "invoiceAmount": "$invoices.amount"
                }
            }
        ]).exec();

        if (typeof results == 'undefined') {
            res.send({
                "status": 0,
                "msg": "Document not found"
            });
            req.onSend();
        }

        if (results[0].status == 1) {
            res.send({
                "status": 0,
                "msg": "A payment has already been made some time ago for this invoice"
            })
        }


        invoiceAmount = results[0].invoiceAmount;
        documentId = results[0]._id;
        documentNumber = (typeof results.documentNumber == 'undefined') ? "" : results.documentNumber;

        if (payAmount > invoiceAmount) {
            res.send({
                "status": 0,
                "msg": "payAmount is more than the invoiceAmount"
            });
            req.onSend();
        } else if (payAmount == invoiceAmount) {
            var cashflow = [];
            Documents.updateOne({
                "invoices.id": invoiceId
            }, {
                $set: {
                    "invoices.$.status": 1,
                    "invoices.$.payDate": moment().toISOString(true)
                }
            })
            documentType == 2 ? finances = settings.providerSplittedPaySettings(payAmount, accountNumber) : finances = settings.customerSplittedPaySettings(element.discountAmount);
            if (typeof documentType != 'undefined') {
                Object.keys(finances).forEach(childElement => {
                    let childParams = finances[childElement];
                    cashflow.push({
                        documentNumber: documentNumber,
                        accountNumber: childParams.accountNumber,
                        observations: childParams.observations,
                        debitAmount: childParams.debitAmount,
                        creditAmount: childParams.creditAmount,
                        date: moment().toISOString(true)
                    });
                });

                Cashflow.insertMany(cashflow, (err, result) => {
                    if (err) {
                        console.error(err);
                        return next(err);
                    }
                    (async () => {
                        var count = await Documents.countDocuments({ "_id": mongoose.Types.ObjectId(documentId), "invoices.status": 0 }).exec();
                        console.log(count, 'count');
                        if (count == 0) {
                            Documents.update({ "_id": mongoose.Types.ObjectId(documentId) }, { $set: { "status": 1 } }, (err, result) => {
                                if (err) {
                                    console.error(err);
                                    return next(err);
                                }
                                res.send({ 'status': 1 });
                                req.onSend();
                            });
                        } else {
                            res.send({ 'status': 1 });
                            req.onSend();
                        }
                    })();
                });
            }
        } else if (payAmount < invoiceAmount) {
            var cashflow = [];
            partialAmount = 0;
            partialAmount = (invoiceAmount - payAmount);
            var newInvoiceId = new Date().getTime();
            Documents.updateOne({
                "invoices.id": invoiceId
            },
                {
                    $set: {
                        "invoices.$.amount": payAmount,
                        "invoices.$.payDate": moment().toISOString(true),
                        "invoices.$.status": 1
                    }
                }, (err, result) => {
                    if (err) {
                        console.error(err);
                        return next(err);
                    }
                });
            Documents.updateOne({
                "invoices.id": invoiceId
            }, {
                $push: {
                    "invoices": {
                        "id": newInvoiceId,
                        "observations": observations,
                        "documentNumber": documentNumber,
                        "amount": partialAmount,
                        "expirationDate": params.expirationDate,
                        "status": 0,
                        "date": moment().toISOString(true),
                    }
                }
            }, (err, result) => {
                if (err) {
                    console.error(err);
                    return next(err);
                }
            });
            if (typeof documentType != 'undefined') {
                documentType == 2 ? finances = settings.providerSplittedPaySettings(payAmount, accountNumber) : finances = settings.customerSplittedPaySettings(payAmount, accountNumber);
                Object.keys(finances).forEach(childElement => {
                    let childParams = finances[childElement];
                    cashflow.push({
                        documentNumber: documentNumber,
                        accountNumber: childParams.accountNumber,
                        observations: childParams.observations,
                        debitAmount: childParams.debitAmount,
                        creditAmount: childParams.creditAmount,
                        currency: params.currency,
                        date: moment().toISOString(true)
                    });
                });
                Cashflow.insertMany(cashflow, (err, result) => {
                    if (err) {
                        console.error(err);
                        return next(err);
                    }
                    res.send({ 'status': 1 });
                    req.onSend();
                });
            }
        }
    })();
}

/*exports.payAndSplit = (req, res, next) => {

    var params = req.body;
    var invoiceId = params.id;
    var payAmount = params.payAmount;
    var accountNumber = params.accountNumber;
    var invoiceAmount = params.invoiceAmount;
    var expirationDate = params.expirationDate;
    var documentType = params.documentType;
    var observations = params.observations;
    var Documents = req.modelFactory.get('Documents');
    var Cashflow = req.modelFactory.get('Cashflow');
    var documentNumber;
    function gettingFromDatabase() {
        return new Promise((resolve, reject) => {
            Documents.findOne({"invoices.id": invoiceId}, (err, result) => {
                //console.log('Resultado de DB', result);
                if(typeof result.documentNumber != 'undefined') {
                    documentNumber = result.documentNumber;
                } else {
                    documentNumber = "";
                }
                console.log('ID result', result._id);
                resolve(result._id);
            });
        });
    }

    const documentId = await gettingFromDatabase();

    if (payAmount > invoiceAmount) {
        res.send({
            "status": 0,
            "msg": "Monto excede a la parcela"
        });
        req.onSend();
    } else if (payAmount == invoiceAmount) {
        var cashflow = [];
        Documents.updateOne({
            "invoices.id": invoiceId
        }, {
            $set: {
                "invoices.$.status": 1,
                "invoices.$.payDate": moment().toISOString(true)
            }
        })
        documentType == 2 ? finances = settings.providerSplittedPaySettings(payAmount, accountNumber) : finances = settings.customerSplittedPaySettings(element.discountAmount);
        if (typeof documentType != 'undefined') {
            Object.keys(finances).forEach(childElement => {
                let childParams = finances[childElement];
                cashflow.push({
                    documentNumber: documentNumber,
                    accountNumber: childParams.accountNumber,
                    observations: childParams.observations,
                    debitAmount: childParams.debitAmount,
                    creditAmount: childParams.creditAmount,
                    date: moment().toISOString(true)
                });
            });
            Cashflow.insertMany(cashflow, (err, result) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
            });
        }
        res.send({
            "status": 1,
            "msg": "Monto pagado totalmente"
        });
        req.onSend();
    } else {
        var cashflow = [];
        partialAmount = 0;
        partialAmount = (invoiceAmount - payAmount);
        var newInvoiceId = new Date().getTime();
        console.log('Creo un ID nuevo', newInvoiceId);
        Documents.updateOne({
            "invoices.id": invoiceId
        },
        {
        $set: {
            "invoices.$.amount": payAmount,
            "invoices.$.payDate": moment().toISOString(true),
            "invoices.$.status": 1
        }}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
        });
        console.log('Actualiza el documento');
        Documents.updateOne({
            "invoices.id": invoiceId
        }, {
            $push: {"invoices": {
                "id": newInvoiceId,
                "observations": observations,
                "documentNumber": documentNumber,
                "amount": partialAmount,
                "expirationDate": params.expirationDate,
                "status": 0,
                "date": moment().toISOString(true),
            }}
        }, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
        });
        if (typeof documentType  != 'undefined') {
            documentType == 2 ? finances = settings.providerSplittedPaySettings(payAmount, accountNumber) : finances = settings.customerSplittedPaySettings(payAmount, accountNumber);
            Object.keys(finances).forEach(childElement => {
                let childParams = finances[childElement];
                cashflow.push({
                    documentNumber: documentNumber,
                    accountNumber: childParams.accountNumber,
                    observations: childParams.observations,
                    debitAmount: childParams.debitAmount,
                    creditAmount: childParams.creditAmount,
                    date: moment().toISOString(true)
                });
            });
            Cashflow.insertMany(cashflow, (err, result) => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.send({'status': 1});
                req.onSend();
            });
        }
    }
} */

exports.businessResume = (req, res, next) => {
    var queries = req.query;
    var startDate = queries.startDate;
    var endDate = queries.endDate;
    var businessPartnerId = req.params.businessPartnerId;
    documentType = parseInt(queries.documentType, 10);
    var documentTypeName, businessPartnerName;
    if (documentType == 2) {
        documentTypeName = 'Contas a Pagar';
        businessPartnerName = 'Fornecedor';
    } else {
        documentTypeName = 'Contas a Receber';
        businessPartnerName = 'Cliente';
    }
    var Documents = req.modelFactory.get('Documents');
    Documents.aggregate([
        { "$match": { "documentType": documentType } },
        //{"$match": {"status": filterStatus}},
        { "$match": { "date": { $gte: new Date(startDate), $lt: new Date(endDate) } } },
        { "$match": { "businessPartnerId": mongoose.Types.ObjectId(businessPartnerId) } },
        { "$lookup": { "from": "Contacts", "localField": "businessPartnerId", "foreignField": "_id", "as": "business_docs" } },
        { "$unwind": "$invoices" },
        {
            "$project": {
                "documentNumber": 1,
                "date": 1,
                "documentId": { "$arrayElemAt": ["$business_docs._id", 0] },
                "name": { "$arrayElemAt": ["$business_docs.name", 0] },
                "expirationDate": "$invoices.expirationDate",
                "documentAmount": "$invoices.amount",
                "payDate": "$invoices.payDate"
            }
        },
        {
            "$group": {
                "_id": "$businessPartnerId",
                "name": { "$first": "$name" },
                "documentTotal": { "$sum": "$documentAmount" },
                "bills_docs": { "$push": { "documentNumber": "$documentNumber", "date": "$date", "expirationDate": "$expirationDate", "payDate": "$payDate", "documentAmount": "$documentAmount" } }
            }
        }
    ], (err, result) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        var html = `<html>
            <head>
            <style>
            html {
                zoom: 0.55;
            }
            </style>
            </head>
            <body>
            <div align="left">
                <h1 style="font-family: Arial">${documentTypeName}</h1>
            </div>
            <table align="center" cellpadding="1" width="100%">
                <thead style="padding-bottom: 1em;">
                        <tr style="border: 1px solid black; border-width: 2px 0px 2px 0px; padding-bottom: 1em;">
                            <th  style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px;" cellspacing="0" cellpadding="0">Doc</th>
                            <th  style="font-family: Arial; font-size: 14px;  border: 1px solid black; border-width: 2px 0px 2px 0px" cellspacing="0" cellpadding="0">Data</th>
                            <th  style="font-family: Arial; font-size: 14px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="left" cellspacing="0" cellpadding="0">${businessPartnerName}</th>
                            <th  style="font-family: Arial; font-size: 14px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="left" cellspacing="0" cellpadding="0">Vencim.</th>
                            <th  style="font-family: Arial; font-size: 14px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right" cellspacing="0" cellpadding="0">Pgto</th>
                            <th  style="font-family: Arial; font-size: 14px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right" cellspacing="0" cellpadding="0">Valor</th>
                        </tr>
                </thead>
            <tbody>
            <tr></tr>`;
        var count = Object.keys(result).length;
        var total = 0;
        var i = 0;
        var iterate = new Promise(function (resolve, reject) {
            result.forEach(element => {
                total += element.documentTotal;
                html += `
                    <tr>
                        <td width="200" colspan="3"><i><span style="font-size: 20px; font-weight: bolder; margin-bottom: 15px;">${element.name}</span></i></td>
                    </tr>`;
                element.bills_docs.forEach(childElement => {

                    expirationDate = typeof childElement.expirationDate != 'undefined' ? moment(childElement.expirationDate).format("DD/MM/YYYY") : '';
                    payDate = typeof childElement.payDate != 'undefined' ? moment(childElement.payDate).format("DD/MM/YYYY") : '';
                    date = typeof childElement.date != 'undefined' ? moment(childElement.date).format("DD/MM/YYYY") : '';
                    html += `
                        <tr>
                            <td width="200" style="font-size: 13px; font-family: Arial">${childElement.documentNumber}</td>
                            <td width="90" style="font-size: 13px; font-family: Arial">${date}</td>
                            <td width="180" align="left" style="font-size: 13px; font-family: Arial">${element.name}</td>
                            <td width="100" align="right" style="font-size: 13px; font-family: Arial">${expirationDate}</td>
                            <td width="100" align="right" style="font-size: 13px; font-family: Arial">${payDate}</td>
                            <td width="120" align="right" style="font-size: 13px; font-family: Arial">${numeral(childElement.documentAmount).format('0,0.00')}</td>
                        </tr>`;
                });
                html += `
                    <tr>
                        <td width="120" colspan="6" align="right"  style="border: 1px solid black; border-width: 0px 0px 1px 0px;"><i><b>${numeral(element.documentTotal).format('0,0.00')}</b></i></td>
                    </tr>`;
                i++;
            });
            html += `
                <tr>
                    <td width="120" colspan="6" align="right"  style="border: 1px solid black; border-width: 0px 0px 1px 0px;"><i><b>Total: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${numeral(total).format('0,0.00')}</b></i></td>
                </tr>
                </table>`;
            if (count == i) {
                resolve(i);
            }
        });
        iterate.then((result) => {
            console.log(result);
            var options = {
                "html": html,
                "paperSize": { format: 'Legal', orientation: 'portrait', border: '0.3in' }
            }

            var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
            var endDate = moment(req.query.endDate).format('DD-MM-YYYY');

            pdf.convert(options, function (err, result) {
                var tmpPath = result.getTmpPath();
                console.log(tmpPath);
                S3Manager.uploadFromFile(tmpPath, 'pdf/documents-' + startDate + '-ao-' + endDate + '-', function (err, data) {
                    console.log(data, 'response');
                    res.send(data);
                    req.onSend();
                });
            });
        });
    });
}

exports.reports = (req, res, next) => {
    var queries = req.query;
    var startDate = queries.startDate;
    var endDate = queries.endDate;
    //var status = queries.status;
    documentType = parseInt(queries.documentType, 10);
    var documentTypeName;
    if (documentType == 2) {
        documentTypeName = 'Contas a Pagar';
    } else {
        documentTypeName = 'Contas a Receber';
    }
    // customer or expiration
    var filterType = queries.filterType;
    var filterStatus = parseInt(queries.filterStatus, 10);
    var Documents = req.modelFactory.get('Documents');
    if (typeof documentType == 'undefined' || typeof filterStatus == 'undefined' || typeof filterType == 'undefined') {
        return next(new Error('Parametros faltantes para filtrar'));
    } else {
        Documents.aggregate([
            { "$match": { "documentType": documentType } },
            { "$match": { "date": { $gte: new Date(startDate), $lt: new Date(endDate) } } },
            { "$lookup": { "from": "Contacts", "localField": "businessPartnerId", "foreignField": "_id", "as": "business_docs" } },
            //{"$match": {"business_docs.isCustomer": true}},
            { "$unwind": "$invoices" },
            { "$match": { "status": filterStatus } },
            {
                "$project": {
                    "documentNumber": 1,
                    "date": 1,
                    "businessPartnerId": { "$arrayElemAt": ["$business_docs._id", 0] },
                    "businessName": { "$arrayElemAt": ["$business_docs.name", 0] },
                    "expirationDate": "$invoices.expirationDate",
                    "documentAmount": "$invoices.amount",
                    "payDate": "$invoices.payDate"
                }
            },
            {
                "$group": {
                    "_id": "$businessPartnerId",
                    "businessName": { "$first": "$businessName" },
                    "documentTotal": { "$sum": "$documentAmount" },
                    "bills_docs": { "$push": { "documentNumber": "$documentNumber", "date": "$date", "expirationDate": "$expirationDate", "payDate": "$payDate", "documentAmount": "$documentAmount" } }
                }
            }
        ], (err, result) => {
            if (err) {
                console.error(err);
                return next(err);
            }
            var html = `<html>
            <head>
            <style>
            html {
                zoom: 0.55;
            }
            </style>
            </head>
            <body>
            <div align="left">
                <h1 style="font-family: Arial">${documentTypeName}</h1>
            </div>
            <table align="center" cellpadding="1" width="100%">
                <thead style="padding-bottom: 1em;">
                        <tr style="border: 1px solid black; border-width: 2px 0px 2px 0px; padding-bottom: 1em;">
                            <th  style="font-family: Arial; font-size: 12px; border: 1px solid black; border-width: 2px 0px 2px 0px;" cellspacing="0" cellpadding="0">Doc</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px" cellspacing="0" cellpadding="0">Data</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="left" cellspacing="0" cellpadding="0">Cliente</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="left" cellspacing="0" cellpadding="0">Vencim.</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right" cellspacing="0" cellpadding="0">Pgto</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right" cellspacing="0" cellpadding="0">Valor</th>
                        </tr>
                </thead>
            <tbody>
            <tr></tr>`;
            if (filterType == 'businesspartner') {
                function compare(a, b) {
                    if (a.businessName < b.businessName)
                        return -1;
                    if (a.businessName > b.businessName)
                        return 1;
                    return 0;
                }
                total = 0;
                var sorted = result.sort(compare);
                var count = Object.keys(result).length;
                var i = 0;
                var iterate = new Promise(function (resolve, reject) {
                    sorted.forEach(element => {
                        total += element.documentTotal;
                        html += `
                        <tr>
                            <td width="200" colspan="3"><i><span style="font-size: 20px; font-weight: bolder; margin-bottom: 15px;">${element.businessName}</span></i></td>
                        </tr>`;
                        element.bills_docs.forEach(childElement => {
                            //console.log(childElement);
                            expirationDate = typeof childElement.expirationDate != 'undefined' ? moment(childElement.expirationDate).format("DD/MM/YYYY") : '';
                            payDate = typeof childElement.payDate != 'undefined' ? moment(childElement.payDate).format("DD/MM/YYYY") : '';
                            date = typeof childElement.date != 'undefined' ? moment(childElement.date).format("DD/MM/YYYY") : '';
                            html += `
                            <tr>
                                <td width="80" style="font-size: 14px; font-family: Arial">${childElement.documentNumber}</td>
                                <td width="90" style="font-size: 14px; font-family: Arial">${date}</td>
                                <td width="250" align="left" style="font-size: 14px; font-family: Arial">${element.businessName}</td>
                                <td width="100" align="right" style="font-size: 14px; font-family: Arial">${expirationDate}</td>
                                <td width="100" align="right" style="font-size: 14px; font-family: Arial">${payDate}</td>
                                <td width="80" align="right" style="font-size: 14px; font-family: Arial">${numeral(childElement.documentAmount).format('0,0.00')}</td>
                            </tr>`;
                        });
                        html += `
                        <tr>
                            <td width="120" colspan="6" align="right"  style="border: 1px solid black; border-width: 0px 0px 1px 0px;"><i><b>${numeral(element.documentTotal).format('0,0.00')}</b></i></td>
                        </tr>`;
                        i++;
                    });
                    html += `
                    <tr>
                        <td width="120" colspan="6" align="right"  style="border: 1px solid black; border-width: 0px 0px 1px 0px;"><i><b>Total: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${numeral(total).format('0,0.00')}</b></i></td>
                    </tr>
                    </table>`;
                    if (count == i) {
                        resolve(i);
                    }
                });
            } else if (filterType == 'expiration') {
                console.log('Llego a filterType');
                var sorted;
                var total = 0;
                var count = Object.keys(result).length;
                var i = 0;
                var iterate = new Promise(function (resolve, reject) {
                    result.forEach(element => {
                        sorted = element.bills_docs.sort(function (a, b) {
                            return new Date(a.expirationDate) - new Date(b.expirationDate)
                        });
                        total += element.documentTotal;
                        sorted.forEach(childElement => {
                            expirationDate = typeof childElement.expirationDate != 'undefined' ? moment(childElement.expirationDate).format("DD/MM/YYYY") : '';
                            payDate = typeof childElement.payDate != 'undefined' ? moment(childElement.payDate).format("DD/MM/YYYY") : '';
                            date = typeof childElement.date != 'undefined' ? moment(childElement.date).format("DD/MM/YYYY") : '';
                            html += `
                            <tr>
                                <td width="200">${childElement.documentNumber}</td>
                                <td width="90">${date}</td>
                                <td width="180" align="left">${element.businessName}</td>
                                <td width="100" align="right">${expirationDate}</td>
                                <td width="100" align="right">${payDate}</td>
                                <td width="120" align="right">${numeral(childElement.documentAmount).format('0,0.00')}</td>
                            </tr>`;
                        });
                        i++;
                    });
                    html += `
                    <tr>
                        <td width="120" colspan="6" align="right"  style="border: 1px solid black; border-width: 0px 0px 1px 0px;"><i><b>Total: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${numeral(total).format('0,0.00')}</b></i></td>
                    </tr>
                    </table>`;
                    if (count == i) {
                        resolve(i);
                    }
                });
            }
            iterate.then((result) => {
                console.log(result);
                res.setHeader('Content-Type', 'application/pdf')
                var options = {
                    "html": html,
                    "paperSize": { format: 'Legal', orientation: 'portrait', border: '0.3in', header: { contents: "<h1>test</h1>" } }
                }

                var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
                var endDate = moment(req.query.endDate).format('DD-MM-YYYY');

                pdf.convert(options, function (err, result) {
                    var tmpPath = result.getTmpPath();
                    console.log(tmpPath);
                    S3Manager.uploadFromFile(tmpPath, 'pdf/documents-' + startDate + '-ao-' + endDate + '-', function (err, data) {
                        console.log(data, 'response');
                        res.send(data);
                        req.onSend();
                    });
                });
            });
        });
    }
}

exports.details = (req, res, next) => {
    var documentId = req.params.documentId;
    var Documents = req.modelFactory.get('Documents');
    var aggregate = Documents.aggregate([
        { "$match": { "_id": mongoose.Types.ObjectId(documentId) } },
        { "$unwind": "$products" },
        { "$lookup": { "from": "Products", "localField": "products.productId", "foreignField": "_id", "as": "products_docs" } },
        {
            "$project": {
                "_id": 1,
                "status": 1,
                "businessPartnerId": 1,
                "documentAmount": 1,
                "invoices": 1,
                "products": { "productId": "$products.productId", "productName": { "$arrayElemAt": ["$products_docs.name", 0] }, "measure": "$products.measure", "unitPrice": "$products.unitPrice", "subtotalPrice": "$products.subtotalPrice", "stockGroupId": "$products.stockGroupId", "transactionId": "$products.transactionId", "date": "$products.date" },
                "documentType": 1,
                "observations": 1,
                "transactionId": 1,
                "date": 1,
                "emissionDate": 1,
                "accountNumber": 1,
                "createdAt": 1,
                "updatedAt": 1
            }
        },
        {
            "$group": {
                "_id": 1,
                "status": { "$first": "$status" },
                "businessPartnerId": { "$first": "$businessPartnerId" },
                "documentAmount": { "$first": "$documentAmount" },
                "invoices": { "$first": "$invoices" },
                "products": { "$push": "$products" },
                "documentType": { "$first": "$documentType" },
                "observations": { "$first": "observations" },
                "transactionId": { "$first": "$transactionId" },
                "date": { "$first": "$date" },
                "emissionDate": { "$first": "$emissionDate" },
                "accountNumber": { "$first": "$accountNumber" },
                "createdAt": { "$first": "$createdAt" },
                "updatedAt": { "$first": "$updatedAt" }
            }
        }], (err, result) => {
            if (err) return console.log(err);
            res.send(result);
        });
    /*
    Documents.aggregatePaginate(aggregate, {page: page, limit: limit}, (err, result, pageCount, count) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        // Response with JSON in this standard format
        res.json({"docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount});
        // Close the connection
        req.onSend();
    });*/

}

exports.show = (req, res, next) => {
    var documentType = parseInt(req.params.documentType, 10);
    var businessPartnerId = req.params.businessPartnerId;
    var queries = req.query;
    var page = queries.page;
    status = parseInt(req.params.status, 10);
    limit = parseInt(queries.limit, 10);
    var Documents = req.modelFactory.get('Documents');
    var aggregate = Documents.aggregate([
        { "$match": { "businessPartnerId": mongoose.Types.ObjectId(businessPartnerId) } },
        { "$match": { "documentType": documentType } },
        { "$sort": { "date": -1 } },
        { "$unwind": "$invoices" },
        { "$match": { "invoices.status": status } },
        {
            "$project": {
                "_id": 0,
                "businessPartnerId": 1,
                "documentNumber": "$invoices.documentNumber",
                "date": "$invoices.date",
                "amount": "$invoices.amount",
                "status": "$invoices.status",
                "expirationDate": "$invoices.expirationDate",
                "payDate": "$invoices.payDate",
                "observations": "$invoices.observations",
                "id": "$invoices.id",
                "documentType": 1,
                //"observations0": 1
            }
        },
    ], (err, result) => {
        if (err) return console.log(err);
        console.log(result);
    });
    Documents.aggregatePaginate(aggregate, { page: page, limit: limit }, (err, result, pageCount, count) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        // Response with JSON in this standard format
        res.json({ "docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount });
        // Close the connection
        req.onSend();
    });
}

exports.list = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    var Documents = req.modelFactory.get('Documents');
    Documents.paginate({ status: 0 }, { page: page, limit: limit }, (err, result) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        req.onSend();
    });
}

exports.search = (req, res, next) => {
    var queries = req.query;
    var search = queries.search;
    limit = parseInt(queries.limit, 10);
    var Documents = req.modelFactory.get('Documents');
    Documents.find({ "status": 0, "documentNumber": { "$regex": ".*" + query + ".*", "$options": 'i' } }, (err, result) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        req.onSend();
    }).limit(limit);
}

exports.delete = (req, res, next) => {
    var id = req.params.id;
    var Documents = req.modelFactory.get('Documents');
    Documents.update({ _id: id }, { $set: { "status": 1 } }, (err, result) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        res.json({ 'status': 1 });
    });
}