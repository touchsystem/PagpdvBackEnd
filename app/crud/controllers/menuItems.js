var S3Manager = require('../../../helpers/S3-manager');
var mongoose = require('mongoose');
var moment = require('moment');
const numeral = require('numeral');
const pdf = require('phantom-html2pdf');

exports.create = function(req, res, next) {
    var params = req.body;
    var MenuItems = req.modelFactory.get('DeliveryMenuItems');
    if(params.internalId != 'undefined') {
        MenuItems.find({internalId: params.internalId}, function(err, result){
            if(Object.keys(result).length > 0) {
                res.send({"msg": "This menu item is duplicated"});
                req.onSend();
            } else {
                var obj = {
                    groupId: params.groupId,
                    related: params.related || null,
                    productionPointId: params.productionPointId,
                    internalId: params.internalId,
                    name: params.name,
                    description: params.description,
                    price: params.price,
                    deliveryPrice: params.deliveryPrice,
                    imageUrl: params.imageUrl,
                    items: params.items,
                    min: params.min,
                    hasDelivery: false,
                    max: params.max,
                    default: params.default,
                    paused: params.paused,
                    open: params.open,
                    favorite: params.favorite,
                    days: params.days,    
                    fiscalNCM: params.fiscalNCM || "21069090",
                    fiscalOrigin: params.fiscalOrigin || 0,
                    fiscalCSOSN: params.fiscalCSOSN || 102,
                    fiscalCEST: params.fiscalCNAE || 0, 
                    fiscalAliquot: params.fiscalAliquot || 0,
                }
                console.log(obj, 'obj');
                var newMenuItem = MenuItems(obj);
                newMenuItem.save(function(err, result){
                    if(err) return next(err);
                    res.send({'status': 1, 'id': result._id});
                    req.onSend();
                });
            }
        });
    }
}


exports.detail = function(req, res, next) {
    // Get the query param from the URI
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    // Cast to ObjectId 
    var id = mongoose.Types.ObjectId(req.params.id);
    // Get the model from modelFactory passing the name as argument
    var MenuItems = req.modelFactory.get('MenuItems');
    MenuItems.find({_id: id}, (err, result) => {
        if(err) return next(err);
        console.log(result);
        var result = result;
        // Making a promise, it will wait until the response arrives
        let MenuItems = new Promise((resolve, reject) => {
            var response = result;
            if(response) {
                // Resolve the promise with the response
                resolve(response);
            }
        });          
        MenuItems.then(response => {
            res.send(response);
            req.onSend();
        });
    });
}


exports.search = (req, res, next) => {
    var queries = req.query;
    var search = queries.search;
    limit = parseInt(queries.limit, 10) | 10;
    var MenuItems = req.modelFactory.get('MenuItems');
    MenuItems.aggregate([
        {"$match": {"status": 0}},
        {"$match": {$or: [{"internalId": {"$regex": ".*" + search + ".*", "$options": 'i'}}, {"name": {"$regex": ".*" + search + ".*", "$options": 'i'}} ] }},
        {"$limit": limit}
    ], (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        res.json(result);
        req.onSend();
    });
}

exports.show = function(req, res, next){
    // Check if the request is undefined 
    if(typeof req != 'undefined'){
        // Get the ID from the URL
        var id = req.params.id;
        if(id != "undefined" || id != "null") {
            // Find by ID
            req.modelFactory.get('MenuItems').find({_id: id}, function(err, result){
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.send(result);
                // Close the connection
                req.onSend();
            })
        } else { 
            next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
        }
    }
}


