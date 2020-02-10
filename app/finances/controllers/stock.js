var mongoose = require('mongoose');
var numeral = require('numeral');
var pdf = require('phantom-html2pdf');
var moment = require('moment');
moment.locale('pt-br');


exports.outputTransaction = (req, res, next) => {
    /* 	
        {
        "stockGroupId": ObjectId("5ad66a3e581952c9b8d10a"),
        "products": [{"productId": "5ad66a3e36213211c9b8d10a", "quantity": 7, "unitPrice": 2.00, "subtotalPrice": 14.00},
		{"productId": "5ad66a5136213211c9b8d10b", "quantity": 5, "unitPrice": 15.00, "subtotalPrice": 75.00},
        {"productId": "5ad66a6636213211c9b8d10c", "quantity": 12, "unitPrice": 13.00, "subtotalPrice": 156.00}]} */
    var params = req.body;
    var stock = [];
    var stockGroupId = params.stockGroupId;
    var transactionId = new Date().getTime();
    var Stock = req.modelFactory.get('Stock');
    var Cashflow = req.modelFactory.get('Cashflow');
    var items = [];
    var cashflow = [];
    params.products.forEach(element => {
        items.push(mongoose.Types.ObjectId(element.productId));
    });
    console.log(items);
    (async () => {
        console.log('is awaiting?');
        Stock.aggregate([
            {  
                "$match":{  
                   "productId":{  
                      "$in": items
                   }
                }
            },
            {  
                "$lookup":{  
                    "from":"Products",
                    "localField":"productId",
                    "foreignField":"_id",
                    "as":"products_docs"
                }
            },
            {  
                   "$lookup":{  
                      "from":"ProductGroups",
                      "localField":"products_docs.groupId",
                      "foreignField":"_id",
                      "as":"groups_docs"
                   }
            },
            {  
                   "$group":{  
                      "_id":"$productId",
                      "name":{  
                         "$first":"$products_docs.name"
                      },
                      "measure":{  
                         "$sum":"$measure"
                      },
                      "groupsName":{  
                         "$first":"$groups_docs.name"
                      },
                      "groupId": {
                          "$first": "$products_docs.groupId"
                      },
                      "accountNumber":{  
                         "$first":"$groups_docs.accountNumber"
                      },
                      "costPrice":{  
                         "$first":"$products_docs.price"
                      },
          
                   }
            },
            {  
                   "$project":{  
                      "name":{  
                         "$arrayElemAt":[  
                            "$name",
                            0
                         ]
                      },
                      "groupId": {
                          "$arrayElemAt": [
                            "$groupId",
                            0
                          ]
                      },
                      "measure":1,
                      "groupsName":{  
                         "$arrayElemAt":[  
                            "$groupsName",
                            0
                         ]
                      },
                      "accountNumber":{  
                         "$arrayElemAt":[  
                            "$accountNumber",
                            0
                         ]
                      },
                      "costPrice":{  
                         "$arrayElemAt":[  
                            "$costPrice",
                            0
                         ]
                      }
                   }
            },
            {  
                   "$project":{  
                      "_id": 1,
                      "measure": 1,
                      "name": 1,
                      "groupId": 1,
                      "groupsName": 1,
                      "accountNumber": 1,
                      "costPrice": 1
                   }
            },
            {"$group": {
                "_id": "$groupId",
                "groupsName": {"$first": "$groupsName"},
                "accountNumber": {"$first": "$accountNumber"},
                "products": {"$push": {"productId": "$_id", "name": "$name", "groupId": "$groupId", "measure": "$measure", "accountNumber": "$accountNumber", "costPrice": "$costPrice"}}
            }}
        ], (err, result) => {
            var resultAggregate = result;
            var treatedProducts = [];
            var treatedGroups = [];
            totalStockCashflow = 0;
            for(let i = 0; i < Object.keys(resultAggregate).length; i++){
                var resultElement = resultAggregate[i].products;
                treatedGroups[resultAggregate[i]._id] = {'name': resultAggregate[i].groupsName, 'accountNumber': resultAggregate[i].accountNumber};
                for(let j = 0; j < Object.keys(resultElement).length; j++) {
                    //console.log(resultElement[j].costPrice);
                    //console.log(resultElement[j], 'productId');
                    treatedProducts[resultElement[j].productId] = {'price': resultElement[j].costPrice, 'name': resultElement[j].name, "groupId": resultElement[j].groupId};
                }
            }
            
            params.products.forEach(element => {
                let groupId = treatedProducts[element.productId].groupId;
                let unitPrice = element.unitPrice;
                let costPrice = treatedProducts[element.productId].price;
                let subtotalPrice = unitPrice * element.measure;
                //let subtotalCost = costPrice * element.measure;
                totalStockCashflow += subtotalPrice;
                let groupName = treatedGroups[groupId].name
                let accountNumber = treatedGroups[groupId].accountNumber;
                stock.push({'productId': mongoose.Types.ObjectId(element.productId), 'measure': -element.measure, 'observations': [{description: 'Saida de Produtos Manual '+element.date}], 'unitPrice': unitPrice, 'subtotalPrice': subtotalPrice, 'stockGroupId': stockGroupId, 'transactionId': transactionId, 'outputType': 'manual', "isProcessed": true, 'date': element.date});
                cashflow.push({'documentNumber': '', 'accountNumber': accountNumber, 'observations': [{description: 'CMV Venda '+groupName, transactionId: transactionId}], 'creditAmount': 0, 'debitAmount': subtotalPrice, 'date': moment().toISOString()});
                //cashflow.push({'documentNumber': '', 'accountNumber': accountNumber, 'observations':  {description: 'Saida de Produtos Manual'}, 'creditAmount': 0, 'debitAmount': subtotalCost, 'date': moment().toISOString()});
            });
            cashflow.push({'documentNumber': '', 'accountNumber': '113101', 'observations': [{description: 'Saida de Produtos Manual', transactionId: transactionId}], 'creditAmount': totalStockCashflow, 'debitAmount': 0, 'date': moment().toISOString()});
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
        });
        /*let products = await Products.find({'_id': {$in: items}}).exec();
        console.log(products);
        var treatedProducts = [];
        for(let i = 0; i < products.length; i++){
            treatedProducts[products[i]._id] = {'price': products[i].price, 'name': products[i].name, 'cost': products[i].cost};
        }
        params.products.forEach(element => {
            let unitPrice = treatedProducts[element.productId].price;
            let subtotalPrice = unitPrice * element.measure;
            stock.push({'productId': mongoose.Types.ObjectId(element.productId), 'measure': -element.measure, 'unitPrice': unitPrice, 'subtotalPrice': subtotalPrice, 'stockGroupId': stockGroupId, 'transactionId': transactionId, 'outputType': 'manual', 'date': element.date});
            cashflow.push({'documentNumber': '', 'accountNumber': '113101', 'observations': {description: 'CMV Venda '+element.groupsName}, 'creditAmount': element.subtotal, 'debitAmount': 0, 'date': date});
            cashflow.push({'documentNumber': '', 'accountNumber': element.accountNumber, 'observations': {description: 'CMV Venda '+element.groupsName }, 'creditAmount': 0, 'debitAmount': element.subtotal, 'date': date});
        });

        /**
         * 
         *  cashflow.push({'documentNumber': '', 'accountNumber': '113101', 'observations': {description: 'CMV Venda '+element.groupsName}, 'creditAmount': element.subtotal, 'debitAmount': 0, 'date': date});
            cashflow.push({'documentNumber': '', 'accountNumber': element.accountNumber, 'observations': {description: 'CMV Venda '+element.groupsName }, 'creditAmount': 0, 'debitAmount': element.subtotal, 'date': date});
         */
        /*var Stock = req.modelFactory.get('Stock');
        Stock.insertMany(stock, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.send({'status': 1, 'transactionId': transactionId});
            req.onSend();
        });*/
    })();
}


