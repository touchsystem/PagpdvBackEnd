var mongoose = require('mongoose');
var moment = require('moment');
var numeral = require('numeral');
var pdf = require('phantom-html2pdf');
moment.locale("pt-br");

exports.create = (req, res, next) => {
    /**
     *
     * Iterate all the sales that come in
     *
     */
    (async () => {
        var params = req.body;
        var sales = [];
        var menuItems = [];
        var stock = [];
        var pendants = [];
        var Products = req.modelFactory.get('Products');
        var Documents = req.modelFactory.get('Documents');
        var Contacts = req.modelFactory.get('Contacts');
        var Sales = req.modelFactory.get('Sales');
        var saleNumber = 0;

        if(!Array.isArray(params)) {
            var params = [params];
        }


        if(Array.isArray(params)) {
            if(Array.isArray(params[0])) {
                var params = params[0];
            }
        }

        for(let i = 0; i < Object.keys(params).length; i++) {
            var treatedProducts = [];
            var relatedProducts = [];
            var element = params[i];
            if(typeof element.total == 'undefined') {
                return next(new Error("There is not total amount specified"));
            }

            if(typeof element.customer != 'undefined' && element.customer != "" && element.customer != null) {
                if(Object.keys(element.customer).length > 0) {
                    Contacts.findOne({internalId: element.customer.cid}, function(err, result) {
                        if(result != null){
                            businessPartnerId = mongoose.Types.ObjectId(result._id);
                        } else {
                            var obj = {
                                name: element.customer.name,
                                documentId: element.customer.documentNumber,
                                internalId: element.customer.cid,
                                documentType: element.customer.documentType,
                                addresses: element.customer.addresses,
                                roles: ['customers']
                            }
                            var createContact = Contacts(obj);
                            createContact.save(function(err, result) {
                                if(err) return next(err);
                                businessPartnerId = mongoose.Types.ObjectId(result._id);
                            });
                        }
                    });
                } else {
                    businessPartnerId = element.businessPartnerId;
                }
            } else {
                businessPartnerId = null;
            }

            let cashierId = mongoose.Types.ObjectId(element.cashierId);
            let date = element.date;
            let tableId = null;

            isTopLevel = true;
            var Utils = {
                /*processItems: function(item, treatedProd) {
                    var arr = [];
                    for(let i = 0; i < Object.keys(item).length; i++) {
                        console.log(Object.keys(item).length, 'length');
                        if(isTopLevel) {
                            isTopLevel = false;
                            console.log(item[i].itemId, '_id');
                            arr.push({"_id": mongoose.Types.ObjectId(item[i].itemId), "name": item[i].name, "quantity": 1, "unitPrice": item[i].price, "subtotal": item[i].price, "tableId": item[i].tableId, "observations": item[i].observations, "waiterId": item[i].waiterId, "items": Utils.processItems(item[i].items, treatedProd)});
                        } else {
                            //console.log(Object.keys(item[i].items).length, 'length');
                            //console.log('items', item[i]);
                            if(Object.keys(item[i].items).length == 0) {
                                if(typeof item[i].related != 'undefined') {
                                    let measure = Number(item[i].measure);
                                    let unitPrice = treatedProd[item[i].related].price;
                                    let subtotalPrice = unitPrice * measure;
                                    stock.push({'productId': mongoose.Types.ObjectId(item[i].related), 'unitPrice': unitPrice, 'subtotalPrice': subtotalPrice, 'measure': '-'+measure, 'date': moment(date).toISOString(), 'outputType': 'sales', 'status': 0});
                                } else {
                                    pendants.push({'name': item[i].name, 'measure': item[i].measure, 'date': date});
                                }
                                console.log(i, 'id');
                                console.log(Object.keys(item).length, 'length');
                            }
                            arr.push({"_id": mongoose.Types.ObjectId(item[i]._id), "name": item[i].name, "measure": item[i].measure, "price": item[i].price, "min": item[i].min, "max": item[i].max, "related": item[i].related, "productionPointId": item[i].productionPointId, "items": Utils.processItems(item[i].items, treatedProd)});
                            if(Object.keys(item[i].items).length == 0) {
                                if(i == Object.keys(item).length) {
                                    isTopLevel = true;
                                }
                            }
                        }
                    }
                    return arr;
                },*/
                childProcessItems: function(item, treatedProd, id){
                    var arr = [];
                    for(let i = 0; i < Object.keys(item).length; i++) {
                        let related = item[i].related ? mongoose.Types.ObjectId(item[i].related) : item[i].related;
                        arr.push({"_id": mongoose.Types.ObjectId(item[i]._id), "name": item[i].name, "measure": '-'+item[i].measure, "price": item[i].price, "min": item[i].min, "max": item[i].max, "related": related, "productionPointId": item[i].productionPointId, "items": Utils.childProcessItems(item[i].items, treatedProd)});

                        if(typeof item[i].related != 'undefined' && item[i].related != "" && item[i].related != null) {
                            let measure = Number(item[i].measure);

                            let unitPrice = treatedProd[item[i].related].price;
                            let subtotalPrice = unitPrice * measure;
                            stock.push({'productId': mongoose.Types.ObjectId(item[i].related), 'unitPrice': unitPrice, 'subtotalPrice': subtotalPrice, 'measure': '-'+measure, 'date': moment(date).toISOString(), 'outputType': 'sales', 'status': 0});
                        } else {
                            if(typeof item[i].measure != 'undefined' && item[i].name != ""){
                                console.log(item[i].measure, 'measure pendants');
                                var measure = "";
                                (item[i].measure == "") ? measure = 0 : measure = item[i].measure;
                                pendants.push({'name': item[i].name, 'measure': '-'+measure, 'date': date, 'menuItemId': mongoose.Types.ObjectId(id)});
                            }
                        }
                    }
                    return arr;
                },
                processItems: function(item, treatedProd) {
                    var arr = [];
                    for(let i = 0; i < Object.keys(item).length; i++) {
                        arr.push({"_id": mongoose.Types.ObjectId(item[i].itemId), "name": item[i].name, "quantity": item[i].qty, "unitPrice": item[i].price, "tableId": item[i].tableId, "observations": item[i].observations, "waiterId": item[i].waiterId, "items": Utils.childProcessItems(item[i].items, treatedProd, item[i].itemId)});
                    }
                    return arr;
                },
                getRelated: function(items) {
                    var arr = [];
                    for (let i = 0; i < Object.keys(items).length; i++) {
                        let cursor = items[i];
                        if(typeof cursor.related != 'undefined' && cursor.related != "" && cursor.related != null) {
                            arr.push(cursor.related);
                            relatedProducts.push(cursor.related);
                        }
                        if (Object.keys(cursor.items).length > 0) {
                            result = Utils.getRelated(cursor.items);
                            arr.push(result[0]);
                        }
                    }
                    return arr;
                }
            }
            Utils.getRelated(element.menuItems);
            if(Object.keys(relatedProducts).length > 0) {
                console.log(relatedProducts, 'relatedProducts');
                var products = await Products.find({'_id': {$in: relatedProducts}}).exec();
                for(let j = 0; j < products.length; j++){
                    treatedProducts[products[j]._id] = {'price': products[j].price, 'name': products[j].name};
                }
            }

            var saleId = await Sales.find({}).sort({_id:-1}).limit(1);
            var menuItems = Utils.processItems(element.menuItems, treatedProducts);
            console.log(JSON.stringify(menuItems), 'menuItems');
            console.log('stock', stock);
            console.log('pendants', pendants);
            if(Object.keys(saleId).length > 0) {
                saleNumber = saleId[0].saleId + 1;
            } else {
                saleNumber = 1;
            }

            var payments = [];
            var paidFalse = [];

            for(let k = 0; k < Object.keys(element.payment).length; k++) {
                if(element.payment[k] != null) {
                    if(typeof element.payment[k].paid != 'undefined') {
                        var isPaid = element.payment[k].paid.toString();
                        if(isPaid == 'false') {
                            paidFalse.push({'_id': mongoose.Types.ObjectId(element.payment[k]._id)})
                        }
                        payments.push({'_id': mongoose.Types.ObjectId(element.payment[k]._id), 'localCurrencyAmount': element.payment[k].localCurrencyAmount, 'amount': element.payment[k].amount, 'paid': isPaid});
                    }
                }
            }

            if(Object.keys(paidFalse).length == 0) {
                salesAccount = "311101";
            } else {
                var invoices = [];
                salesAccount = "311102";
                for(let j = 0; j < Object.keys(element.payment).length; j++) {
                    if(typeof element.payment[j].paid !== 'undefined') {
                        var isPaid = element.payment[j].paid.toString();

                        if(isPaid !== 'true') {
                            // todo crear un documento por lo que sobra de la venta
                            var timestamp = new Date().getTime();
                            invoices.push({'id': timestamp, 'documentNumber': saleNumber, 'date': moment(date).toISOString(), 'amount': element.payment[j].localCurrencyAmount, 'status': 0, 'expirationDate': moment().add(1, "M").toISOString(), 'observations': "Venda a prazo " +saleNumber+ " Data: "+moment(date).format("L")});
                            console.log(invoices);
                            var obj = {
                                businessPartnerId: businessPartnerId,
                                documentAmount: element.payment[j].localCurrencyAmount,
                                documentNumber: saleNumber,
                                invoices: invoices,
                                documentType: 1,
                                observations: "Venda a prazo "+saleNumber+ " Data: "+moment(date).format("L"),
                                transactionId: timestamp,
                                date: moment(date).toISOString(),
                                emissionDate: moment(date).toISOString(),
                                accountNumber: ""
                            }
                            Documents.insertMany(obj, (err, result) => {
                                if(err) return next(err);
                            });
                        }
                    }
                }
            }
            if(typeof element.discounts != 'undefined' && Object.keys(element.discounts).length > 0) {
                if(typeof element.discounts[0].amount != 'undefined') {
                    saleTotal = parseInt(element.total-element.discounts[0].amount);
                } else {
                    saleTotal = parseInt(element.total);
                }
            } else {
                saleTotal = parseInt(element.total);
            }

            if(element.salesType == 1) {
                tableId = mongoose.Types.ObjectId(tableId);
            }


            console.log(businessPartnerId, "businessPartnerId");
    

            /* validar en la creacion del usuario que no exista otro */
            sales.push({
                fiscal: element.fiscal,
                tableId: tableId,
                saleId: saleNumber,
                deliveryId: element.tableId,
                businessPartnerId: businessPartnerId || null,
                cashierId: cashierId,
                salesType: element.salesType,
                billType: element.billType,
                date: date,
                systemDate: element.systemDate,
                waiterId: element.waiterId,
                menuItems: menuItems,
                total: element.total,
                taxes: element.taxes,
                serviceTaxes: element.serviceTaxes,
                discounts: element.discounts,
                observations: element.observations,
                payment: payments
            });

            var localeMoment = moment(element.date);
            localeMoment.locale('pt-br');
            console.log(saleTotal, 'sale');
            /*cashflow.push({
                documentNumber: "",
                accountNumber: salesAccount,
                observations: [{description: "Vendas "+localeMoment.format('L')}],
                date: date,
                creditAmount: saleTotal,
                debitAmount: 0
            });

            cashflow.push({
                documentNumber: "",
                accountNumber: "313601",
                observations: [{description: "Taxa de Vendas "+localeMoment.format('L')}],
                date: date,
                creditAmount: element.serviceTaxes,
                debitAmount: 0
            });*/
        }
        var Sales = req.modelFactory.get('Sales');
        Sales.insertMany(sales, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            var Stock = req.modelFactory.get('Stock');
            Stock.insertMany(stock, (err, result) => {
                if(err) return next(err);
                var Pendants = req.modelFactory.get('Pendants');
                Pendants.insertMany(pendants, (err, result) => {
                    if(err) return next(err);
                    res.send({'status': 1});
                    req.onSend();
                });
            });
        });
    })();
}