exports.delete = function(req, res, next){
    // Check if request is undefined
    if(typeof req != 'undefined') {
        // Get the ID and the JSON body
        var id = req.params.id;
        if(id != "undefined" || id != "null") {
            var imageUrl = req.body.imageUrl;
            imageUrl = imageUrl.split('https://seurestaurante.s3.us-east-2.amazonaws.com/');
            // Call the delete function S3 to delete from AWS the file
            if(S3Manager.delete(imageUrl[1])) {
                console.log('Imagen eliminada');
            }
            var MenuItems = req.modelFactory.get('DeliveryMenuItems');
            // Get the recipe model and then remove it, also get the MenuItem model and then remove it
            MenuItems.update({_id: id}, {$set: {status: 1}}, (err, result) => {
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
}

async function reportCosts (req, res, next) {
    var products = [];
    var relatedProducts = [];
    var treatedProducts = [];
    var today = moment().startOf('day');
    var Products = req.modelFactory.get('Products');
    var MenuItems = req.modelFactory.get('MenuItems');
    var aggregate = await MenuItems.aggregate([
        {"$match": {"$expr": {"$gte":  [{"$size": "$items"}, 1]}}}
    ]).exec();

    var Utils = {
        childProcessItems: function(item, treatedProd, id){
            var arr = [];
            for(let i = 0; i < Object.keys(item).length; i++) {
                if(typeof item[i].related != 'undefined' && item[i].related != "") {
                    let related = item[i].related ? mongoose.Types.ObjectId(item[i].related) : item[i].related;
                    let unitPrice = treatedProd[item[i].related].price;
                    let internalId = treatedProd[item[i].related].internalId;
                    arr.push({"_id": mongoose.Types.ObjectId(item[i]._id), "internalId": internalId, "cost": unitPrice, "name": item[i].name, "measure": '-'+item[i].measure, "price": item[i].price, "min": item[i].min, "max": item[i].max, "related": related, "productionPointId": item[i].productionPointId, "items": Utils.childProcessItems(item[i].items, treatedProd)});
                }
            }
            return arr;
        },
        processItems: function(item, treatedProd) {
            var arr = [];
            for(let i = 0; i < Object.keys(item).length; i++) {
                arr.push({"_id": mongoose.Types.ObjectId(item[i].itemId), "internalId": item[i].internalId, "name": item[i].name, "quantity": item[i].qty, "customerId": item[i].customerId, "unitPrice": item[i].price, "tableId": item[i].tableId, "items": Utils.childProcessItems(item[i].items, treatedProd, item[i].itemId)});
            }
            return arr;
        },
        getRelated: function(items) {
            var arr = [];
            for (let i = 0; i < Object.keys(items).length; i++) {
                let cursor = items[i];
                if(typeof cursor.related != 'undefined' && cursor.related != "") {
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
    Utils.getRelated(aggregate);
    if(relatedProducts) {
        var products = await Products.find({'_id': {$in: relatedProducts}}).exec();
        var treatedProducts = products.reduce(function(acc, cur) {
            console.log(cur);
            acc[cur._id] = {"price": cur.price, "name": cur.name, "internalId": cur.internalId};
            return acc;
        }, {});
    }
    var menuItems = Utils.processItems(aggregate, treatedProducts);
    menuItems = menuItems.filter(function(menus) {
        return Object.keys(menus.items).length > 0; 
    });

    var html = `<html>
    <head>
    <style>
    html {
        zoom: 0.55;
        font-family: Arial;
    }
    .column {
        float: left;
        width: 46.2%;
        padding: 15px !important;
        border: 1px solid #CCC;
    }
      
      /* Clear floats after the columns */
    .row:after {
        content: "";
        display: table;
        clear: both;
    }
    </style>
    </head>
    <body>
    <div align="left">
        <b style="font-family: Arial; font-size: 28px">Composição de Produtos</b><br>
        <b style="font-size: 28px">${moment(today).format('L')}</b><br><br>
    </div>
    <div style="width: 50%; float: left; font-size: 15px">
        <table width="100%" style="border-top: 3px solid #111; border-right: 3px solid #111">
            <tr><td style="width: 15%;"><b>CODIGO</b></td><td style="width: 70%;"><b>PRODUCTO</b></td><td style="width: 15%;" align="right"><b>QTDE</b></td></tr>
        </table>
    </div>
    <div style="width: 50%; float: left; font-size: 15px">
        <table width="100%" style="border-top: 3px solid #111;">
            <tr><td style="width: 15%;"><b>CODIGO</b></td><td style="width: 70%;"><b>PRODUCTO</b></td><td style="width: 15%;" align="right"><b>QTDE</b></td></tr>
        </table>
    </div>
    <div class="row">`;
        menuItems.forEach(function(menu) {
            console.log(menu, 'menu');
            var subtotalCost = 0;
            html += `
                <div class="column">
                <div style="max-width: 96.9%; display: block">
                    <div style="float: left; width: 15%">
                        <b style="font-size: 17px; color: red">${menu.internalId}</b>
                    </div>
                    <div style="float: left; width: 70%">
                        <b style="font-size: 17px; color: red">&nbsp; ${menu.name}</b>
                    </div>
                </div><br><br>
                <div>`;
            menu.items.forEach(function(item){ 
                subtotalCost += Math.abs(item.measure) * item.cost;
                html += `
                    <div>
                        <div style="float: left; width: 15%">${item.internalId || '????'}</div>
                        <div style="float: left; width: 70%">${item.name}</div>
                        <div style="float: left; width: 15%" align="right">${Math.abs(item.measure)}</div>
                    </div>`;
                
            })
            html += `</div><br><br><br>
            <div>
                <div style="width: 33.3%; float: left">
                    <b>CST:</b> ${numeral(subtotalCost).format('0,0.00')}
                </div>
                <div style="width: 33.3%; float: left">
                    <b>PV:</b> ${numeral(menu.unitPrice).format('0,0.00')}
                </div>
                <div style="width: 33.3%; float: left" align="right">
                    <b>${(menu.unitPrice-subtotalCost/menu.unitPrice*100).toFixed(2)}%</b>
                </div>
            </div>
            </div>`;
        });
    html += `</div>`;

    var options = {
        "html": html,
        "paperSize": {format: 'Legal', orientation: 'portrait', border: '0.3in'},
        "runnings": "./runnings.js",
        "deleteOnAction": true
    }

    var startDate = moment(today).format('DD-MM-YYYY');
    var endDate = moment(today).endOf('day').format('DD-MM-YYYY');

    pdf.convert(options, function(err, result) {
        if(err) return next(err);
        var tmpPath = result.getTmpPath();
        console.log(tmpPath);
        S3Manager.uploadFromFile(tmpPath, 'pdf/menuitems-'+startDate+'-ao-'+endDate+'-', function(err, data){ 
            res.send(data);
            req.onSend();
        });
    });
}

exports.list = function(req, res, next) {
    var queries = req.query; 
    var page = queries.page;
    var today = moment().format('dddd').toString().toLowerCase(); //moment('dddd').toString().toLowerCase();
    console.log(today);
    limit = parseInt(queries.limit, 10); 
    var MenuItems = req.modelFactory.get('MenuItems');
    MenuItems.paginate({hasDelivery: false, 'status': 0}, {page: page, limit: limit}, (err, result) => {
        if(err) return next(err);
        res.send(result);
        req.onSend();
    });
}



exports.update = function(req, res, next){
    var id = mongoose.Types.ObjectId(req.params.id);
    var params = req.body;
    if(typeof id != 'undefined') {
        var MenuItems = req.modelFactory.get('MenuItems');
        MenuItems.findById(id, function(err, p){
            if(!p)
                return next(new Error('There is a problem with a document or doesnt exist'));
            else {
                p.groupId = params.groupId,
                p.related = params.related || null,
                p.productionPointId = params.productionPointId,
                p.name = params.name,
                p.description = params.description,
                p.price = params.price,
                p.internalId = params.internalId,
                p.imageUrl = params.imageUrl,
                p.deliveryPrice = params.deliveryPrice,
                p.items = params.items,
                p.min = params.min,
                p.max = params.max,
                p.default = params.default,
                p.paused = params.paused,
                p.open = params.open,
                p.days = params.days,
                p.favorite = params.favorite,
                p.fiscalNCM = params.fiscalNCM || "21069090",
                p.fiscalOrigin = params.fiscalOrigin || 0,
                p.fiscalCSOSN = params.fiscalCSOSN || 102,
                p.fiscalCEST = params.fiscalCEST || 0, 
                p.fiscalAliquot = params.fiscalAliquot || 0;
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

module.exports.reportCosts = reportCosts;