exports.outputPdf = (req, res, next) => {
    var queries = req.query;
    var startDate = queries.startDate;
    var endDate = queries.endDate;
    var type = queries.type;
    var Stock = req.modelFactory.get('Stock');
    var filterType = {"$match": {}};
    var date = {"$match": {}};
    var totalAmount = 0;
    if(typeof(startDate && endDate) != 'undefined') {
        date["$match"] = {"date": {$gte: new Date(startDate), $lte: new Date(endDate)}};
    }
    if(typeof(type) != 'undefined') {
        filterType["$match"] = {"outputType": type};
    }
    Stock.aggregate([
        {"$match": {
            "measure" : {
                "$lte" : 0
            }
        }},
        date,
        filterType,
        {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products_docs"}},
        { 
            "$project" : {
                "name" : {
                    "$arrayElemAt" : [
                        "$products_docs.name", 
                        0
                    ]
                }, 
                "measure" : 1, 
                "unit" : {
                    "$arrayElemAt" : [
                        "$products_docs.unit", 
                        0
                    ]
                }, 
                "unitPrice" : 1, 
                "subtotalPrice" : 1, 
                "date" : 1
            }
        }
    ], (err, result) => {
        var html = `<html>
        <head>  
            <style>
                body {
                    font-family: Arial;
                }

                @media print {
                    .header span {
                        font-size: 14px !important;
                    }

                    table > thead > tr > th {
                        font-family: Arial; 
                        font-size: 12px;  
                        border: 1px solid black; 
                        border-width: 2px 0px 2px 0px
                    }
                        
                    table > tbody > tr > td > span { 
                        font-size: 10px !important;
                    }

                    tr.total {
                        margin-top: 30px;
                    }
                }
            </style>
        </head>
        <body>
        <div align="left" class="header">
            <b style="font-family: Arial; font-size: 25px">Saída de Produtos</b><br>
            <span style="font-family: Arial">Periodo: ${moment(startDate).format('L')} a ${moment(endDate).format('L')}</span><br><br>
        </div>
        <table align="center">
            <thead style="padding-bottom: 1em;">
                    <tr>
                        <th>Medida</th>
                        <th>Unidade</th>
                        <th>Produto</th>
                        <th>Data</th>
                        <th>Unitario</th>
                        <th>Total</th>
                    </tr>
            </thead>
        <tbody>
        <tr></tr>`;
        (async () => {
            for(let i = 0; i < Object.keys(result).length; i++) {
                let element = result[i];
                html += `
                    <tr>
                    <td width="100"><span>${element.measure}</span></td>
                    <td width="150"><span>${element.unit}</span></td>
                    <td width="220"><span>${element.name}</span></td>
                    <td width="70" align="right"><span>${moment(element.date).format('L')}</span></td>
                    <td width="80" align="right"><span>${numeral(element.unitPrice).format('0,0.00')}</span></td>
                    <td width="80" align="right"><span>${numeral(element.subtotalPrice).format('0,0.00')}</span></td>
                   
                    </tr>
                `;
                totalAmount += element.subtotalPrice;
            }
            html += `
            <tr>
                <td style="border-top: 3px solid black"colspan="5"><b style="text-transform: uppercase; font-family: Arial">Total:</b></td>
                <td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalAmount).format('0,0.00')}</b></td>
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

            pdf.convert(options, function(err, result) {
                var tmpPath = result.getTmpPath();
                console.log(tmpPath);
                S3Manager.uploadFromFile(tmpPath, 'pdf/stock-'+startDate+'-ao-'+endDate+'-', function(err, data){ 
                    console.log(data, 'response');
                    res.send(data);
                    req.onSend();
                });
            });
        })();
    });
}

/* 
db.getCollection('Stock').aggregate([
            {  
                "$match":{  
                   "productId":{  
                      "$in": [ObjectId('5c7d44795c59c1194b308953'),
  ObjectId('5c827241aa81191ae144b4ca'),
  ObjectId('5c82724faa81191ae144b4cb')]
                   }
                }
            },
            {  
                "$lookup":{  
                    "from":"Products",
                    "localField":"productId",
                    "foreignField":"_id",
                    "as":"products_docs"
                }
            },
            {  
                   "$lookup":{  
                      "from":"ProductGroups",
                      "localField":"products_docs.groupId",
                      "foreignField":"_id",
                      "as":"groups_docs"
                   }
            },
            {  
                   "$group":{  
                      "_id":"$productId",
                      "name":{  
                         "$first":"$products_docs.name"
                      },
                      "measure":{  
                         "$sum":"$measure"
                      },
                      "groupsName":{  
                         "$first":"$groups_docs.name"
                      },
                      "accountNumber":{  
                         "$first":"$groups_docs.accountNumber"
                      },
                      "costPrice":{  
                         "$first":"$products_docs.cost"
                      },
          
                   }
            },
            {  
                   "$project":{  
                      "name":{  
                         "$arrayElemAt":[  
                            "$name",
                            0
                         ]
                      },
                      "measure":1,
                      "groupsName":{  
                         "$arrayElemAt":[  
                            "$groupsName",
                            0
                         ]
                      },
                      "accountNumber":{  
                         "$arrayElemAt":[  
                            "$accountNumber",
                            0
                         ]
                      },
                      "costPrice":{  
                         "$arrayElemAt":[  
                            "$costPrice",
                            0
                         ]
                      }
                   }
            },
            {  
                   "$project":{  
                      "_id": 1,
                      "measure": 1,
                      "name": 1,
                      "groupsName": 1,
                      "accountNumber": 1,
                      "costPrice": 1
                   }
            }
])

/* Procesar el flujo de caja de las ventas y el CMV */
/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * 
 */
exports.processStock = (req, res, next) => {
    (async () => {
        var Stock = req.modelFactory.get('Stock');
        var Cashflow = req.modelFactory.get('Cashflow');
        var date = req.body.date;
        var cashflow = [];
        var stockId = [];
        var startDate = moment(date).startOf('day').toDate();
        var endDate = moment(date).endOf('day').toDate();
        console.log('startDate: ', startDate);
        console.log('endDate: ', endDate);
        var transactionId = new Date().getTime();
        Stock.find({'isProcessed': "false", 'outputType': 'sales', 'date': {$gte: new Date(startDate), $lt: new Date(endDate)}}, (err, result) => {
            if(err) console.log(err);
            console.log(result, 'result');
            for(let i = 0; i < Object.keys(result).length; i++) {
                stockId.push(mongoose.Types.ObjectId(result[i]._id));
            } 
            console.log('stockId ', stockId);
              
            Stock.aggregate(
                [
                    { 
                        "$match" : {
                            "isProcessed" : false
                        }
                    },
                    {
                        "$match": {
                            "outputType": "sales"
                        }
                    },
                    { 
                        "$match": {
                            "_id": {"$in": stockId}
                        }
                    },
                    {  
                        "$lookup":{  
                            "from":"Products",
                            "localField":"productId",
                            "foreignField":"_id",
                            "as":"products_docs"
                        }
                    },
                    {  
                        "$lookup":{  
                            "from":"ProductGroups",
                            "localField":"products_docs.groupId",
                            "foreignField":"_id",
                            "as":"groups_docs"
                        }
                    },
                    {  
                        "$group":{  
                            "_id":"$productId",
                            "name":{  
                                "$first":"$products_docs.name"
                            },
                            "measure":{  
                                "$sum":"$measure"
                            },
                            "groupsName":{  
                                "$first":"$groups_docs.name"
                            },
                            "groupId": {
                                "$first": "$products_docs.groupId"
                            },
                            "accountNumber":{  
                                "$first":"$groups_docs.accountNumber"
                            },
                            "costPrice":{  
                                "$first":"$products_docs.price"
                            },
                
                        }
                    },
                    {  
                        "$project":{  
                            "name":{  
                                "$arrayElemAt":[  
                                    "$name",
                                    0
                                ]
                            },
                            "groupId": {
                                "$arrayElemAt": [
                                    "$groupId",
                                    0
                                ]
                            },
                            "measure":1,
                            "groupsName":{  
                                "$arrayElemAt":[  
                                    "$groupsName",
                                    0
                                ]
                            },
                            "accountNumber":{  
                                "$arrayElemAt":[  
                                    "$accountNumber",
                                    0
                                ]
                            },
                            "costPrice":{  
                                "$arrayElemAt":[  
                                    "$costPrice",
                                    0
                                ]
                            }
                        }
                    },
                    {  
                        "$project":{  
                            "_id": 1,
                            "measure": 1,
                            "name": 1,
                            "groupId": 1,
                            "groupsName": 1,
                            "accountNumber": 1,
                            "costPrice": 1
                        }
                    },
                    {"$group": {
                        "_id": "$groupId",
                        "groupsName": {"$first": "$groupsName"},
                        "accountNumber": {"$first": "$accountNumber"},
                        "products": {"$push": {"productId": "$_id", "name": "$name", "groupId": "$groupId", "measure": "$measure", "accountNumber": "$accountNumber", "costPrice": "$costPrice"}}
                    }}
                ], (err, result) => {
                    var resultAggregate = result;
                    var treatedProducts = [];
                    var treatedGroups = [];
                    totalStockCashflow = 0;
                    for(let i = 0; i < Object.keys(resultAggregate).length; i++){
                        var resultElement = resultAggregate[i].products;
                        treatedGroups[resultAggregate[i]._id] = {'name': resultAggregate[i].groupsName, 'accountNumber': resultAggregate[i].accountNumber};
                        for(let j = 0; j < Object.keys(resultElement).length; j++) {
                            //console.log(resultElement[j].costPrice);
                            //console.log(resultElement[j], 'productId');
                            treatedProducts[resultElement[j].productId] = {'price': resultElement[j].costPrice, 'name': resultElement[j].name, "groupId": resultElement[j].groupId};
                        }
                    }
                    
                    for(let i = 0; i < Object.keys(resultAggregate).length; i++){
                        var resultElement = resultAggregate[i].products;
                        for(let j = 0; j < Object.keys(resultElement).length; j++) {
                            console.log(resultElement, 'resultElement');
                            let groupId = treatedProducts[resultElement[j].productId].groupId;
                            let unitPrice = resultElement.unitPrice;
                            let costPrice = treatedProducts[resultElement[j].productId].price;
                            let subtotalPrice = unitPrice * resultElement[j].measure;
                            let subtotalCost = costPrice * resultElement[j].measure;
                            totalStockCashflow += subtotalCost * -1;
                            let groupName = treatedGroups[groupId].name
                            let accountNumber = treatedGroups[groupId].accountNumber;
                            //stock.push({'productId': mongoose.Types.ObjectId(element.productId), 'measure': -element.measure, 'unitPrice': unitPrice, 'subtotalPrice': subtotalPrice, 'stockGroupId': stockGroupId, 'transactionId': transactionId, 'outputType': 'manual', "isProcessed": true, 'date': element.date});
                            cashflow.push({'documentNumber': '', 'accountNumber': accountNumber, 'observations': {description: 'CMV Venda '+groupName}, 'creditAmount': subtotalCost, 'transactionId': transactionId, 'debitAmount': 0, 'date': moment().toISOString()});
                        }
                    }
                    cashflow.push({'documentNumber': '', 'accountNumber': '113101', 'observations': [{description: 'Saida de Produtos em Venda'}], 'creditAmount': 0, 'debitAmount': totalStockCashflow, 'transactionId': transactionId, 'date': moment().toISOString()});
                    /*params.products.forEach(element => {
                        let groupId = treatedProducts[element.productId].groupId;
                        let unitPrice = element.unitPrice;
                        let costPrice = treatedProducts[element.productId].cost;
                        let subtotalPrice = unitPrice * element.measure;
                        let subtotalCost = costPrice * element.measure;
                        totalStockCashflow += subtotalCost;
                        let groupName = treatedGroups[groupId].name
                        let accountNumber = treatedGroups[groupId].accountNumber;
                        stock.push({'productId': mongoose.Types.ObjectId(element.productId), 'measure': -element.measure, 'unitPrice': unitPrice, 'subtotalPrice': subtotalPrice, 'stockGroupId': stockGroupId, 'transactionId': transactionId, 'outputType': 'manual', "isProcessed": true, 'date': element.date});
                        cashflow.push({'documentNumber': '', 'accountNumber': '113101', 'observations': {description: 'CMV Venda '+groupName}, 'creditAmount': subtotalCost, 'debitAmount': 0, 'date': moment().toISOString()});
                        //cashflow.push({'documentNumber': '', 'accountNumber': accountNumber, 'observations': {description: 'CMV Venda '+groupName}, 'creditAmount': 0, 'debitAmount': subtotalCost, 'date': moment().toISOString()});
                    });*/
                    
                /* finaliza nueva implementacion */
                    Stock.updateMany({_id: {$in: stockId}}, {'isProcessed': true}, (err, result) => {
                    Cashflow.insertMany(cashflow, (err, result) => {
                        if(err) return next(err);
                    });
                    Stock.aggregate(
                        [
                            { 
                                "$match" : {
                                    "isProcessed": true
                                }
                            },
                            {
                                "$match": {
                                    "date": {$gte: new Date(startDate), $lt: new Date(endDate)}
                                }
                            },
                            {
                                "$match": {
                                    "outputType": "sales"
                                }
                            },
                            { 
                                "$group" : {
                                    "_id" : "$productId", 
                                    "measure" : {
                                        "$sum" : "$measure"
                                    }, 
                                    "unitPrice" : {
                                        "$avg" : "$unitPrice"
                                    },
                                    "subtotalPrice": {"$sum": "$subtotalPrice"}
                                }
                            }
                    ], (err, result) => {
                        if(err) return next(err);
                        var processed = result;
                        var processedStock = [];
                        console.log('reduce', result);
                        for(let i = 0; i < Object.keys(processed).length; i++) {
                            let element = processed[i];
                            if(typeof element != 'undefined') {
                                console.log('processedStock', element);
                                processedStock.push({'productId': element._id, 'measure': element.measure, 'unitPrice': element.unitPrice, 'subtotalPrice': element.subtotalPrice, 'stockGroupId': null, 'transactionId': transactionId, 'outputType': 'sales', 'date': moment(date).format('YYYY-MM-DD'), 'isProcessed': true, 'status': 0});
                            }
                        }
                        console.log(processedStock);
                        Stock.deleteMany({'isProcessed': true, 'outputType': 'sales', 'date': {$gte: new Date(startDate), $lt: new Date(endDate)}}, (err, result) => {
                            if(err) return next(err);
                            console.log('llego y paso a deletemany');
                            Stock.insertMany(processedStock, (err,result) => {
                                if(err) return next(err);
                                res.send({'status': 1});
                                req.onSend();
                            });
                        });
                    });
                });
            });
        })
    })();
}




/* Salida de Stock desde las ventas y procesar los pendientes de ventas */
exports.outputStock = (req, res, next) => {
    var params = req.body;
    var stock = params.stock;
    var date = params.date;
    var pendants = params.pendants;
    var transactionId = new Date().getTime();
    var treatedStock = [];
    var treatedPendants = [];

    for(let i = 0; i < Object.keys(stock).length; i++){
        let element = stock[i];
        treatedStock.push({'productId': element.productId, 'measure': '-'+element.measure, 'transactionId': transactionId, 'isProcessed': 0, 'date': date, 'outputType': 'sales'});
    }

    for(let i = 0; i < Object.keys(pendants).length; i++) {
        let element = pendants[i];
        treatedPendants.push({'name': element.name, 'measure': element.measure, 'date': element.date});
    }
    (async () => {
        let stockPromise = new Promise((resolve, reject) => {
            var Stock = req.modelFactory.get('Stock');
            Stock.insertMany(treatedStock, (err, result) => {
                if(err) return next(err);
                resolve(result);
            });
        });
        let resultStock = await stockPromise;
        if(Object.keys(pendants).length > 0) {
            let pendantsPromise = new Promise((resolve, reject) => {
                var Pendants = req.modelFactory.get('Pendants');
                Pendants.insertMany(treatedPendants, (err, result) => {
                    if(err) return next(err);
                    resolve(result);
                });
            });
            let resultPendants = await pendantsPromise;
        }
        res.send({'status': 1});
        req.onSend();
    })();
}

/* Tratar pendientes y remover los pendientes */
exports.treatPendants = (req, res, next) => {
    var params = req.body;
    var stock = params.stock;
    var pendants = params.pendants;
    var transactionId = new Date().getTime();
    var treatedStock = [];
    var removePendants = [];
    var items = [];
    var transactionId = new Date().getTime();
    var treatedProducts = [];
    var Products = req.modelFactory.get('Products');
    params.stock.forEach(element => {
        items.push(element.productId);
    });
    (async () => {
        let products = await Products.find({'_id': {$in: items}}).exec();
        for(let i = 0; i < products.length; i++){
            treatedProducts[products[i]._id] = {'price': products[i].price, 'name': products[i].name};
        }
        for(let i = 0; i < Object.keys(stock).length; i++){
            let element = stock[i];
            let unitPrice = treatedProducts[element.productId].price;
            let subtotalPrice = unitPrice * element.measure;
            treatedStock.push({'productId': element.productId, 'measure': '-'+element.measure, 'transactionId': transactionId, 'isProcessed': 0, 'unitPrice': unitPrice, 'subtotalPrice': subtotalPrice, 'date': element.date, 'outputType': 'sales',  'transactionId': transactionId});
        }
        for(let i = 0; i < Object.keys(stock).length; i++) {
            let element = stock[i];
            removePendants.push(element._id);
        }
        let stockPromise = new Promise((resolve, reject) => {
            var Stock = req.modelFactory.get('Stock');
            Stock.insertMany(treatedStock, (err, result) => {
                if(err) return next(err);
                resolve(result);
            });
        });
        let resultStock = await stockPromise;
        if(Object.keys(removePendants).length > 0) {
            var Pendants = req.modelFactory.get('Pendants');
            let pendantsPromise = new Promise((resolve, reject) => {
                Pendants.deleteMany({'_id':{'$in':removePendants}}, (err, result) => {
                    resolve(1);
                });
                
            });
            let resultPendants = await pendantsPromise;
        }
        res.send({'status': 1, 'transactionId': transactionId});
        req.onSend();
    })();
}

exports.listPendants = (req, res, next) => {
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

exports.deleteTransaction = (req, res, next) => {
    var transactionId = req.params.transactionId;
    var Stock = req.modelFactory.get('Stock');
    req.modelFactory.get('Documents').update({transactionId: transactionId}, {$set: {'status': 2}}, (err, result) => {
        Stock.deleteMany({'transactionId' : transactionId }, (err, result) => {
            res.send({'status': 1});
            req.onSend();
        });
    });
}

exports.getDataStockEntry = (req, callback) => {
    var startDate = req.query.startDate; 
    var endDate = req.query.endDate;
    var businessId = req.query.businessId;
    var Documents = req.modelFactory.get('Documents');
    var date = {"$match": {}};
    if(typeof(startDate && endDate) != 'undefined') {
        date["$match"] = {"date": {$gte: new Date(startDate), $lte: new Date(endDate)}};
    }
    var businessFilter = {"$match": {}};
    if(typeof businessId != 'undefined' | businessId != null) {
        if(businessId != 'null') {
            businessFilter["$match"] = {"$contacts_docs._id": mongoose.Types.ObjectId(businessId)};
        }
    }
    Documents.aggregate(
        [
            { 
                "$match" : {
                    "documentType" : 2
                }
            }, 
            { 
                "$lookup" : {
                    "from" : "Contacts", 
                    "localField" : "businessPartnerId", 
                    "foreignField" : "_id", 
                    "as" : "contacts_docs"
                }
            }, 
            { 
                "$project" : {
                    "documentAmount" : "$documentAmount", 
                    "products" : 1, 
                    "date" : 1, 
                    "contacts_docs" : 1
                }
            }, 
            { 
                "$unwind" : {
                    "path" : "$products", 
                    "includeArrayIndex" : "arrayIndex", 
                    "preserveNullAndEmptyArrays" : false
                }
            }, 
            { 
                "$lookup" : {
                    "from" : "Products", 
                    "localField" : "products.productId", 
                    "foreignField" : "_id", 
                    "as" : "products_docs"
                }
            }, 
            { 
                "$project" : {
                    "_id" : 1, 
                    "contacts_docs" : 1, 
                    "products" : {
                        "id" : "$products.productId", 
                        "name" : {
                            "$arrayElemAt" : [
                                "$products_docs.name", 
                                0
                            ]
                        }, 
                        "measure" : "$products.measure", 
                        "unit" : {
                            "$arrayElemAt" : [
                                "$products_docs.unit", 
                                0
                            ]
                        }, 
                        "unitPrice" : "$products.unitPrice", 
                        "subtotalPrice" : "$products.subtotalPrice", 
                        "date" : "$products.date"
                    }, 
                    "documentAmount" : 1
                }
            }, 
            { 
                "$group" : {
                    "_id" : {
                        "$arrayElemAt" : [
                            "$contacts_docs._id", 
                            0
                        ]
                    }, 
                    "businessName" : {
                        "$first" : {
                            "$arrayElemAt" : [
                                "$contacts_docs.name", 
                                0
                            ]
                        }
                    }, 
                    "products" : {
                        "$push" : "$products"
                    }, 
                    "documentAmount" : {
                        "$sum" : "$products.subtotalPrice"
                    }
                }
            }
        ], (err, result) => {
            callback(err, result);
    })

}

exports.stockEntryResumePdf = (req, res, next) => {
    var startDate = req.query.startDate; 
    var endDate = req.query.endDate;
    var Documents = req.modelFactory.get('Documents');
    var date = {"$match": {}};
    if(typeof(startDate && endDate) != 'undefined') {
        date["$match"] = {"date": {$gte: new Date(startDate), $lte: new Date(endDate)}};
    }
    Documents.aggregate(
        [
            { 
                "$match" : {
                    "documentType" : 2
                }
            }, 
            { 
                "$lookup" : {
                    "from" : "Contacts", 
                    "localField" : "businessPartnerId", 
                    "foreignField" : "_id", 
                    "as" : "contacts_docs"
                }
            }, 
            { 
                "$project" : {
                    "documentNumber" : 1, 
                    "providerName" : {
                        "$arrayElemAt" : [
                            "$contacts_docs.name", 
                            0
                        ]
                    }, 
                    "documentId" : {
                        "$arrayElemAt" : [
                            "$contacts_docs.documentId", 
                            0
                        ]
                    }, 
                    "documentAmount" : 1, 
                    "date" : 1
                }
            }
        ], (err, result) => {
            console.log('llego');
            if(err) return next(err);
            var totalAmount = 0;
            var html = `<html>
            <head>  
                <style>
                    body {
                        font-family: Arial;
                    }

                    @media print {
                        .header span {
                            font-size: 14px !important;
                        }

                        table > thead > tr > th {
                            font-family: Arial; 
                            font-size: 12px;  
                            border: 1px solid black; 
                            border-width: 2px 0px 2px 0px
                        }
                        
                        table > tbody > tr > td > span { 
                            font-size: 9px !important;
                        }

                        tr.total > td {
                            padding-top: 10px;
                        }

                        tr.total > td > b {
                            font-size: 14px;
                        }
                    }
                </style>
            </head>
            <body>
            <div align="left" class="header">
                <b style="font-family: Arial; font-size: 25px;">Entrada Resumida</b><br>
                <span style="font-family: Arial">Periodo: ${moment(startDate).format('L')} a ${moment(endDate).format('L')}</span><br><br>
            </div>
            <table align="center">
                <thead style="padding-bottom: 1em;">
                        <tr style="border: 1px solid black; border-width: 2px 0px 2px 0px; padding-bottom: 1em;">
                            <th>Numero</th>
                            <th>Fornecedor</th>
                            <th>CNPJ</th>
                            <th>Data</th>
                            <th>Valor</th>
                        </tr>
                </thead>
            <tbody>
            <tr></tr>`;
            (async () => {
                for(let i = 0; i < Object.keys(result).length; i++) {
                    let element = result[i];
                    html += `
                        <tr>
                            <td width="200"><span>${element.documentNumber}</span></td>
                            <td width="280"><span>${element.providerName}</span></td>
                            <td width="220"><span>${element.documentId}</span></td>
                            <td width="200"><span>${moment(element.date).format('L')}</span></td>
                            <td><span>${numeral(element.documentAmount).format('0,0.00')}</span></td>
                        </tr>
                    `;
                    totalAmount += element.documentAmount;
                }
                html += `
                <tr>
                </tr>
                <tr class="total">
                    <td style="border-top: 3px solid black"colspan="4" align="right"><b style="text-transform: uppercase; font-family: Arial">Total: </b></td>
                    <td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalAmount).format('0,0.00')}</b></td>
                </tr>
                </tbody>
                </table>
                </body>
                </html>`;
                /*var options = { 
                    format: 'Legal', 
                    "border": {
                        "top": "1in",
                        "right": "0.5in",
                        "bottom": "1.5in",
                        "left": "0.5in"
                    }, 
                };
                res.setHeader('Content-Type', 'application/pdf');
                pdf.create(html, options).toStream(function(err, stream) {
                    if(err) {
                        console.error(err);
                        return next(err);
                    }
                    stream.pipe(res);
                });*/

                res.setHeader('Content-Type', 'application/pdf');
                var options = {
                    "html": html,
                    "paperSize": {format: 'Legal', orientation: 'portrait', border: '0.3in'}
                }

                var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
                var endDate = moment(req.query.endDate).format('DD-MM-YYYY');

                pdf.convert(options, function(err, result) {
                    var tmpPath = result.getTmpPath();
                    console.log(tmpPath);
                    S3Manager.uploadFromFile(tmpPath, 'pdf/stock-'+startDate+'-ao-'+endDate+'-', function(err, data){ 
                        console.log(data, 'response');
                        res.send(data);
                        req.onSend();
                    });
                });
            })();
        })
}

exports.priceCorrection = (req, res, next) => {
    var Stock = req.modelFactory.get('Stock');
    var Products = req.modelFactory.get('Products');
    Stock.aggregate([
        {"$match": {"measure": {"$gte": 0}}},
        {"$group": {
            "_id": "$productId",
            "products_docs": {"$push": {"measure": "$measure"}}
        }},
        {"$project": {
            "_id": "$_id",
            "price": {"$avg": "$products_docs.measure"}
        }}
    ], (err, result) => {
        console.log(result);
        for(let i = 0; i < Object.keys(result).length; i++) {
            Products.updateOne({"_id": mongoose.Types.ObjectId(result[i]._id)}, {$set: {"price": result[i].price}}).exec();
        }
        res.send({'status': 1});
        req.onSend();
    });
}

exports.processCMV = (req, res, next) => {
    var Stock = req.modelFactory.get('Stock');
    Stock.aggregate([
        {"$match": {"measure": {"$lt": 0}}},
        {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products_docs"}},
        {"$project": {
            "_id": "$_id",
            "productId": 1,
            "name": {"$arrayElemAt": ["$products_docs.name", 0]},
            "internalId": {"$arrayElemAt": ["$products_docs.internalid", 0]},
            "measure": "$measure",
            "groupId": {"$arrayElemAt": ["$products_docs.groupId", 0]},
            "stockPrice": "$unitPrice",
            "outputType": "$outputType",
            "ref": "$transactionId"
        }},
        {"$lookup": {"from": "ProductGroups", "localField": "groupId", "foreignField": "_id", "as": "groups_docs"}},
        {"$project": {
            "_id": 1,
            "productId": 1,
            "name": 1,
            "accountNumber": {"$arrayElemAt": ["$groups_docs.accountNumber", 0]},
            "groupName": {"$arrayElemAt": ["$groups_docs.name", 0]},
            "internalId": 1,
            "measure": 1,
            "groupId": 1,
            "stockPrice": 1,
            "ref": 1
        }},
        {"$group": {
            "_id": "$ref",
            "products": {"$push": {"productId": "$productId", "measure": "$measure", "stockPrice": "$stockPrice", "accountNumber": "$accountNumber", "groupName": "$groupName"}}
        }}
    ], (err, result) => {
        var cashflow = [];
        totalAmount = 0;
        console.log(JSON.stringify(result));
        for(let i = 0; i < Object.keys(result).length; i++) {
            var element = result[i];
            for(let j = 0; j < Object.keys(element.products).length; j++) {
                var childElement = element.products[j];
                console.log(childElement);
                let amount = childElement.measure * childElement.stockPrice * -1;
                cashflow.push({'documentNumber': '', 'accountNumber': childElement.accountNumber, 'observations': [{description: 'CMV Manual '+childElement.groupName}], 'debitAmount': amount, 'creditAmount': 0, 'ref': element._id, 'transactionId': element._id, 'date': moment().toISOString()});
                totalAmount += amount;
            }
            console.log(totalAmount, 'total');
        }
        
        req.modelFactory.get('Cashflow').insertMany(cashflow, (err, result) => {
            if(err) return next(err);
            console.log(result);
            res.send({'status': 1});
            req.onSend();
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
/*        {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products_docs"}},
        {"$project": {
            "_id": "$_id",
            "productId": 1,
            "name": {"$arrayElemAt": ["$products_docs.name", 0]},
            "internalId": {"$arrayElemAt": ["$products_docs.internalid", 0]},
            "measure": "$measure",
            "unit": {"$arrayElemAt": ["$products_docs.unit", 0]},
            "price": {"$arrayElemAt": ["$products_docs.price", 0]},
            "groupId": {"$arrayElemAt": ["$products_docs.groupId", 0]},
            "stockPrice": "$unitPrice",
            "outputType": "$outputType",
            "date": 1
        }},
        groupMatch,
         {"$group": {
            "_id": "$productId",
            "price": {"$first": "$price"},
            "unit": {"$first": "$unit"},
            "groupId": {"$first": "$groupId"},
            "name": {"$first": "$name"}, 
            "products_docs": {"$push": {"productId": "$productId", "internalId": "$internalId", "measure": "$measure", "groupId": "$groupId", "stockPrice": "$stockPrice", "price": "$price", "date": "$date", "outputType": "$outputType"}}
        }},
        {"$project": {
            "_id": 1,
            "name": 1,
            "unit": 1,
            "groupId": 1,
            "measure": {"$sum": "$products_docs.measure"},
            "cost": "$price",
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
            "averageCost": {"$avg": "$entries_docs.stockPrice"},
            "measure": 1,
            "cost": 1
        }},*/
        {"$match": {"status": 0}},
        {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products_docs"}},
        {
            "$project": {
            "_id": "$_id",
            "productId": 1,
            "name": {"$arrayElemAt": ["$products_docs.name", 0]},
            "internalId": {"$arrayElemAt": ["$products_docs.internalid", 0]},
            "measure": "$measure",
            "unit": {"$arrayElemAt": ["$products_docs.unit", 0]},
            "price": {"$arrayElemAt": ["$products_docs.price", 0]},
            "groupId": {"$arrayElemAt": ["$products_docs.groupId", 0]},
            "stockPrice": "$unitPrice",
            "outputType": "$outputType",
            "subtotalPrice": "$subtotalPrice",
            "date": 1
        }},
        {"$group": {
            "_id": "$productId",
            "price": {"$first": "$price"},
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
            "cost": "$price",
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
            "cost": 1
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
            //"averageCost": {"$divide": ["$entries", "$entriesSubtotal"]},
            //"averageCost": 1,
            //"totalEntries": {"$multiply": ["$averageCost", "$measure"]},
            "measure": 1,
            "cost": 1,
            //"totalStock": {"$multiply": ["$measure", "$cost"]}
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
        
        var totalStock = 0;
        var subtotalStock = 0;
        var subtotalEntries = 0;
        var totalEntries = 0;
        var totalPrevious = 0;
        var totalCMV = 0;
        var totalSales = 0;
        var totalManual = 0;
        var sumEntries = 0;

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
                            <th width="30" style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px">SD ANT</th>
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
                for(let i = 0; i < Object.keys(result).length; i++) {
                    let element = result[i];
                    subtotalEntries = 0;
                    averageCost = 0;
                    subtotalStock = 0;
                    subtotalCMV = 0;
                    outputManual = 0;
                    outputSales = 0;
                    subtotalManual = 0;
                    subtotalSales = 0;
                    subtotalPrevious = 0;
                    html += `
                    <tr>
                        <td colspan="7"><b style="text-transform: uppercase; font-family: Arial">GRUPO: ${element.name}</b></td>
                    </tr>`;

                    const data = element.stock.filter(item => item.measure != 0 || item.outputMeasure != 0 || item.outputManual != 0 || item.outputSales != 0 || item.outputManual != 0);

                    for(let j = 0; j < Object.keys(data).length; j++) {
                        var background;
                        if(j % 2 == 0){ 
                            background = "#CCC"; 
                        } else{ 
                            background = "#FFF"; 
                        }    
                        var price = 0;
                        (data[j].outputPrice == null) ? price = 0 : price = data[j].outputPrice;
                        
                        averageCost = Number(data[j].totalEntries) / Number(data[j].entries) || 0;
                        
                        cmv = Math.abs(data[j].outputMeasure) * price;
                        outputManual = (data[j].outputManual == null) ? 0 : data[j].outputManual;
                        outputSales = (data[j].outputSales == null) ? 0 : data[j].outputSales;
    
                        amountEntries = data[j].entries * averageCost;
                        amountStock = amountEntries - Math.abs(cmv);

                        subtotalStock += amountStock;
                        subtotalPrevious += data[j].previous;
                        subtotalEntries += amountEntries;
                        subtotalSales += data[j].outputSales;
                        subtotalManual += data[j].outputManual;
                        subtotalCMV += cmv;
                        html += `
                        <tr style="background-color: ${background}; PAGE-BREAK-AFTER: always" cellspacing="0">
                            <td style="border-top: 0px solid black"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].name}</span></td>
                            <td style="border-top: 0px solid black"><span style="text-transform: uppercase; font-family: Arial">${data[j].unit}</span></td>
                            <td style="border-top: 0px solid black; width: 100px" align="right"><span style="text-transform: uppercase; font-family: Arial">${data[j].previous}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${data[j].entries}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(averageCost).format('0,0.00')}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(amountEntries).format('0,0.00')}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${Math.abs(data[j].outputSales)}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${Math.abs(data[j].outputManual)}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${Math.abs(cmv).toFixed(3)}</span></td>
                            <td style="border-top: 0px solid black; width: 100px" align="right"><span style="text-transform: uppercase; font-family: Arial; ${hidden}">${data[j].measure.toFixed(3)}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial; ${hidden}">${numeral(averageCost).format('0,0.00')}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span  style="text-transform: uppercase; font-family: Arial; ${hidden}">${numeral(amountEntries - Math.abs(cmv)|| 0).format('0,0.00')}</span></td>
                        </tr>`;
                    }
                    totalEntries += subtotalEntries;
                    totalStock += subtotalStock;
                    totalCMV += subtotalCMV;
                    totalPrevious += subtotalPrevious;
                    totalSales += subtotalSales;
                    totalManual += subtotalManual;
                    html += `
                    <tr>
                        <td style="border-bottom: 1px solid black"colspan="2"><b style="text-transform: uppercase; font-family: Arial">SOMA GRUPO</b></td>
                        <td style="border-bottom: 1px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${subtotalPrevious}</td>
                        <td style="border-bottom: 1px solid black" align="right" colspan="3"><b style="text-transform: uppercase; font-family: Arial">${numeral(subtotalEntries).format('0,0.00')}</td>
                        <td style="border-bottom: 1px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${subtotalSales}</td>
                        <td style="border-bottom: 1px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${subtotalManual}</td>
                        <td style="border-bottom: 1px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(subtotalCMV).format('0,0.00')}</td>
                        <td style="border-bottom: 1px solid black" align="right" colspan="3"><b style="text-transform: uppercase; font-family: Arial">${numeral(subtotalStock).format('0,0.00')}</b></td>
                    </tr>`;
                }
                
                html += `
                <tr>
                    <td colspan="2"><b style="text-transform: uppercase; font-family: Arial">TOTAL GERAL</b></td>
                    <td align="right" colspan="0"><b style="text-transform: uppercase; font-family: Arial">${totalPrevious}</td>
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
    })
}