exports.rollbackClosure = async function(req, res, next) {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    console.log(startDate);

    if(!startDate) return res.json({"status": 0, "message": "startDate was not setted on query parameter"});
    if(!endDate) return res.json({"status": 0, "message": "endDate was not setted on query parameter"});

    const Sales = req.modelFactory.get('Sales');
    const Cashflow = req.modelFactory.get('Cashflow');
    await Sales.updateMany({"date": {"$gte": moment(startDate).startOf('day').toDate(), "$lte": moment(endDate).endOf('day').toDate()}}, {$set: {"isProcessed": false}});
    
    var accountNumbers = ["331102", "331103", "331104", "331105", "331106", "331107", "112101", "311101", "331106", "334201"];
    await Cashflow.deleteMany({"date": {"$gte": moment(startDate).startOf('day').toDate(), "$lte": moment(endDate).endOf('day').toDate()}, "accountNumber": {"$in": accountNumbers}, "observation.description": {"$exists": true}, "observation.type": "closure"});

    res.send({"status": 1});
    req.onSend();
}

exports.delete = function(req, res, next) {
    var id = mongoose.Types.ObjectId(req.params.id);
    var Sales = req.modelFactory.get('Sales');
    Sales.update({'_id': id}, {$set: {status: 1}}, function(err, result){
        if(err) return next(err);
        res.send({'status': 1});
        req.onSend();
    });
}

exports.convert = (req, res, next) => {
    var Sales = req.modelFactory.get('Sales');
    (async () => {
        var sales = await Sales.find().exec();
        console.log(sales);
        for(let i = 0; i < Object.keys(sales).length; i++) {
            let data = sales[i];
            if(data.tableId != null) {
                tableId = mongoose.Types.ObjectId(data.tableId);
            } else {
                tableId = null;
            }


            console.log(data.tableId, 'tableId received');
            //await Sales.update({"_id": data.id}, {"$set": {"tableId": tableId}}).exec();
            //console.log("data");
        }
    })();

    /*Sales.find({}).exec().forEach(function(data){

        Sales.update({"_id": data.id}, {"$set": {"tableId": tableId}});
    });*/
}

exports.getDataReception = (req, res, next, callback) => {
    var queries = req.query;
    var startDate = moment(queries.startDate).startOf('day');
    var endDate = moment(queries.endDate).endOf('day');
    var type = queries.type;
    var salesType = queries.salesType;
    var waiterId = queries.waiterId;
    var tableId = queries.tableId;
    var isProcessed;

    var date = {"$match": {}};
    if(typeof(startDate && endDate) != 'undefined') {
        date["$match"] = {"date": {"$gte": startDate.toDate(), "$lte": endDate.toDate()}};
    }

    var salesMatch = {"$match": {}};
    if(typeof salesType != 'undefined') {
        salesMatch["$match"] = {"salesType": salesType};
    }

    var waiterMatch = {"$match": {}};
    if(typeof waiterId != 'undefined') {
        waiterMatch["$match"] = {"waiterId": mongoose.SchemaTypes.ObjectId(waiterId)}
    }

    var tablesMatch = {"$match": {}};
    if(typeof tableId != 'undefined') {
        tablesMatch["$match"] = {"tableId": mongoose.SchemaTypes.ObjectId(tableId)}
    }

    // open, closed
    if(type == 'open') {
        isProcessed = false;
    } else {
        isProcessed = true;
    }
    console.log(date);
    console.log(isProcessed);
    var Sales = req.modelFactory.get('Sales');
    Sales.aggregate(
        [
            tablesMatch,
            waiterMatch,
            salesMatch,
            date,
            {
                "$match": {"isProcessed": isProcessed}
            },
            {
                "$match": {"status": 0}
            },
            {
                "$lookup" : {
                    "from" : "Tables",
                    "localField" : "tableId",
                    "foreignField" : "_id",
                    "as" : "tables_docs"
                }
            },
            {
                "$lookup" : {
                    "from" : "Users",
                    "localField" : "cashierId",
                    "foreignField" : "_id",
                    "as" : "cashier_docs"
                }
            },
            {
                "$lookup" : {
                    "from" : "Users",
                    "localField" : "waiterId",
                    "foreignField" : "_id",
                    "as" : "waiter_docs"
                }
            },
            {"$sort": {"date" : -1}},
            {"$sort": {"date" : -1}},
            {
                "$project" : {
                    "table" : "$tables_docs.name",
                    "cashier" : {
                        "$arrayElemAt" : [
                            "$cashier_docs.username",
                            0
                        ]
                    },
                    "deliveryId": "$deliveryId",
                    "waiter" : {
                        "$arrayElemAt" : [
                            "$waiter_docs.username",
                            0
                        ]
                    },
                    "serviceTaxes" : "$serviceTaxes",
                    "discounts": 1,
                    "total": 1,
                    "payment": "$payment",
                    "date" : "$date"
                },
            },
            {
                "$project": {
                    "table": 1,
                    "cashier": 1,
                    "deliveryId": 1,
                    "waiter": 1,
                    "serviceTaxes": 1,
                    "discounts": 1,
                    "total": {"$cond": [ {"$ne": [ "$discounts", [] ] }, {"$subtract": ["$total", {"$arrayElemAt": ["$discounts.amount", 0]}]}, "$total"]},
                    "payment": 1,
                    "date": 1,
                }
            }
        ], (err, result) => {
        if(err) return next(err);
        callback(err, result);
    });
}

exports.acumulatedReception = async(req, res, next) => {
        var startDate = moment(req.query.startDate).startOf('day').toDate();
        var endDate = moment(req.query.endDate).endOf('day').toDate();
        var PaymentMethods = req.modelFactory.get('PaymentMethods');
        var payments = await PaymentMethods.find({status: 0}).sort({_id: -1}).exec();

        var date = {"$match": {}};
        if(typeof(startDate && endDate) != 'undefined') {
            date["$match"] = {"date": {$gte: new Date(startDate), $lt: new Date(endDate)}};
        }
        var Sales = req.modelFactory.get('Sales');
        var aggregate = await Sales.aggregate([
            {
                "$match": {"status": 0}
            },
            date,
            { 
                "$lookup" : {
                    "from" : "Tables", 
                    "localField" : "tableId", 
                    "foreignField" : "_id", 
                    "as" : "tables_docs"
                }
            }, 
            { 
                "$lookup" : {
                    "from" : "Users", 
                    "localField" : "cashierId", 
                    "foreignField" : "_id", 
                    "as" : "cashier_docs"
                }
            }, 
            { 
                "$lookup" : {
                    "from" : "Users", 
                    "localField" : "waiterId", 
                    "foreignField" : "_id", 
                    "as" : "waiter_docs"
                }
            }, 
            {"$sort": {"date" : -1}},
            { 
                "$project" : {
                    "table" : "$tables_docs.name", 
                    "cashier" : {
                        "$arrayElemAt" : [
                            "$cashier_docs.username", 
                            0
                        ]
                    },
                    "deliveryId": "$deliveryId",
                    "waiter" : {
                        "$arrayElemAt" : [
                            "$waiter_docs.username", 
                            0
                        ]
                    },
                    "serviceTaxes" : "$serviceTaxes", 
                    "discounts": 1,
                    "total": 1,
                    "payment": "$payment",
                    "date" : "$date"
                },
            },
            {
                "$project": {
                    "table": 1,
                    "cashier": 1,
                    "deliveryId": 1,
                    "waiter": 1,
                    "serviceTaxes": 1,
                    "discounts": 1,
                    "total": {"$cond": [ {"$ne": [ "$discounts", [] ] }, {"$subtract": ["$total", {"$arrayElemAt": ["$discounts.amount", 0]}]}, "$total"]},
                    "payment": 1,
                    "date": 1,
                }
            },
            {"$group": {
                "_id": "$date",
                "payment": {"$push": "$payment"},
                "total": {"$sum": "$total"},
                "serviceTaxes": {"$sum": "$serviceTaxes"}
            }},
            {"$unwind": "$payment"},
            {"$unwind": "$payment"},
            {"$group": {
                "_id": {
                    "id": "$_id",
                    "currency": "$payment._id",
                },
                "payment": {"$push": "$payment"},
                "total": {"$first": "$total"},
                "serviceTaxes": {"$first": "$serviceTaxes"}
            }},
            {"$sort": {"_id.id": -1}},
            {"$project": {
                "_id": 1,
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
                },
                "total": 1,
                "serviceTaxes": 1
            }},
            {"$group": {
                "_id": "$_id",
                "total": {"$first": "$total"},
                "serviceTaxes": {"$first": "$serviceTaxes"},
                "payed": {"$first": "$payed"},
                "unpayed": {"$first": "$unpayed"}
            }},
            {"$project": {
                "_id": 1,
                "total": 1,
                "serviceTaxes": 1,
                "currencyPayed": {"$sum": "$payed.amount"},
                "currencyUnpayed": {"$sum": "$unpayed.amount"},
                "payed": {"$sum": "$payed.localCurrencyAmount"},
                "unpayed": {"$sum": "$unpayed.localCurrencyAmount"}
            }},
            {"$group": {
                "_id": "$_id.id",
                "total": {"$first": "$total"},
                "serviceTaxes": {"$first": "$serviceTaxes"},
                "data": {"$push": {"currency": "$_id.currency", "payed": "$payed", "unpayed": "$unpayed", "currencyPayed": "$currencyPayed", "currencyUnpayed": "$currencyUnpayed"}}
            }}
        ]).exec();


        //console.log(JSON.stringify(aggregate), 'aggregate');

        var columns = {};

        //console.log(columns, 'pre columns');

        var final = [];

        aggregate.map(function(v, i){
            var columns = {};
            let acumulated = v;
            payments.map(function(value, index){
                columns[value._id] = {'name': value.name, 'amount': 0, 'amountUnpayed': 0, 'localCurrencyAmount': 0, 'localCurrencyAmountUnpayed': 0};
            });

            //console.log(columns, 'columns');

            let f = acumulated.data.reduce(function(acc, cur){
                acc[cur.currency].amount =  cur.currencyPayed || 0;
                acc[cur.currency].amountUnpayed = cur.currencyUnpayed || 0;
                acc[cur.currency].localCurrencyAmountUnpayed =  cur.unpayed || 0;
                acc[cur.currency].localCurrencyAmount = cur.payed || 0;
                return acc;
            }, columns);


            console.log(JSON.stringify(acumulated.data), 'acumulated');

            var t = acumulated.data.reduce(function(acc, cur){
                acc += cur.unpayed || 0;
                return acc;
            }, 0);

            final.push({"date": v._id, "methods": [f], "service": v.serviceTaxes, "unpayed": t, 'total': v.total });
        });

        //console.log(final, 'final');

        var subtotal = {};
        var currencyTotal = {};
