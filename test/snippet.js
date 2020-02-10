
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
        {"$match": {"$or": [{"productId": mongoose.Types.ObjectId("5c73e3ed39c9e14ef74cd74a")}, {"productId": mongoose.Types.ObjectId("5c64178fcbbe6e08571a873b")}]}},
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
                console.log(JSON.stringify(result), 'result');
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
                        
                        cmv = Math.abs(element.stock[j].outputMeasure) * price;
                        outputManual = (element.stock[j].outputManual == null) ? 0 : element.stock[j].outputManual;
                        outputSales = (element.stock[j].outputSales == null) ? 0 : element.stock[j].outputSales;
    
                        amountEntries = element.stock[j].entries * averageCost;
                        amountStock = amountEntries - Math.abs(cmv);

                        subtotalStock += amountStock;
                        subtotalPrevious += element.stock[j].previous;
                        subtotalEntries += amountEntries;
                        subtotalSales += element.stock[j].outputSales;
                        subtotalManual += element.stock[j].outputManual;
                        subtotalCMV += cmv;
                        html += `
                        <tr style="background-color: ${background}; PAGE-BREAK-AFTER: always" cellspacing="0">
                            <td style="border-top: 0px solid black"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].name}</span></td>
                            <td style="border-top: 0px solid black"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].unit}</span></td>
                            <td style="border-top: 0px solid black; width: 100px" align="right"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].previous}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].entries}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(averageCost).format('0,0.00')}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(amountEntries).format('0,0.00')}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${Math.abs(element.stock[j].outputSales)}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${Math.abs(element.stock[j].outputManual)}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${Math.abs(cmv).toFixed(3)}</span></td>
                            <td style="border-top: 0px solid black; width: 100px" align="right"><span style="text-transform: uppercase; font-family: Arial; ${hidden}">${element.stock[j].measure.toFixed(3)}</span></td>
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

    /*
    var Stock = req.modelFactory.get('Stock');
    var startDate = moment(req.query.startDate).startOf('day');
    var endDate = moment(req.query.endDate).endOf('day');
    var groupMatch = {"$match": {}};

    if(typeof req.query.group != 'undefined') {
        groupMatch["$match"] = {"groupId": mongoose.Types.ObjectId(req.query.group)}
    }
    Stock.aggregate([
        {"$lookup": {"from": "Products", "localField": "productId", "foreignField": "_id", "as": "products_docs"}},
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
        {"$match": {"$or": [{"productId": mongoose.Types.ObjectId("5c73e3ed39c9e14ef74cd74a")}, {"productId": mongoose.Types.ObjectId("5c64178fcbbe6e08571a873b")}]}},
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
            "outputPrice": "$cost",
            "outputManual": {"$sum": "$outputManual.measure"},
            "outputSales": {"$sum": "$outputSales.measure"},
            "previous": {"$sum": "$previous_docs.measure"},
            "entries": {"$sum": "$entries_docs.measure"},
            "averageCost": {"$avg": "$entries_docs.stockPrice"},
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
            "averageCost": 1,
            "totalEntries": {"$multiply": ["$averageCost", "$measure"]},
            "measure": 1,
            "cost": 1,
            "totalStock": {"$multiply": ["$measure", "$cost"]}
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
        
        var totalStock = 0;
        var subtotalStock = 0;
        var subtotalEntries = 0;
        var totalEntries = 0;
        var totalPrevious = 0;
        var totalCMV = 0;
        var totalSales = 0;
        var totalManual = 0;
        var sumEntries = 0;
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
                            <th  style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">ESTOQUE</th>
                            <th  style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">CUSTO</th>
                            <th  style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">TOTAL</th>
                        </tr>
                </thead>
            <tbody>
            <tr></tr>`;
            (async () => {
                for(let i = 0; i < Object.keys(result).length; i++) {
                    let element = result[i];
                    subtotalEntries = 0;
                    subtotalStock = 0;
                    subtotalCMV = 0;
                    subtotalManual = 0;
                    subtotalSales = 0;
                    subtotalPrevious = 0;
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
                        element.stock[j].outputPrice == null ? price = 0 : price = element.stock[j].outputPrice;
                        cmv = element.stock[j].outputMeasure*element.stock[j].outputPrice;
                        amountEntries = element.stock[j].entries * element.stock[j].averageCost;
                        subtotalStock += element.stock[j].totalStock;
                        subtotalPrevious += element.stock[j].previous;
                        subtotalEntries += amountEntries;
                        subtotalSales += element.stock[j].outputSales;
                        subtotalManual += element.stock[j].outputManual;
                        subtotalCMV += cmv;
                        html += `
                        <tr style="background-color: ${background}; PAGE-BREAK-AFTER: always" cellspacing="0">
                            <td style="border-top: 0px solid black"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].name}</span></td>
                            <td style="border-top: 0px solid black"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].unit}</span></td>
                            <td style="border-top: 0px solid black; width: 100px" align="right"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].previous}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].entries}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(element.stock[j].averageCost).format('0,0.00')}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(amountEntries).format('0,0.00')}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].outputSales}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].outputManual}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${cmv.toFixed(2)*-1}</span></td>
                            <td style="border-top: 0px solid black; width: 100px" align="right"><span style="text-transform: uppercase; font-family: Arial">${element.stock[j].measure.toFixed(3)}</span></td>
                            <td style="border-top: 0px solid black" align="right"><span style="text-transform: uppercase; font-family: Arial">${numeral(element.stock[j].cost).format('0,0.00')}</span></td> 
                            <td style="border-top: 0px solid black" align="right"><span  style="text-transform: uppercase; font-family: Arial">${numeral(element.stock[j].totalStock).format('0,0.00')}</span></td>
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
                    <td align="right"><b style="text-transform: uppercase; font-family: Arial">${totalSales}</td>
                    <td align="right"><b style="text-transform: uppercase; font-family: Arial">${totalManual}</td>
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
               
                res.send(html);
                req.onSend();
                return true;
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
        })();
    })*/
}