async function listCMV(req, res, next) {
    var queries = req.query;
    page = queries.page || 1
   // Parse the limit parameter to Integer
   if(!queries.limit) {
       limit = 10;
   } else {
       limit = parseInt(queries.limit, 10);
   }
   skip = (page - 1) * limit;
   var CMV = req.modelFactory.get('CMV');
   var report = await CMV.aggregate([
       {
           $facet: {
               total: [
                   { $group: { _id: null, count: { $sum: 1 } } },
               ],
               docs: [
                   { $skip: skip},
                   { $limit: limit}
               ]
           }
       },
       {"$project": {
           "total": {$arrayElemAt: ["$total.count", 0]},
           "docs": 1
       }},
       {"$project": {
           "total": 1,
           "pages": {"$divide": ["$total", limit]},
           "docs": 1
       }}
   ]).exec();
   res.send(report);
   req.onSend();
}

exports.stockEntryPdf = (req, res, next) => {
    var startDate = req.query.startDate; 
    var endDate = req.query.endDate;
    var businessId = req.query.businessId;
    var Documents = req.modelFactory.get('Documents');
    var date = {"$match": {}};
    if(typeof(startDate && endDate) != 'undefined') {
        date["$match"] = {"date": {$gte: new Date(startDate), $lte: new Date(endDate)}};
    }
    var businessFilter = {"$match": {}};
    if(typeof businessId != 'undefined' | businessId != null) {
        if(businessId != 'null') {
            businessFilter["$match"] = {"$contacts_docs._id": mongoose.Types.ObjectId(businessId)};
        }
    }
    Documents.aggregate(
        [
            {"$sort": {"date": -1}},
            { 
                "$match" : {
                    "documentType" : 2
                }
            }, 
            { 
                "$lookup" : {
                    "from" : "Contacts", 
                    "localField" : "businessPartnerId", 
                    "foreignField" : "_id", 
                    "as" : "contacts_docs"
                }
            }, 
            { 
                "$project" : {
                    "documentAmount" : "$documentAmount", 
                    "products" : 1, 
                    "date" : 1, 
                    "contacts_docs" : 1
                }
            }, 
            { 
                "$unwind" : {
                    "path" : "$products", 
                    "includeArrayIndex" : "arrayIndex", 
                    "preserveNullAndEmptyArrays" : false
                }
            }, 
            { 
                "$lookup" : {
                    "from" : "Products", 
                    "localField" : "products.productId", 
                    "foreignField" : "_id", 
                    "as" : "products_docs"
                }
            }, 
            { 
                "$project" : {
                    "_id" : 1, 
                    "contacts_docs" : 1, 
                    "products" : {
                        "id" : "$products.productId", 
                        "name" : {
                            "$arrayElemAt" : [
                                "$products_docs.name", 
                                0
                            ]
                        }, 
                        "measure" : "$products.measure", 
                        "unit" : {
                            "$arrayElemAt" : [
                                "$products_docs.unit", 
                                0
                            ]
                        }, 
                        "unitPrice" : "$products.unitPrice", 
                        "subtotalPrice" : "$products.subtotalPrice", 
                        "date" : "$products.date"
                    }, 
                    "documentAmount" : 1
                }
            }, 
            { 
                "$group" : {
                    "_id" : {
                        "$arrayElemAt" : [
                            "$contacts_docs._id", 
                            0
                        ]
                    }, 
                    "businessName" : {
                        "$first" : {
                            "$arrayElemAt" : [
                                "$contacts_docs.name", 
                                0
                            ]
                        }
                    }, 
                    "products" : {
                        "$push" : "$products"
                    }, 
                    "documentAmount" : {
                        "$sum" : "$products.subtotalPrice"
                    }
                }
            }
        ], (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            var totalAmount = 0;
            var html = `<html>
            <head>
            <style>
                span {
                    font-size: 12px !important;
                    font-family: "Arial";
                }
                html {
                    zoom: 0.55;
                }
            </style>
            <body>
            <div align="left">
                <h1 style="font-family: Arial">Entrada</h1>
            </div>
            <table align="center" width="100%">
                <thead style="padding-bottom: 1em;">
                        <tr style="border: 1px solid black; border-width: 2px 0px 2px 0px; padding-bottom: 1em;">
                            <th  style="font-family: Arial; font-size: 12px; border: 1px solid black; border-width: 2px 0px 2px 0px;">Medida</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Unidade</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">Produto</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">Unitario</th>
                            <th  style="font-family: Arial; font-size: 12px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">Total</th>
                        </tr>
                </thead>
            <tbody width="100%">
            <tr></tr>`;
            (async () => {
                for(let i = 0; i < Object.keys(result).length; i++) {
                    let resultDate = moment(result[i].date);
                    html += `
                        <tr>
                            <td style="border-top: 3px solid black"><b style="text-transform: uppercase; font-family: Arial">${resultDate.format('L')}</b></td>
                            <td style="border-top: 3px solid black"colspan="4"><b style="text-transform: uppercase; font-family: Arial">${result[i].businessName}</b></td>
                        </tr>
                    `;
                    for(let j = 0; j < Object.keys(result[i].products).length; j++) {
                        let element = result[i].products[j];
                        html += `
                        <tr>
                            <td width="100" style="font-family: Arial"><span>${element.measure}</span></td>
                            <td width="150" style="font-family: Arial"><span>${element.unit}</span></td>
                            <td width="220" style="font-family: Arial"><span>${element.name}</span></td>
                            <td width="80" align="right" style="font-family: Arial"><span>${numeral(element.unitPrice).format('0,0.00')}</span></td>
                            <td width="80" align="right" style="font-family: Arial"><span>${numeral(element.subtotalPrice).format('0,0.00')}</span></td>
                        </tr>`;
                    }
                    totalAmount += result[i].documentAmount;
                    html += `
                        <tr>
                            <td style="border-top: 3px solid black"colspan="4"></td>
                            <td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(result[i].documentAmount).format('0,0.00')}</b></td>
                        </tr>
                    `;
                }
                html += `
                <tr>
                    <td style="border-top: 3px solid black"colspan="4"></td>
                    <td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalAmount).format('0,0.00')}</b></td>
                </tr>
                </tbody>
                </table>
                </body>
                </html>`;
                res.setHeader('Content-Type', 'application/pdf');
                var options = {
                    "html": html,
                    "paperSize": {format: 'Letter', orientation: 'portrait', border: '0.3in'}
                }

                var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
                var endDate = moment(req.query.endDate).format('DD-MM-YYYY');

                pdf.convert(options, function(err, result) {
                    var tmpPath = result.getTmpPath();
                    console.log(tmpPath);
                    S3Manager.uploadFromFile(tmpPath, 'pdf/stock-'+startDate+'-ao-'+endDate+'-', function(err, data){ 
                        console.log(data, 'response');
                        res.send(data);
                        req.onSend();
                    });
                });
            })();
    })
}