3
        for(let key in payments) {
            subtotal[payments[key]._id] = 0;
            currencyTotal[payments[key]._id] = 0;
        }
        
        var html = `<html>
        <head>  
            <style>
                html {
                    zoom: 0.55;
                }
                body {
                    font-family: Arial;
                }
                @media print {
                    .header span {
                        font-size: 15px !import
                        ant;
                    }
                    table > thead > tr > th {
                        font-family: Arial; 
                        font-size: 14px;  
                        border: 1px solid black; 
                        border-width: 2px 0px 2px 0px
                    }
                        
                    table > tbody > tr > td > span { 
                        font-size: 14px !important;
                    }
                    tr.total {
                        margin-top: 30px;
                    }
                }
            </style>
        </head>
        <body>
        <div align="left" class="header">
                        <b style="font-family: Arial; font-size: 25px">Movimento Acumulado</b><br>
                        <span style="font-family: Arial">Data do Movimento ${moment(req.query.startDate).format('L')} ao ${moment(req.query.endDate).format('L')}</span>
                    </div>
                    <table align="center" width="100%">
                        <thead style="padding-bottom: 1em;">
                                <tr>
                                    <th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Data</th>
                                    ${payments.map(function(value, index){
                                        return '<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">'+value.name+'</th>';
                                    })}
                                    <th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Liquido</th>
                                    <th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">A Receber</th>
                                    <th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Total</th>
                                    <th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Serviços</th>
                                    <th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Total s/ Serv</th>       
                        </tr>
                            </thead>

        <tbody>
            `;
            final.map(function(value, index){
                //console.log(value, 'index');
                html += `<tr><td width="100" style="font-family: Arial; text-align: right" align="right">${moment(value.date).format("L")}</td>`;
                let methods = value.methods[0];
                //console.log(JSON.stringify(methods));
                for(var key in methods){
                    subtotal[key] += value.methods[0][key].localCurrencyAmount || 0;
                    currencyTotal[key] += parseFloat(value.methods[0][key].amount) || 0;

                    console.log(value.methods[0]);
                   
                    html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(value.methods[0][key].localCurrencyAmount).format('0,0.00')}</td>`;
                }
                console.log(value, 'value');
                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(Number(value.total)-Number(value.unpayed)).format('0,0.00')}</td>`;
                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(value.unpayed).format('0,0.00')}</td>`;
                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(value.total).format('0,0.00')}</td>`;
                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(value.service).format('0,0.00')}</td>`;
                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(Number(value.total)-Number(value.service)).format('0,0.00')}</td></tr>`;
            });
            
            console.log(currencyTotal, 'currencyTotal');
            /* html += `<tr><td width="100" style="font-family: Arial; text-align: right" align="right">${moment(methods[key]['date']).format("L")}</td>`;
            for(let k in methods[key]) {
                if(typeof methods[key][k].localCurrencyAmount != 'undefined') {
                    if(k != 'unpayed' && k != 'service' && k != 'total'){
                        currencyTotal[k] += methods[key][k].amount;
                        subtotal[k] += methods[key][k].localCurrencyAmount;
                        html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${methods[key][k].localCurrencyAmount}</td>`;
                    }   
                }
            }
            subtotal['totalwoservice'] += Number(methods[key]['total'])-Number(methods[key]['service']);
            subtotal['unpayed'] += methods[key]['unpayed'];
            subtotal['total'] += methods[key]['total'];
            subtotal['service'] += methods[key]['service'];
            subtotal['totalwounpayed'] += Number(methods[key]['total'])-Number(methods[key]['unpayed']);*/        
    
        html += `<tr><td  style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">TOTAL</b></td>`;
        for(let key in subtotal) {
            html += `<td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(subtotal[key]).format('0,0.00')}</b></td>`;
        }

        html += `</tr><tr>
            <td  align="right"><b style="text-transform: uppercase; font-family: Arial">P/M:</b></td>`;
            for(let key in currencyTotal) {
                html += `<td align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(currencyTotal[key]).format('0,0.00')}</b></td>`;
            }

        html += `
        </tr>
        </tbody>
        </table>
        </body>
        </html>`;


        try {

            /*pdf.create(html, options).toFile(function(err, result) {
                if (err) return console.log(err);
                S3Manager.uploadFromFile(result.filename, 'pdf/customers', function(err, data){ 
                    res.send(data);
                    req.onSend();
                });
            });*/
            var options = {
                    "html": html,
                    "paperSize": {format: 'Legal', orientation: 'portrait', border: '0.3in'}
                }

            pdf.convert(options, function(err, result) {
                var tmpPath = result.getTmpPath();
                console.log(tmpPath);
                S3Manager.uploadFromFile(tmpPath, 'pdf/reception-'+date+'-', function(err, data){ 
                    console.log(data, 'response');
                    res.send(data);
                    req.onSend();
                });
            });
        } catch(e) {
            return next(e);
        }
}

exports.receptionPdf = (req, res, next) => {
        this.getDataReception(req, res, next, (err, result) => {
            (async () => {
            var PaymentMethods = req.modelFactory.get('PaymentMethods');
            try {
                var paymentMethods = await PaymentMethods.find({"status": 0}).exec();
            } catch(e) {
                return next(e);
            }

            var Users = req.modelFactory.get('Users');

            var cashier = "";
            if(typeof req.query.cashierId != 'undefined') {
                var user = await Users.find({"_id": mongoose.Types.ObjectId(req.query.cashierId)}).exec();
                cashier = user[0].username;
            } else {
                cashier = "Todos";
            }



            var date = moment(req.query.startDate);
            var totalObj = {};
            for(let i = 0; i < Object.keys(paymentMethods).length; i++) {
                totalObj["tservice"] = 0;
                totalObj[paymentMethods[i]._id] = 0;
            }
            console.log(totalObj);
            var html = `<html>
            <head>
            <style>
            html {
                zoom: 0.55;
            }
            body {
                font-family: Arial;
            }
            @media print {
                .header span {
                    font-size: 15px !important;
                }
                table > thead > tr > th {
                    font-family: Arial;
                    font-size: 13px;
                    border: 1px solid black;
                    border-width: 2px 0px 2px 0px
                }

                table > tbody > tr > td > span {
                    font-size: 13px !important;
                }
                tr.total {
                    margin-top: 30px;
                }
            }
            </style>
            </head>
            <body>
            <table>
                <tr>
                    <td><b style="font-size: 30px; font-family: Arial" width="300">Fechamento Diario</b><br>
                    <span style="font-family: Arial">Data do Movimento ${date.format('L')}</span><br>
                    <b style="font-size: 16px; font-family: Arial" width="300">Operador: ${cashier}</b><br>
                    </td>
                </tr>
            </table><br><br>
            <table align="center" width="100%">
                <thead style="padding-bottom: 1em;">
                        <tr style="border: 1px solid black; border-width: 2px 0px 2px 0px; padding-bottom: 1em;">
                            <th  style="font-family: Arial; font-size: 12px; border: 1px solid black; border-width: 2px 0px 2px 0px;">Mesa / Cartão</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Tx. Serviço</th>`;
                            for(let i = 0; i < Object.keys(paymentMethods).length; i++) {
                                html += `<th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">${paymentMethods[i].name}</th>`
                            }
                        html += `</tr>
                </thead>
                <tbody>`;
                for(var index in result) {
                    html += `<tr>`;
                    html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${result[index].table ? result[index].table : "test"}</td>`;
                    html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(result[index].serviceTaxes).format('0,0.00')}</td>`;
                    totalObj["tservice"] += result[index].serviceTaxes;
                    for(let j = 0; j < Object.keys(result[index].payment).length; j++) {
                        let payment = result[index].payment[j];
                        //console.log(payment);
                        console.log(Object.keys(paymentMethods).length);
                        for(let i = 0; i < Object.keys(paymentMethods).length; i++) {

                            if(paymentMethods[i]._id.toString() == payment._id.toString()) {
                                console.log(i, 'column');
                                totalObj[payment._id] += payment.localCurrencyAmount;
                                console.log(payment.localCurrencyAmount, 'total');
                                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(payment.localCurrencyAmount).format('0,0.00')}</td>`;
                            } else {
                                console.log(i, 'column else');
                                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(0).format('0,0.00')}</td>`;
                            }
                        }
                    }
                    html += `</tr>`;
                }
                var totalGross = 0;
                var totalColspan = Object.keys(totalObj).length;
                html += `<tr><td style="border-top: 3px solid black; font-family: Arial"><b>Total:</b></td>`;
                for(var currency in totalObj) {
                    totalGross += totalObj[currency];
                    html += `<td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalObj[currency]).format('0,0.00')}</b></td>`;
                }
                html += `</tr>`;
                html += `
                <tr><td style="border-top: 3px solid black; font-family: Arial"><b>Bruto:</b></td><td style="border-top: 3px solid black" align="right" colspan="${totalColspan}"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalGross).format('0,0.00')}</b></td></tr>
                </tbody>
                </table>
                </body>
                </html>`;
                var options = {
                    "html": html,
                    "paperSize": {format: 'Legal', orientation: 'portrait', border: '0.3in'}
                }

                try {
                    pdf.convert(options, function(err, result) {
                        var tmpPath = result.getTmpPath();
                        console.log(tmpPath);
                        S3Manager.uploadFromFile(tmpPath, 'pdf/reception-'+date+'-', function(err, data){
                            console.log(data, 'response');
                            res.send(data);
                            req.onSend();
                        });
                    });
                } catch(e) {
                    return next(e);
                }
            })();
        });
        /*Sales.aggregate([
            date,
            {
                "$match": {
                    "status": 0
                }
            },
            {
                "$lookup": {
                    "from": "Tables",
                    "localField": "tableId",
                    "foreignField": "_id",
                    "as": "tables_docs"
                }
            },
            {
                "$lookup": {
                    "from": "Users",
                    "localField": "cashierId",
                    "foreignField": "_id",
                    "as": "cashier_docs"
                }
            },
            {
                "$lookup": {
                    "from": "Users",
                    "localField": "waiterId",
                    "foreignField": "_id",
                    "as": "waiter_docs"
                }
            },
            {
                "$sort": {
                    "date": -1
                }
            },
            {
                "$project": {
                    "table": "$tables_docs.name",
                    "cashier": {
                        "$arrayElemAt": [
                            "$cashier_docs.username",
                            0
                        ]
                    },
                    "deliveryId": "$deliveryId",
                    "waiter": {
                        "$arrayElemAt": [
                            "$waiter_docs.username",
                            0
                        ]
                    },
                    "serviceTaxes": "$serviceTaxes",
                    "discounts": 1,
                    "total": 1,
                    "payment": "$payment",
                    "date": "$date"
                },
            },
            {
                "$project": {
                    "table": 1,
                    "cashier": 1,
                    "deliveryId": 1,
                    "waiter": 1,
                    "serviceTaxes": 1,
                    "discounts": 1,
                    "total": {
                        "$cond": [{
                            "$ne": ["$discounts", []]
                        }, {
                            "$subtract": ["$total", {
                                "$arrayElemAt": ["$discounts.amount", 0]
                            }]
                        }, "$total"]
                    },
                    "payment": 1,
                    "date": 1,
                }
            },
            {
                "$unwind": "$payment"
            },
            {
                "$group": {
                    "_id": "$date",
                    "payment": {
                        "$push": "$payment"
                    },
                    "total": {
                        "$sum": "$total"
                    },
                    "serviceTaxes": {
                        "$sum": "$serviceTaxes"
                    }
                }
            },
            {
                "$unwind": "$payment"
            },
            {
                "$group": {
                    "_id": {
                        "id": "$_id",
                        "currency": "$payment._id",
                    },
                    "payment": {
                        "$push": "$payment"
                    },
                    "total": {
                        "$first": "$total"
                    },
                    "serviceTaxes": {
                        "$first": "$serviceTaxes"
                    }
                }
            },
            {
                "$sort": {
                    "_id.id": -1
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "payed": {
                        "$filter": {
                            "input": "$payment",
                            "as": "payed",
                            "cond": {
                                "$eq": ["$$payed.paid", "true"]
                            }
                        }
                    },
                    "unpayed": {
                        "$filter": {
                            "input": "$payment",
                            "as": "unpayed",
                            "cond": {
                                "$eq": ["$$unpayed.paid", "false"]
                            }
                        }
                    },
                    "total": 1,
                    "serviceTaxes": 1
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "total": 1,
                    "serviceTaxes": 1,
                    "payed": {
                        "$sum": "$payed.localCurrencyAmount"
                    },
                    "unpayed": {
                        "$sum": "$unpayed.localCurrencyAmount"
                    }
                }
            }
        ], (err, result) => {
            var grouped = result.reduce(function (r, a) {
                r[a._id.id] = r[a._id.id] || [];
                r[a._id.id].push({"date": a._id.id, "currency": a._id.currency, "total": a.total, "serviceTaxes": a.serviceTaxes, "payed": a.payed, "unpayed": a.unpayed});
                return r;
            }, Object.create({}));

            var results = [];
            var currencies = paymentMethods.map(item => {
                return {
                    currency: item._id,
                    name: item.name,
                    payed: 0,
                    unpayed: 0,
                    serviceTaxes: 0,
                    total: 0
                }
            });

            function process () {

                    for(date in grouped) {
                        let resulted = {date: date, data: JSON.parse(JSON.stringify(currencies))}
                        for (currency in resulted.data) {
                            filt = grouped[date].filter(curr => {
                                let currCurrency = resulted.data[currency]
                                return curr.currency == currCurrency.currency
                            })

                            if (filt.length > 0) {
                                resulted.data[currency].payed = filt[0].payed;
                                resulted.data[currency].unpayed = filt[0].unpayed;
                                resulted.data[currency].serviceTaxes = filt[0].serviceTaxes;
                            }else {
                                resulted.data[currency].payed = 0
                                resulted.data[currency].unpayed = 0;
                                resulted.data[currency].serviceTaxes = 0;
                            }
                        }

                        results.push(resulted);
                        if (results.length === Object.keys(grouped).length) {
                            console.log(JSON.stringify(results), 'results')
                        }
                    }
            }
            process();
            var html = `<html>
            <head>
                <style>
                    html {
                        zoom: 0.55;
                    }
                    body {
                        font-family: Arial;
                    }
                    @media print {
                        .header span {
                            font-size: 15px !important;
                        }
                        table > thead > tr > th {
                            font-family: Arial;
                            font-size: 14px;
                            border: 1px solid black;
                            border-width: 2px 0px 2px 0px
                        }

                        table > tbody > tr > td > span {
                            font-size: 14px !important;
                        }
                        tr.total {
                            margin-top: 30px;
                        }
                    }
                </style>
            </head>
            <body>
            <div align="left" class="header">
                <b style="font-family: Arial; font-size: 25px">Fechamento Diario</b><br>
                <span style="font-family: Arial">Data do Movimento ${moment(req.query.startDate).format('L')} ao ${moment(req.query.endDate).format('L')}</span>
            </div>
            <table align="center" width="100%">
                <thead style="padding-bottom: 1em;">
                    <tr>
                    <th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Data</th>`;
                    for(let i = 0; i < Object.keys(objMethods).length; i++) {
                        html += `<th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">${paymentMethods[i].name}</th>`
                    }
                    html += `<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Liquido</th>`;
                    html += `<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">A Receber</th>`;
                    html += `<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Total</th>`;
                    html += `<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Serviços</th>`;
                    html += `<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Total s/ Serv</th>`;
            html += `
                    </tr>
                </thead>
                <tbody>`
                //console.log(results);
                    for(var index in results) {
                        var unpayed = 0;
                        var total = 0;
                        var serviceTaxes = 0;
                        html += `<tr><td width="100" style="font-family: Arial; text-align: right" align="right">${moment(results[index].date).format("L")}</td>`;
                        for(let i = 0; i < Object.keys(results[index].data).length; i++) {
                            unpayed += results[index].data[i].unpayed;
                            total += results[index].data[i].payed;
                            if(results[index].data[i].serviceTaxes != 0) {
                                serviceTaxes = results[index].data[i].serviceTaxes;
                            }
                            html += `<td style="align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(results[index].data[i].payed).format('0,0.00')}</span></td>`;
                        }
                        html += `<td style="align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(Number(total)-Number(unpayed)).format('0,0.00')}</span></td>`;
                        html += `<td style="align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(Number(unpayed)).format('0,0.00')}</span></td>`;
                        html += `<td style="align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(Number(total)).format('0,0.00')}</span></td>`;
                        html += `<td style="align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(Number(serviceTaxes)).format('0,0.00')}</span></td>`;
                        html += `<td style="align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(Number(total)-Number(serviceTaxes)).format('0,0.00')}</span></td>`;
                        html += `</tr>`;
                    }
                    html += `
                </tbody>
            </table>
            </body>
            </html>`;
            res.send(html);
        });
    })();


    /*this.getDataReception(req, res, next, (err, result) => {
        var result = result;
        (async () => {
            var PaymentMethods = req.modelFactory.get('PaymentMethods');
            var objMethods = [];
            var methods = [];

            var paymentMethods = await PaymentMethods.find({status: 0}).sort({_id: -1}).exec();
            for(let i = 0; i < Object.keys(paymentMethods).length; i++) {
                objMethods[paymentMethods[i]._id] = {'name': paymentMethods[i].name, 'amount': 0, 'localCurrencyAmount': 0};
            }

            console.log(result, 'result');

            for(let j = 0; j < Object.keys(result).length; j++) {
                let resulted = result[j];
                var tempMethods = objMethods;
                tempMethods['table'] = resulted.table;
                tempMethods['unpayed'] = 0;
                tempMethods['service'] = 0;
                console.log(tempMethods, 'temp');
                for(let i = 0; i < Object.keys(resulted.payment).length; i++) {
                    let element = resulted.payment[i];

                    tempMethods[element._id].amount += element.amount;
                    tempMethods[element._id].localCurrencyAmount += element.localCurrencyAmount;
                    //tempMethods['unpayed'].localCurrencyAmount += element.unpayed;
                }

                tempMethods['total'] = resulted.total;
                tempMethods['service'].amount = resulted.serviceTaxes;
                //console.log(tempMethods, 'temp');
                methods.push(tempMethods);
            }

            var html = `<html>
            <head>
                <style>
                    html {
                        zoom: 0.55;
                    }
                    body {
                        font-family: Arial;
                    }
                    @media print {
                        .header span {
                            font-size: 15px !important;
                        }
                        table > thead > tr > th {
                            font-family: Arial;
                            font-size: 14px;
                            border: 1px solid black;
                            border-width: 2px 0px 2px 0px
                        }

                        table > tbody > tr > td > span {
                            font-size: 14px !important;
                        }
                        tr.total {
                            margin-top: 30px;
                        }
                    }
                </style>
            </head>
            <body>
            <div align="left" class="header">
                <b style="font-family: Arial; font-size: 25px">Fechamento Diario</b><br>
                <span style="font-family: Arial">Data do Movimento ${moment(req.query.startDate).format('L')} ao ${moment(req.query.endDate).format('L')}</span>
            </div>
            <table>
            <table align="center" width="100%">
                <thead style="padding-bottom: 1em;">
                        <tr>
                            <th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Data</th>`;
                            var subtotal = {};
                            var currencyTotal = {};
                            for(let key in methods[0]) {
                                subtotal[key] = 0;
                                currencyTotal[key] = 0;
                            }
                            delete currencyTotal['date'];
                            delete currencyTotal['unpayed'];
                            delete currencyTotal['total'];
                            delete currencyTotal['service'];

                            delete subtotal['date'];
                            delete subtotal['unpayed'];
                            delete subtotal['total'];
                            delete subtotal['service'];

                            Object.assign(subtotal, {'totalwoservice': 0, 'unpayed': 0, 'total': 0, 'service': 0, 'totalwounpayed': 0});

                            for(let i = 0; i < Object.keys(paymentMethods).length; i++) {
                                html += `<th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">${paymentMethods[i].name}</th>`
                            }
                            html += `<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Liquido</th>`;
                            html += `<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">A Receber</th>`;
                            html += `<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Total</th>`;
                            html += `<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Serviços</th>`;
                            html += `<th style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Total s/ Serv</th>`;

            html +=            `</tr>
                </thead>
            <tbody><tr>
            `;
                for(let key in methods) {
                    html += `<tr><td width="100" style="font-family: Arial; text-align: right" align="right">${moment(methods[key]['date']).format("L")}</td>`;
                    for(let k in methods[key]) {
                        if(typeof methods[key][k].localCurrencyAmount != 'undefined') {
                            if(k != 'unpayed' && k != 'service' && k != 'total'){
                                currencyTotal[k] += methods[key][k].amount;
                                subtotal[k] += methods[key][k].localCurrencyAmount;
                                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${methods[key][k].localCurrencyAmount}</td>`;
                            }
                        }
                    }
                    subtotal['totalwoservice'] += Number(methods[key]['total'])-Number(methods[key]['service']);
                    subtotal['unpayed'] += methods[key]['unpayed'];
                    subtotal['total'] += methods[key]['total'];
                    subtotal['service'] += methods[key]['service'];
                    subtotal['totalwounpayed'] += Number(methods[key]['total'])-Number(methods[key]['unpayed']);


                    html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(Number(methods[key]['total'])-Number(methods[key]['unpayed'])).format('0,0.00')}</td>`;
                    html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(methods[key]['unpayed']).format('0,0.00')}</td>`;
                    html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(methods[key]['total']).format('0,0.00')}</td>`;
                    html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(methods[key]['service']).format('0,0.00')}</td>`;
                    html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(Number(methods[key]['total'])-Number(methods[key]['service'])).format('0,0.00')}</td></tr>`;
                }

                html += `<tr><td  style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">TOTAL</b></td>`;
                for(let key in subtotal) {

                    html += `<td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(subtotal[key]).format('0,0.00')}</b></td>`;
                }
            html += `</tr><tr>
                    <td  align="right"><b style="text-transform: uppercase; font-family: Arial">P/M:</b></td>`;
                    for(let key in currencyTotal) {
                        html += `<td align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(currencyTotal[key]).format('0,0.00')}</b></td>`;
                    }

                html += `
                </tr>
                </tbody>
                </table>
                </body>
                </html>`;
            var options = {
                "html": html,
                "paperSize": {format: 'Legal', orientation: 'portrait', border: '0.3in'}
            }

            res.send(html);
            req.onSend();

            var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
            var endDate = moment(req.query.endDate).format('DD-MM-YYYY');

            /*pdf.convert(options, function(err, result) {
                var tmpPath = result.getTmpPath();
                console.log(tmpPath);
                S3Manager.uploadFromFile(tmpPath, 'pdf/reception-'+startDate+'-ao-'+endDate+'-', function(err, data){
                    console.log(data, 'response');
                    res.send(data);
                    req.onSend();
                });
            });
        })();
    });*/
}