exports.listOutput = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    var type = queries.type;
    var startDate = queries.startDate;
    var endDate = queries.endDate;
    var productName = queries.productName;
    limit = parseInt(queries.limit, 10);
    var Stock = req.modelFactory.get('Stock');
    var filterMatch = {'$match': {}}; 
    var filterProductName = {'$match': {}}; 
    var date = {"$match": {}};
    if(typeof type != 'undefined') {
        filterMatch["$match"] = {"outputType": type}; 
    } 

    if(typeof productName != 'undefined') {
        filterProductName["$match"] = {"productName": {"$regex": ".*" +  productName + ".*", "$options": 'i'}};
    }

    if(typeof(startDate && endDate) != 'undefined') {
        date["$match"] = {"date": {$gte: new Date(startDate), $lt: new Date(endDate)}};
    }
    var aggregate = Stock.aggregate([
        {"$match": {"status": 1}},
        {"$match": {"measure": {$lt: 0}}},
        filterMatch,
        date,
        {"$lookup": {"from": "StockGroups", "localField": "stockGroupId", "foreignField": "_id", "as": "stockgroups_docs"}},
        {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products_docs"}},
        {"$lookup": {"from": "ProductGroups", "localField": "products_docs.groupId", "foreignField": "_id", "as": "groups_docs"}},
        {"$project": {
        		"productName": {$arrayElemAt: ["$products_docs.name", 0]},
        		"measure": 1,
        		"unitPrice": 1,
                "subtotalPrice": 1,
                "date": 1,
        		"stockGroupName": {$arrayElemAt: ["$stockgroups_docs.denomination", 0]},
        		"productGroupName": {$arrayElemAt: ["$groups_docs.name", 0]}
        }},
        filterProductName
    ]);
    Stock.aggregatePaginate(aggregate, {page: page, limit: limit}, (err, result, pageCount, count) => {
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

exports.detailsEntry = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    var productId = req.params.productId;
    var Stock = req.modelFactory.get('Stock');
    var aggregate = Stock.aggregate([
        {"$match": {"productId": mongoose.Types.ObjectId(productId)}},
        {"$sort": {"createdAt": -1}},
        {"$match": {"measure": { "$gt": 0}}},
        {"$lookup": {"from": "Documents", "localField": "transactionId", "foreignField": "products.transactionId", "as": "document_docs"}},
        {"$project": {
            "_id": 1,
            "isProcessed": 1,
            "status": 1,
            "productId": 1,
            "measure": 1,
            "unitPrice": 1,
            "subtotalPrice": 1,
            "stockGroupId": 1,
             "observations": {"$arrayElemAt": ["$document_docs.observations", 0]},
             "documentNumber": {"$arrayElemAt": ["$document_docs.documentNumber", 0]},
            "transactionId": 1,
            "date": 1,
            "createdAt": 1,
            "updatedAt":1
        }}
    ]);
    Stock.aggregatePaginate(aggregate, {page: page, limit: limit}, (err, result, pageCount, count) => {
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

exports.list = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    var search = queries.search;
    limit = parseInt(queries.limit, 10);
    
    var filterProductName = {'$match': {}}; 
    if(typeof search != 'undefined') {
        filterProductName["$match"] = {"name": {"$regex": ".*" +  search + ".*", "$options": 'i'}};
    }

    var Stock = req.modelFactory.get('Stock');
    var aggregate = Stock.aggregate([
        {'$sort': {'createdAt': -1}}, 
        {"$group": {
            "_id": "$productId",
            "products": {"$push": {"id": "$_id", "transactionId": "$transactionId", "measure": "$measure","unitPrice": "$unitPrice", "subtotalPrice": "$subtotalPrice", "createdAt": "$createdAt"}}
        }},
        {"$project": {
            "_id": 1,
            "products": 1,
            "measure": {"$sum": "$products.measure"}
        }},
        {"$project": {
            "_id": 1,
            "products": {
                "$slice": ["$products", 10]
             },
             "measure": 1
        }},
        {"$unwind": "$products"},
        {"$project": {
           "_id": 1,
           "amount": "$products.measure",
           "unitPrice": "$products.unitPrice",
           "transactionId": "$products.transactionId",
           "measure": 1
         }},
         {"$group": {
            "_id": "$_id",
            "costPrice": {"$avg": "$unitPrice"},
            "measure": {"$first": "$measure"},
            "transactionId": {"$first": "$transactionId"}
         }},
         {"$lookup": {"from": "Products", "localField": "_id", "foreignField": "_id", "as": "product_docs"}},
         {"$project": {
             "_id": 1,
             "costPrice": 1,
             "measure": 1,
             "transactionId": 1,
             "unit": {"$arrayElemAt": ["$product_docs.unit", 0]},
             "name": {"$arrayElemAt": ["$product_docs.name", 0]}
         }},
         {"$lookup": {"from": "Documents", "localField": "transactionId", "foreignField": "products.transactionId", "as": "document_docs"}},
         {"$project": {
             "_id": 1,
             "costPrice": 1,
             "measure": 1,
             "unit": 1,
             "name": 1,
             "observations": {"$arrayElemAt": ["$document_docs.observations", 0]},
             "documentNumber": {"$arrayElemAt": ["$document_docs.documentNumber", 0]}
         }},
         filterProductName
    ]);
    Stock.aggregatePaginate(aggregate, {page: page, limit: limit}, (err, result, pageCount, count) => {
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

exports.show = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
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
    ])
    
}

module.exports.listCMV = listCMV;