exports.receptionPdfOld = (req, res, next) => {
    /**
     *  TO DO: Para una mejor version del total por moneda seria ideal que se pueda crear un array
     *  con una key unica por moneda, y luego += sumar cada una de las lineas que existan
     *
     */
    this.getDataReception(req, res, next, (err, result) => {
        var PaymentMethods = req.modelFactory.get('PaymentMethods');
        (async () => {
            var receptions = [];
            var totalCurrency = [];
            var paymentMethods = await PaymentMethods.find({}).exec();
            //var receptions = banks;
            if(err) {
                console.error(err);
                return next(err);
            }
            var totalAmount = 0;
            var total = [];
            var date = moment(req.query.startDate);
            let totalObj = {};
            totalObj['tservice'] = 0;
            paymentMethods.map(function(k, v) {
                totalObj[k.symbol] = 0;
            })
            total.push(totalObj);
            let = totalCurrencyObj = {};
            paymentMethods.map(function(k, v) {
                totalCurrencyObj[k.symbol] = 0;
            })
            totalCurrency.push(totalCurrencyObj);
            for(let i = 0; i < Object.keys(result).length; i++) {
                let obj = {};
                obj['table'] = result[i].table;
                obj['tservice'] = result[i].serviceTaxes;
                paymentMethods.map(function(k, v) {
                    obj[k.symbol] = 0;
                });
                receptions.push(obj);
                if(Array.isArray(result[i].payment)) {
                    for(let j = 0; j < Object.keys(result[i].payment).length; j++) {
                        var key = result[i].payment[j].method
                        receptions[i][key] += result[i].payment[j].localCurrency;
                        totalCurrency[0][key] += result[i].payment[j].amount;
                        //totalCurrency.push({[key]: result[i].payment.amount});
                    }
                } else {
                    var key = result[i].payment.method;
                    receptions[i][key] = result[i].payment.localCurrency;
                    totalCurrency[0][key] += result[i].payment.amount;
                    console.log(result[i].payment.amount, 'usd');
                }
            }
            //console.log(receptions);

            var html = `<html>
            <body>
            <table>
                <tr>
                    <td><b style="font-size: 30px; font-family: Arial" width="300">Fechamento Diario</b><br>
                    <span style="font-family: Arial">Data do Movimento ${date.format('L')}</span>
                    </td>
                </tr>
            </table><br><br><br>
            <table align="center">
                <thead style="padding-bottom: 1em;">
                        <tr style="border: 1px solid black; border-width: 2px 0px 2px 0px; padding-bottom: 1em;">
                            <th  style="font-family: Arial; font-size: 12px; border: 1px solid black; border-width: 2px 0px 2px 0px;">Mesa / Cartão</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Tx. Serviço</th>`;
                            for(let i = 0; i < Object.keys(paymentMethods).length; i++) {
                                html += `<th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">${paymentMethods[i].name}</th>`
                            }
                        html += `</tr>
                </thead>
            <tbody>`;
                receptions.map(function(v, k) {
                    //console.log('k', k, 'v', v);
                    html += `<tr>`;
                    for(var value in v) {
                        //console.log(value);
                        if(value == 'table') {
                            html += `<td width="100" style="font-family: Arial">Nº ${receptions[k][value]}</td>`;
                        } else {
                            total[0][value] += receptions[k][value];
                            //totalCurrency[value].push(receptions[k][value]);
                            html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(receptions[k][value]).format('0,0.00')}</td>`;
                        }
                    }
                    html += `</tr>`;
                });
                html += `<tr>
                <td style="border-top: 3px solid black; font-family: Arial"><b>Total:</b></td>`;
                total.forEach(element => {
                    for(var value in element) {
                        html += `<td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(element[value]).format('0,0.00')}</b></td>`;
                    }
                });
                html += `</tr><tr>
                <td style="border-top: 3px solid black; font-family: Arial" colspan="2"><b>Total na Moeda:</b></td>`;
                totalCurrency.forEach(element => {
                    for(var value in element) {
                        html += `<td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(element[value]).format('0,0.00')}</b></td>`;
                    }
                });
                html += `
                </tr>
                </tbody>
                </table>
                </body>
                </html>`;
                var options = {
                    "html": html,
                    "paperSize": {format: 'Legal', orientation: 'portrait', border: '0.3in'}
                }

                var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
                var endDate = moment(req.query.endDate).format('DD-MM-YYYY');

                res.send(html);

                /*pdf.convert(options, function(err, result) {
                    var tmpPath = result.getTmpPath();
                    var file = S3Manager.uploadFromFile(tmpPath, 'pdf/sales-'+startDate+'-ao-'+endDate+'-', function(err, data) {
                        res.send(data);
                        req.onSend();
                    });
                });*/
        })();
    });
}

exports.reception = (req, res, next) => {
    var queries = req.query;
    var startDate = queries.startDate;
    var endDate = queries.endDate;
    var type = queries.type;
    var isProcessed;
    limit = parseInt(queries.limit, 10);
    var page = queries.page;
    var date = {"$match": {}};
    if(typeof(startDate && endDate) != 'undefined') {
        date["$match"] = {"date": {$gte: new Date(startDate), $lt: new Date(endDate)}};
    }
    // open, closed
    if(type == 'closed') {
        isProcessed = true;
    } else {
        isProcessed = false;
    }
    console.log(isProcessed);
    var Sales = req.modelFactory.get('Sales');
    var aggregate = Sales.aggregate(
        [
            date,
            {"$sort": {"createdAt": -1}},
            {
                "$match": {"isProcessed": isProcessed}
            },
            {
                "$match": {"status": 0}
            },
            {
                "$lookup" : {
                    "from" : "Tables",
                    "localField" : "tableId",
                    "foreignField" : "_id",
                    "as" : "tables_docs"
                }
            },
            {
                "$lookup" : {
                    "from" : "Users",
                    "localField" : "cashierId",
                    "foreignField" : "_id",
                    "as" : "cashier_docs"
                }
            },
            {
                "$lookup" : {
                    "from" : "Users",
                    "localField" : "waiterId",
                    "foreignField" : "_id",
                    "as" : "waiter_docs"
                }
            },
            {
                "$project" : {
                    "table" : {
                        "$arrayElemAt" :["$tables_docs.name", 0] },
                    "cashier" : {
                        "$arrayElemAt" : [
                            "$cashier_docs.username",
                            0
                        ]
                    },
                    "salesType": "$salesType",
                    "deliveryId": "$deliveryId",
                    "waiter" : {
                        "$arrayElemAt" : [
                            "$waiter_docs.username",
                            0
                        ]
                    },
                    "total": {"$cond": [ {"$ne": [ "$discounts", [] ] }, {"$subtract": ["$total", {"$arrayElemAt": ["$discounts.amount", 0]}]}, "$total"]},
                    //"total": {"$cond": [ {"$ne": [ "$discounts", [] ] }, "$total", {"$subtract": ["$total", {"$arrayElemAt": ["$discounts.amount", 0]}]}]},
                    /*"total": {
                        "$subtract": ["$total", {"$cond": [ {"$discounts": {"$gt":{"$size": 0}}}, {"$arrayElemAt": ["$discounts.amount", 0]}, 0 ]}]
                    },*/
                    /*"total": {
                             "$subtract": ["$total", {"$cond": [ {"$ne": [ "$discounts", [] ] }, {"$arrayElemAt": ["$discounts.amount", 0]}, 0 ]}]
                       },*/
                    /*"total" : {
                        "$subtract": ["$total", {"$discounts": {"$cond": [{"$gt":{"$size": 0}}, {"$arrayElemAt": ["$discounts.amount", 0]}, 0]}}],
                    },*/
                    "serviceTaxes" : "$serviceTaxes",
                    "date" : "$date"
                }
            }
        ]);
    Sales.aggregatePaginate(aggregate, {page: page, limit: limit}, (err, result, pageCount, count) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        // Response with JSON in this standard format
        res.json({"docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount});
        // Close the connection
        req.onSend();
    });
}

exports.getSalesDelivery = (req, res, next) => {
    var Sales = req.modelFactory.get('Sales');
    var date = req.params.date;
    if(typeof date == 'undefined' | typeof date == 'null') {
        date = new Date("1995-02-02 00:00:00");
    }
    var aggregate = Sales.aggregate([
        {"$match": {"status": 0}},
        {"$match": {"created_at": { $gt: new Date(date) }}},
        {"$project": {
            "businessPartnerId": 1,
            "billType": 1,
            "total": 1,
            "salesType": 1,
            "serviceTaxes": 1,
            "discounts": 1,
            "observations": 1,
            "menuItems": 1,
            "payment": 1,
            "createdAt": 1
        }},
        {"$group": {
            "_id": null,
            "items": {"$push": {"businessPartnerId": "$businessPartnerId", "salesType": "$salesType", "billType": "$billType", "total": "$total", "serviceTaxes": "$serviceTaxes", "discounts": "$discounts", "observations": "$observations", "menuItems": "$menuItems", "payment": "$payment"}},
            "date": {"$max": "$createdAt"}
        }},
        {"$project": {
            "items": 1,
            "date": 1
        }}
    ], (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        req.onSend();
    });
}

exports.sync = (req, res, next) => {
    var localeMoment = moment();
    localeMoment.locale('en');
    var models = req.modelFactory.getModels('MenuItems', 'Users', 'Tables', 'PaymentMethods', 'MenuGroups', 'Enterprises', 'ProductionPoints', 'PDV');
    var today = localeMoment.format('dddd').toString().toLowerCase(); //moment('dddd').toString().toLowerCase();
    console.log(today);
    var MenuItems = req.modelFactory.get('MenuItems');
    var aggregate = MenuItems.aggregate(
        [
            {
                "$match": {
                    "hasDelivery": false
                }
            },
            {
                "$lookup" : {
                    "from" : "MenuGroups",
                    "localField" : "groupId",
                    "foreignField" : "_id",
                    "as" : "groups_docs"
                }
            },
            {
                "$lookup": {
                    "from": "ProductionPoints",
                    "localField": "productionPointId",
                    "foreignField": "_id",
                    "as": "production_points"
                }
            },
            {
                "$project" : {
                    "_id" : 1,
                    "groupName" : {
                        "$arrayElemAt" : [
                            "$groups_docs.name",
                            0
                        ]
                    },
                    "productionPointId": 1,
                    "groupId" : 1,
                    "description" : 1,
                    "internalId" : 1,
                    "name" : 1,
                    "price" : 1,
                    "imageUrl" : 1,
                    "items" : 1,
                    "status": 1,
                    "fiscalCSOSN": 1,
                    "fiscalNCM": 1,
                    "fiscalOrigin": 1,
                    "fiscalCSOSN": 1,
                    "fiscalCNAE": 1,
                    "fiscalAliquot": 1
                }
            }
        ], (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            menuItems = result;

            (async() => {
                var date = moment(req.body.date);
                var updateInitialize = [];

                var updateData = ["Users", "MenuItems", "MenuGroups", "Tables", "PaymentMethods", "Products", "ProductionPoints", "PDV", "Enterprises"];

                for(let i = 0; i < Object.keys(updateData).length; i++) {
                    let modelString = updateData[i];
                    let data = await req.modelFactory.get(modelString).find({updatedAt: {$gte: date.toDate()}}).exec();
                    updateInitialize[modelString] = data;
                }
                response = Object.assign({"date": moment().toDate(), "users": updateInitialize["Users"], "tables": updateInitialize["Tables"], "menuItems": updateInitialize["MenuItems"], "paymentMethods": updateInitialize["PaymentMethods"], "menuGroups": updateInitialize["MenuGroups"], "business": updateInitialize["Enterprises"], "productionPoints": updateInitialize["ProductionPoints"], "PDVs": updateInitialize["PDV"]});
                res.send(response);
                req.onSend();
            })();
        });
}


exports.initialize = (req, res, next) => {
    var localeMoment = moment();
    localeMoment.locale('en');
    var models = req.modelFactory.getModels('MenuItems', 'Users', 'Tables', 'PaymentMethods', 'MenuGroups', 'Enterprises', 'ProductionPoints', 'PDV');
    var tables, users, methods, menuGroups, menuItems, response;
    var today = localeMoment.format('dddd').toString().toLowerCase(); //moment('dddd').toString().toLowerCase();
    console.log(today);
    var MenuItems = req.modelFactory.get('MenuItems');
    var aggregate = MenuItems.aggregate(
        [
            {
                "$match" : {
                    "paused" : false
                }
            },
            {
                "$match": {
                    "hasDelivery": false
                }
            },
            {
                "$match": {
                    "days": {"$regex": today}
                }
            },
            {
                "$lookup" : {
                    "from" : "MenuGroups",
                    "localField" : "groupId",
                    "foreignField" : "_id",
                    "as" : "groups_docs"
                }
            },
            {
                "$lookup": {
                    "from": "ProductionPoints",
                    "localField": "productionPointId",
                    "foreignField": "_id",
                    "as": "production_points"
                }
            },
            {
                "$project" : {
                    "_id" : 1,
                    "groupName" : {
                        "$arrayElemAt" : [
                            "$groups_docs.name",
                            0
                        ]
                    },
                    "productionPointId": 1,
                    "groupId" : 1,
                    "description" : 1,
                    "internalId" : 1,
                    "name" : 1,
                    "price" : 1,
                    "imageUrl" : 1,
                    "items" : 1,
                    "status": 1,
                    "fiscalCSOSN": 1,
                    "fiscalNCM": 1,
                    "fiscalOrigin": 1,
                    "fiscalCSOSN": 1,
                    "fiscalCNAE": 1,
                    "fiscalAliquot": 1
                }
            }
        ], (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            menuItems = result;
            (async() => {
                var promiseInitialize = [];

                var initData = ["Users", "MenuGroups", "Tables", "PaymentMethods", "Enterprises", "ProductionPoints", "PDV"];
                promiseInitialize[0] = {"MenuItems": menuItems};
                for(let i = 1; i < Object.keys(initData).length; i++) {
                    let modelString = initData[i];
                    let data = await req.modelFactory.get(modelString).find({status: 0}).exec();
                    promiseInitialize[modelString] = data;
                }
                response = Object.assign({"date": moment().toDate(), "users": promiseInitialize["Users"], "tables": promiseInitialize["Tables"], "menuItems": promiseInitialize["MenuItems"], "menuGroups": promiseInitialize["MenuGroups"], "business": promiseInitialize["Enterprises"], "productionPoints": promiseInitialize["ProductionPoints"], "PDVs": promiseInitialize["PDV"], "paymentMethods": promiseInitialize["PaymentMethods"]});
                res.send(response);
                req.onSend();
            })();
        });
}

exports.salesMenus = (req, res, next) => {
    var startDate = moment(req.query.startDate).startOf('day');
    var endDate = moment(req.query.endDate).endOf('day');
    var Sales = req.modelFactory.get('Sales');
    Sales.aggregate([
        {"$match": {"date": {'$gte': startDate.toDate(), '$lte': endDate.toDate()}}},
        {"$match": {"isProcessed": true}},
        {"$unwind": "$menuItems"},
        {"$project":
            {
                "_id": "$menuItems._id",
                "name": "$menuItems.name",
                "date": "$date",
                "amount": "$menuItems.quantity",
                "subtotal": {"$multiply": ["$menuItems.quantity", "$menuItems.unitPrice"]}
            }
        },
        {"$lookup": {"from": "MenuItems", "localField": "_id", "foreignField": "_id", "as": "menus_docs"}},
        {"$project":
            {
                "_id": 1,
                "name": 1,
                "subtotal": 1,
                "amount": 1,
                "groupId": {"$arrayElemAt": ["$menus_docs.groupId", 0]}
            }
        },
        {"$group":
            {
                "_id": "$_id",
                "name": {"$first": "$name"},
                "groupId": {"$first": "$groupId"},
                "subtotal": {"$sum": "$subtotal"},
                "amount": {"$sum": "$amount"}
            }
        },
        {"$lookup": {"from": "MenuGroups", "localField": "groupId", "foreignField": "_id", "as": "groups_docs"}},
        {"$group":
              {
                    "_id": "$groupId",
                    "groupName": {"$first": "$groups_docs.name"},
                    "subtotal": {"$sum": "$subtotal"},
                    "items": {"$push": {"_id": "$_id", "name": "$name", "amount": "$amount", "subtotal": "$subtotal"}}
              }
        },
        {"$project":
            {
               "_id": 1,
               "name": {"$arrayElemAt": ["$groupName", 0]},
               "subtotal": 1,
               "products": "$items"
            }
        }
    ], (err, result) => {
        if(err) return next(err);
        var total = 0;
        var html = `<html>
        <head>
            <style>
            body {
                font-family: 'Arial';
            }

            html {
                zoom: 0.55;
            }

            .subtotal {
                padding-top: 7px;
                padding-bottom: 7px;
                font-size: 17px;
                border-bottom: 2px solid black !important
            }

            @media print {

                .subtotal {
                    padding-top: 7px;
                    padding-bottom: 7px;
                    border-bottom: 2px solid black !important;
                    font-size: 17px
                }

                .first {
                    padding-top: 0.6em !important;
                }

                .second, .third, .fourth {
                    padding-top: 0.6em !important;
                    padding-bottom: 0.6em !important;
                }

                .first > span {
                    font-family: Arial;
                    font-weight: bold;
                    color: red;
                    font-size: 0.7em !important;
                }

                .second > span  {
                    font-family: Arial;
                    font-weight: bold;
                    color: blue;
                    font-size: 0.7em !important;
                }

                .third > span {
                    font-family: Arial;
                    font-weight: bold;
                    color: green;
                    font-size: 0.7em !important;
                }

                .fourth > span {
                    font-family: Arial;
                    font-weight: bold;
                    color: brown;
                    font-size: 0.7em !important;
                }

                .default > span {
                    font-family: Arial;
                    color: black;
                    font-size: 14px;
                }
            }
            </style>
        </head>
        <body>
        <div align="left">
            <b style="font-family: Arial; font-size: 20px">Produtos Vendidos No Periodo</b><br>
            <span style="font-family: Arial; font-size: 17px">Periodo: ${moment(req.query.startDate).format("L")} ao ${moment(req.query.endDate).format("L")}</span><br><br>
        </div>
        <table align="center" width="100%">
            <thead style="padding-bottom: 1em;">
                    <tr style="border: 1px solid black; border-width: 2px 0px 2px 0px; padding-bottom: 1em;">
                        <th  style="font-family: Arial; font-size: 15px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Descrição</th>
                        <th  style="font-family: Arial; font-size: 15px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">Saídas</th>
                        <th  style="font-family: Arial; font-size: 15px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">Preço</th>
                        <th  style="font-family: Arial; font-size: 15px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">Total</th>
                    </tr>
            </thead>
        <tbody>
        <tr></tr>`;
        result.forEach(element => {
            var average = 0;
            html += `
                <tr>
                    <td width="250"><b style="font-size: 15px">Grupo ${element.name}</b></td>
                    <td width="90" colspan="3"></td>
                </tr>`;
            let j = 0;
            element.products.forEach(items => {
                console.log(items);
                var background;
                if(j % 2 == 0){
                    background = "#CCC";
                } else{
                    background = "#FFF";
                }

                average = items.subtotal / Math.abs(items.amount);
                html += `
                <tr style="background-color: ${background}; PAGE-BREAK-AFTER: always" cellspacing="0">
                    <td width="250" style="font-size: 15px">${items.name}</td>
                    <td width="90" align="right" style="font-size: 15px">${Math.abs(items.amount)}</td>
                    <td width="90" align="right" style="font-size: 15px">${numeral(average).format('0,0.00')}</td>
                    <td width="90" align="right" style="font-size: 15px"><b>${numeral(items.subtotal).format('0,0.00')}</b></td>
                </tr>`;
                j++;
            });
            total += element.subtotal;
            html += `
                <tr>
                    <td width="250" colspan="4" class="subtotal" align="right"><b>${numeral(element.subtotal).format('0,0.00')}</b></td>
                </tr>`;
        });
        html += `<tr>
        <td width="250" colspan="4" class="subtotal" align="right"><b>TOTAL: ${numeral(total).format('0,0.00')}</b></td>
        </tr>
        </table>`;
        var options = {
            "html": html,
            "paperSize": {format: 'Legal', orientation: 'portrait', border: '0.3in'}
        }

        var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
        var endDate = moment(req.query.endDate).format('DD-MM-YYYY');


        pdf.convert(options, function(err, result) {
            var tmpPath = result.getTmpPath();
            console.log(tmpPath);
            S3Manager.uploadFromFile(tmpPath, 'pdf/sales-'+startDate+'-ao-'+endDate+'-', function(err, data){
                console.log(data, 'response');
                res.send(data);
                req.onSend();
            });
        });
    });
}


exports.getSalesCustomerReport = async(req, res, next) => {
    var startDate = moment(req.query.startDate).startOf('day').toDate();
    var endDate = moment(req.query.endDate).endOf('day').toDate();
    var Sales = req.modelFactory.get('Sales');
    var date = {"$match": {}};
        if(typeof(startDate && endDate) != 'undefined') {
        date["$match"] = {"date": {$gte: new Date(startDate), $lt: new Date(endDate)}};
        var sales = await Sales.aggregate([
            {"$match": {"status": 0}},
            {"$match": {"isProcessed": true}},
            date,
            {"$group": {
                "_id": "$waiterId",
                "customers": {"$sum": 1},
                "total": {"$sum": "$total"}
            }},
            {"$lookup": {"from": "Users", "localField": "_id", "foreignField": "_id", "as": "users_docs"}},
            {"$project": {
                "total": "$total",
                "customers": "$customers",
                "waiterName": {"$arrayElemAt": ["$users_docs.name", 0]}
            }}
        ]).exec();

        var html = `<html>
        <head>
            <style>
                html {
                    zoom: 0.55;
                }
                body {
                    font-family: Arial;
                }
                @media print {
                    .header span {
                        font-size: 15px !import
                        ant;
                    }
                    table > thead > tr > th {
                        font-family: Arial;
                        font-size: 14px;
                        border: 1px solid black;
                        border-width: 2px 0px 2px 0px
                    }

                    table > tbody > tr > td > span {
                        font-size: 14px !important;
                    }
                    tr.total {
                        margin-top: 30px;
                    }
                }
            </style>
        </head>
        <body>
            <table align="center" width="100%">
            <tbody>`;
            var total = 0;
            var totalCustomers = 0;
            sales.map(function(value, index){
                //console.log(value, 'index');
                total += value.total;
                totalCustomers += value.customers;
                console.log(value, 'value');
                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${value.waiterName || "Mostrador"}</td>`;
                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${numeral(value.total).format('0,0.00')}</td>`;
                html += `<td width="100" style="font-family: Arial; text-align: right" align="right">${value.customers}</td></tr>`;
            });
            html += `</tbody>
            </table>
            <table width="100%"><tbody>
            `
            html += `<tr><td width="100" style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial; font-size: 20px">TOTAL</b></td>`;
            html += `<td width="100" style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial; font-size: 20px">${numeral(total).format('0,0.00')}</b></td>`;
            html += `<td width="100" style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial; font-size: 20px">${totalCustomers}</b></td></tr>`;
            html += `</tbody></table>`;
            var options = {
                "html": html,
                "paperSize": {format: 'A5', orientation: 'portrait', border: '0.3in'}
            }


            /*var options = {
                "format": "A6",
                "border": "0.2in",
                "header": {
                    "height": "0.7in",
                    "contents": `<div align="left" class="header">
                            <b style="font-family: Arial; font-size: 25px">Vendas P/ Usuarios e Clientes Atendidos</b><br>
                            <span style="font-family: Arial">Data do Movimento ${moment(req.query.startDate).format('L')} ao ${moment(req.query.endDate).format('L')}</span>
                        </div>
                        <table align="center" width="100%">
                        <thead>
                                <tr>
                                    <th width="100">Garçom</th>
                                    <th width="100">Total Vendas</th>
                                    <th width="100">Clientes Atendidos</th>
                                </tr>
                        </thead>
                        </table>`
                }
            }*/
            
            try {

                /*pdf.create(html, options).toFile(function(err, result) {
                    if (err) return console.log(err);
                    S3Manager.uploadFromFile(result.filename, 'pdf/customers', function(err, data){
                        res.send(data);
                        req.onSend();
                    });
                });*/
                pdf.convert(options, function(err, result) {
                    var tmpPath = result.getTmpPath();
                    console.log(tmpPath);
                    S3Manager.uploadFromFile(tmpPath, 'pdf/customers-'+date+'-', function(err, data){
                        console.log(data, 'response');
                        res.send(data);
                        req.onSend();
                    });
                });
            } catch(e) {
                return next(e);
            }
    }
}


/*
exports.changeDate = (req, res, next) => {
        /*
            [x] Realizar la salida del stock
            [x] Lanzar CMV correspondiente por Grupo de Producto
        */
/*      var params = req.body.stock;
        var previousDate = req.body.date;
        var newDate = moment(previousDate).add(1, 'd');
        var transactionId = new Date().getTime();
        var cost;
        for (let index = 0; index < params.length; index++) {
            let element = array[index];
            stock.push({'productId': element.productId, 'quantity': element.quantity, 'measure': element.measure, 'transactionId': transactionId});
        }
        var cmvStock = [];
        var cashflow = [];
        var Stock = req.modelFactory.get('Stock');
        var aggregate = Stock.aggregate([
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
                    "cond": {$gt: ["$$product.quantity", 0]}
              }}
            }},
            {"$project": {
                "_id": 1,
                "products": 1,
                "quantity": {"$sum": "$products.quantity"}
            }},
            {"$project":
            {"products": {
                "$slice": ["$products", 6]
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
        ], (err, result) => {
            /* merge cost with stock */
/*            cost = result;
            let totalStockCashflow;
            for (let i = 0; i < stock.length; i++) {
                let element = stock[i];
                for (let j = 0; j < cost.length; j++) {
                    let childElement = cost[j];
                    if(stock[i].productId == cost[j]._id) {
                        let subtotal = stock[i].quantity*cost[j].costPrice;
                        totalStockCashflow += subtotal;
                        cmvStock.push({'menuGroupId': stock[i].menuGroupId, 'productId': stock[i].productId, 'subtotal': subtotal})
                    }
                }
                stock.push({'productId': element.productId, 'quantity': -Math.abs(element.quantity), 'measure': element.measure, 'transactionId': transactionId});
            }
            cashflow.push({'documentNumber': '', 'accountNumber': '113101', 'observations': 'Saida de Produtos em Venda', 'creditAmount': totalStockCashflow, 'debitAmount': 0, 'date': previousDate});
        });

        Stock.insertMany(treatedStock, (err, result) => {
            if(err) return next(err);
            var cmv = cmvStock.reduce(function(res, obj) {
                if (!(obj.menuGroupId in res))
                    res.__array.push(res[obj.menuGroupId] = obj);
                else {
                    res[obj.menuGroupId].quantity += obj.quantity;
                    res[obj.menuGroupId].subtotal += obj.subtotal;
                }
                return res;
            }, {__array:[]}).__array.sort(function(a,b) { return b.menuGroupId - a.menuGroupId});

            var productGroups = req.modelFactory.get('ProductGroups', (err, result) => {
                let groups = result;
                groups.map(function(e, i) {
                    cmv.map(function(j, k) {
                        if(e._id == j.menuGroupId) {
                            cashflow.push({'documentNumber': '', 'accountNumber': e.accountNumber, 'observations': 'CMV Venda', 'creditAmount': 0, 'debitAmount': j.subtotal, 'date': previousDate});
                        }
                    });
                });
            });

            var Cashflow = req.modelFactory.get('Cashflow');
            Cashflow.insertMany(cashflow, (err, result) => {
                if(err) return next(err);
                res.send({'status': 1, 'newDate': newDate});
                req.onSend();
            });
        });
}*/

exports.getAmountCashier = async (req, res, next) => {
    console.log('llego');
    var startDate = req.query.startDate;
    var endDate = req.query.endDate;
    var cashierId = req.params.cashierId;
    var Sales = req.modelFactory.get('Sales');
    var paid = await Sales.aggregate([
        {"$match": {"status": 0, "payment.paid": "true"}},
        {"$match": {"date": {'$gte': new Date(startDate), '$lte': new Date(endDate)}}},
        {"$unwind": "$payment"},
        {"$match": {"cashierId": mongoose.Types.ObjectId(cashierId)}},
        {"$lookup": {"from": "PaymentMethods", "foreignField": "_id", "localField": "payment._id", "as": "methods_docs"}},
        {"$group": {
            "_id":  "$payment._id",
            "amount": {"$sum": "$payment.amount"},
            "method": {"$first": "$methods_docs.name"}
        }},
        {"$project": {
            "amount": 1,
            "method": 1
        }},
        {"$project": {
            "amount": 1,
            "method": {"$arrayElemAt": ["$method", 0]}
        }}
    ]).exec();

    var not_paid = await Sales.aggregate([
        {"$match": {"status": 0, "payment.paid": "false"}},
        {"$match": {"date": {'$gte': new Date(startDate), '$lte': new Date(endDate)}}},
        {"$unwind": "$payment"},
        {"$match": {"cashierId": mongoose.Types.ObjectId(cashierId)}},
        {"$lookup": {"from": "PaymentMethods", "foreignField": "_id", "localField": "payment._id", "as": "methods_docs"}},
        {"$group": {
            "_id":  "$payment._id",
            "amount": {"$sum": "$payment.amount"},
            "method": {"$first": "$methods_docs.name"}
        }},
        {"$project": {
            "amount": 1,
            "method": 1
        }},
        {"$project": {
            "amount": 1,
            "method": {"$arrayElemAt": ["$method", 0]}
        }}
    ]).exec();

    res.send(paid.concat(not_paid.map((item) => {
        item.method = `${item.method} (a receber)`;
        return item;
    })));

    req.onSend();
}


/*
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
   /*
    var cashierId = req.params.cashierId;
    if(typeof req.body.date == 'undefined') {
        return next(new Error("There isn't any property called date in the JSON sended. Please send a date property with a valid date"));
    }
    var date = moment(req.body.date).toDate();
    var params = req.body;
    var Sales = req.modelFactory.get('Sales');

    var startDate = moment(req.body.date).startOf('day').toDate();
    var endDate = moment(req.body.date).endOf('day').toDate();

    Sales.aggregate([
        {"$match": {"isProcessed": false}},
        {"$match": {"cashierId": mongoose.Types.ObjectId(cashierId)}},
        {"$match": {"date":  {'$gte': startDate, '$lte': endDate}}},
        {"$unwind": "$payment"},
        {"$group": {
            "_id": null,
            "serviceTaxes": {"$addToSet": "$serviceTaxes"},
            "payment": {"$addToSet": "$payment"}
        }},
        {"$group": {
            "_id": null,
            "serviceTaxes": {"$first": "$serviceTaxes"},
            "payment": {"$first": "$payment"}

        }},
        {"$project": {
            "serviceTaxes": {
                "$reduce": {
                    "input": "$serviceTaxes",
                    "initialValue": 0,
                    "in": {"$add": ["$$value", "$$this"]}
                }
            },
            "payment": 1
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
        if(Object.keys(processedResult).length == 0) {
            res.send({'status': 0});
            req.onSend();
        } else {
            var PaymentMethods = req.modelFactory.get('PaymentMethods').find({}, (err, result) => {
                (async () => {
                    var cashflow = [];
                    var methodPayments = [];
                    var netTotal = 0;
                    // Agregar el total de vendas creditAmount
                    for(let j = 0; j < result.length; j++) {
                        methodPayments[result[j]._id] = {"name": result[j].name, "accountNumber": result[j].accountNumber, 'currencyAccount': result[j].currencyAccount};
                    }

                    netTotal = (processedResult[0].payed - processedResult[0].serviceTaxes);
                    (params.lack < 0) ? netTotal = netTotal - Math.abs(params.lack) : netTotal = netTotal + Math.abs(params.lack);
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
                        creditAmount: netTotal,
                        //creditAmount: (netTotal - lack - parseFloat(processedResult[0].serviceTaxes)),
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

                    var cmv = await req.modelFactory.get('Stock').aggregate([
                        {"$match": {"measure": {"$lt": 0}}},
                        {"$match": {"date": {"$gte": startDate, "$lte": endDate}}},
                        {"$project": {
                            "amount": {"$multiply": ["$unitPrice", "$measure"]},
                        }},
                        {"$group": {
                            "_id": null,
                            "amount": {"$sum": "$amount"}
                        }}
                    ]).exec();

                    if(Object.keys(cmv).length > 0) {
                        var obj = {
                            amount: cmv[0].amount,
                            date: date,
                            status: 0
                        }
                        var cmv = new req.modelFactory.getModels('CMV').CMV(obj);
                        cmv.save(function(err, results){
                            if(err) {
                                console.error(err);
                                return next(err);
                            }
                        })
                    }

                    await req.modelFactory.get('Cashflow').insertMany(cashflow, (err, result) => {
                        if(err) return next(err);
                    });
                    console.log('startDate: ', startDate, 'endDate: ',endDate);
                    await req.modelFactory.get('Sales').updateMany({'isProcessed': false, "date":  {'$gte': startDate, '$lte': endDate}}, {"$set": {"isProcessed": true}}, (err, result) => {
                        if(err) return next(err);
                        res.send({'status': 1, "lack": Number(params.lack), "netTotal": processedResult[0].payed + processedResult[0].unpayed - (params.lack * -1)});
                        req.onSend();
                    });
                })();
            });
        }
    });
}*/


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
    var cashierId = req.params.cashierId;
    if(typeof req.body.date == 'undefined') {
        return next(new Error("There isn't any property called date in the JSON sended. Please send a date property with a valid date"));
    }
    var date = moment(req.body.date).toDate();
    var params = req.body;
    var Sales = req.modelFactory.get('Sales');

    var startDate = moment(req.body.date).startOf('day').toDate();
    var endDate = moment(req.body.date).endOf('day').toDate();

    console.log(startDate, 'date');
    console.log(endDate, 'endDate');

    Sales.aggregate([
        {"$match": {"isProcessed": false}},
        {"$match": {"cashierId": mongoose.Types.ObjectId(cashierId)}},
        {"$match": {"date":  {'$gte': startDate, '$lte': endDate}}},
        {"$project": {
            "discounts": {"$arrayElemAt": ["$discounts.amount", 0]},
            "serviceTaxes": 1,
            "payment": 1,
        }},
        {"$unwind": "$payment"},
        {"$group": {
            "_id": null,
            "discounts": {"$addToSet": "$discounts"},
            "serviceTaxes": {"$addToSet": "$serviceTaxes"},
            "payment": {"$addToSet": "$payment"}
        }},
        {"$group": {
            "_id": null,
            "serviceTaxes": {"$first": "$serviceTaxes"},
            "payment": {"$first": "$payment"},
            "discounts": {"$first": "$discounts"}
        }},
        {"$project": {
            "serviceTaxes": {
                "$reduce": {
                    "input": "$serviceTaxes",
                    "initialValue": 0,
                    "in": {"$add": ["$$value", "$$this"]}
                }
            },
            "discounts": {"$sum": "$discounts"},
            "payment": 1
        }},
        {"$project": {
            "_id": 1,
            "serviceTaxes": 1,
            "discounts": 1,
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
            "discounts": 1,
            "payed": {"$sum": "$payed.localCurrencyAmount"},
            "unpayed": {"$sum": "$unpayed.localCurrencyAmount"}
        }}
    ], (err, result) => {
        console.log(result, 'result');
        var salesResults = result;
        if(Object.keys(salesResults).length == 0) {
            console.log('resultados');
        } else {
            (async () => {
                var cashflow = [];
                var methodPayments = [];
                var paymentsAmount = 0;
                var totalSalesAmount = salesResults[0].total;
                var paymentMethods = await req.modelFactory.get('PaymentMethods').find({}).exec();
                for(let j = 0; j < Object.keys(paymentMethods).length; j++) {
                    methodPayments[paymentMethods[j]._id] = {"name": paymentMethods[j].name, "accountNumber": paymentMethods[j].accountNumber, 'currencyAccount': paymentMethods[j].currencyAccount};
                }

                console.log('paso PaymentMethods');

                for(let j = 0; j < Object.keys(params.payments).length; j++) {
                    let element = params.payments[j];
                    
                    var localeMoment = moment(date);
                    localeMoment.locale('pt-br');

                    if(element.paid == true) {
                        cashflow.push({
                            documentNumber: "",
                            accountNumber: methodPayments[element._id].accountNumber,
                            observations: [{"type": "closure", "userId": cashierId, "description": "Venda "+localeMoment.format('L')+" ("+methodPayments[element._id].name+")"}],
                            date: date,
                            creditAmount: 0,
                            debitAmount: element.localCurrencyAmount
                        });  
                    } else {
                        cashflow.push({
                            documentNumber: "",
                            accountNumber: "112101",
                            observations: [{
                                type: "closure",
                                description: "Vendas a Receber "  + moment(date).format("L")
                            }],
                            date: date,
                            creditAmount: 0,
                            debitAmount: element.localCurrencyAmount
                        });

                        cashflow.push({
                            documentNumber: "",
                            accountNumber: "311102",
                            observations: [{
                                type: "closure",
                                description: "Vendas a Receber "  + moment(date).format("L")
                            }],
                            date: date,
                            creditAmount:  element.localCurrencyAmount,
                            debitAmount: 0
                        });
                    }


                    console.log(methodPayments[element._id], 'payment');

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

                var amountTotal = salesResults[0].payed - salesResults[0].discounts - salesResults[0].serviceTaxes;


                cashflow.push({
                    documentNumber: "",
                    accountNumber: "311101",
                    observations: [{
                        type: "closure",
                        description: "Vendas a Vista Caixa " + moment(date).format("L")
                    }],
                    date: date,
                    creditAmount: amountTotal,
                    debitAmount: 0
                });

                cashflow.push({
                    documentNumber: "",
                    accountNumber: "311102",
                    observations: [{
                        type: "closure",
                        description: "Venda a Prazo "  + moment(date).format("L")
                    }],
                    date: date,
                    creditAmount: salesResults[0].unpayed,
                    debitAmount: 0
                });

                cashflow.push({
                    documentNumber: "",
                    accountNumber: "331106",
                    observations: [{"type": "closure", "userId": cashierId, "description": "Desconto Venda "+localeMoment.format('L')}],
                    date: date,
                    creditAmount: salesResults[0].discounts,
                    debitAmount: 0
                })
                cashflow.push({
                    documentNumber: "",
                    accountNumber: "331106",
                    observations: [{"type": "closure", "userId": cashierId, "description": "Desconto Venda "+localeMoment.format('L')}],
                    date: date,
                    creditAmount: 0,
                    debitAmount: salesResults[0].discounts
                })

                cashflow.push({
                    documentNumber: "",
                    accountNumber: "313601",
                    observations: [{type: "closure", description: "Taxa de Vendas "+moment(date).format('L')}],
                    date: date,
                    creditAmount: salesResults[0].serviceTaxes,
                    debitAmount: 0
                });


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


                console.log('hasta aqui llego CMV');

                var cmv = await req.modelFactory.get('Stock').aggregate([
                    {"$match": {"measure": {"$lt": 0}}},
                    {"$match": {"date": {"$gte": startDate, "$lte": endDate}}},
                    {"$project": {
                        "amount": {"$multiply": ["$unitPrice", "$measure"]},
                    }},
                    {"$group": {
                        "_id": null,
                        "amount": {"$sum": "$amount"}
                    }}
                ]).exec();

                if(Object.keys(cmv).length > 0) { 
                    var obj = {
                        amount: cmv[0].amount,
                        date: date,
                        status: 0
                    }
                    var cmv = new req.modelFactory.getModels('CMV').CMV(obj);
                    cmv.save(function(err, results){
                        if(err) {
                            console.error(err);
                            return next(err);
                        }
                    })
                }

                await req.modelFactory.get('Cashflow').insertMany(cashflow, (err, result) => {
                    if(err) return next(err);
                });
                console.log('startDate: ', startDate, 'endDate: ',endDate);
                await req.modelFactory.get('Sales').updateMany({'isProcessed': false, "date":  {'$gte': startDate, '$lte': endDate}}, {"$set": {"isProcessed": true}}, (err, result) => {
                    if(err) return next(err);
                    res.send({'status': 1});
                    req.onSend();
                });
            })();
            
        }
        
    });
}