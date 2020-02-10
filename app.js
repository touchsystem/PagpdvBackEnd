/**
 *
 *      Mongoose Multi Tenancy Implementation - DB per Tenant approach
 *
 *      -
 *
 *      This Project is an example of implementation using:
 *
 *      - Mongoose as ODM.
 *      - MongoDB as NoSQL DB.
 *      - JWT as Token format
 *
 *      My approach is DB per tenant, this means that for each tenant we'll
 *      have a separate database on our server. Isolating each from others.
 *
 *      Goals of this project:
 *      Each connection should handle a request, identifying the tenant
 *      present on the JWT, provide the correct db connection for each
 *      client. Isolating the tenants. properly
 *
 *      @author Alberto Miranda
 *      @email allowski@gmail.com
 *
 */
/*
 *
 *      Import Libs
 *
 */
const express = require('express'),
    app = express(),
    router = express.Router(),
    bodyParser = require('body-parser'),
    cors = require('cors');
    S3Manager = require('./helpers/S3-manager'),
    helmet = require('helmet'),
    moment = require('moment'),
    winston = require('winston');
/*
 *
 *      Custom modules
 *
 */

const PushManager = require('./helpers/push-manager');
const MultiTenancyManager = require('./helpers/multi-tenancy-manager');
const CRUDRoute = require('./app/crud/routes/index');
const FinancesRoute = require('./app/finances/routes/index');
const SalesRoute = require('./app/sales/routes/index');
const SettingsRoute = require('./app/settings/routes/index');
const MenusRoute = require('./app/delivery/routes/index');
const MigrationRoute = require('./app/migrations/routes/index');
const ScheduleRoute = require('./app/schedule/routes/schedule');
const FiscalRoute = require('./app/fiscal/routes/index');
const IntegrationsRoute = require('./integrations/routes/index');
const TestRoute = require('./test/route');

/*
 *
 *      Enable our Middleware
 *
 */



app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json({"limit": '10mb'}));

// Enable CORS

app.use(cors());

//app.use(formidable());




// Logger
/*
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log', handleExceptions: true, json: true})
  ]
});
 */

// Enable helmet to avoid vulnerabilities on HTTP requests

/* Used for debug purposes */ 

app.use(function(req, res, next) {
    console.log('method', req.method);
    console.log('url', req.url);
    console.log('path', req.path);
    console.log('params', req.params);
    console.log('body', req.body); 
    next();
});

app.use(helmet());
// Apply middleware only on settings endpoint
/*
app.use('/api/v1/settings/', function(req, res, next) {
    var token = req.headers['x-auth-token'];
    // Check if the token exists, otherwise send error
    if (!token) {
        res.json({
            error: 2,
            message: 'Token not found. x-auth-token not setted.'
        });
        return;
    }
    // Call our JWT decoder module, and handle the promise

    JWTDecoder(token, res).then(function(result) {

    }).catch(function(err) {
        res.json({
            error: 2,
            message: 'Invalid token, please try again.'
        });;
        return;
    });

    var database = 'db-100';
    var connection = mongoose.createConnection('mongodb://touchsystem:4JK5Ky6O58nI9efw@touch1-shard-00-00-iuxja.mongodb.net:27017,touch1-shard-00-01-iuxja.mongodb.net:27017/settings?ssl=true&replicaSet=Touch1-shard-0&authSource=admin');
    req.database = database;
    req.connection = connection;
    req.modelFactory = new ModelFactory(connection);
    req.onSend = function() {
        // Proceed to close the connection
        try {
            req.connection.close();
        } catch (err) {
            console.error(err);
        }
    };
    next();
});
app.use('/api/v1/settings/', SettingsRoute);
*/

// Enable our Multi Tenancy Manager
app.use('/api/v1/', MultiTenancyManager);

app.use('/api/v1/', SalesRoute);
app.use('/api/v1/', CRUDRoute);
app.use('/api/v1/', FinancesRoute);
app.use('/api/v1/', SettingsRoute);
app.use('/api/v1/', MenusRoute);
app.use('/api/v1/', MigrationRoute);
app.use('/api/v1/', ScheduleRoute);
app.use('/api/v1/', FiscalRoute);
app.use('/api/v1/push/send', PushManager.sendMessageToGroups);
app.use('/api/v1/push/create', PushManager.createDevice);
app.use('/api/v1/', IntegrationsRoute);
app.use('/api/v1/test', TestRoute);

app.use('/api/v1/tools/', require('./app/tools/routes'));

// Routes

app.post('/api/v1/files', S3Manager.upload);
app.delete('/api/v1/files', S3Manager.delete);
app.get('/api/v1/files/logs', S3Manager.logs);


// Dashboard
app.get('/maintenance/sales/delete', (req, res, next) => {
    var queries = req.query;
    var date = queries.date;

    var Stock = req.modelFactory.get('Stock');
    var Documents = req.modelFactory.get('Documents');
    var Pendants = req.modelFactory.get('Pendants');
    var Cashflow = req.modelFactory.get('Cashflow');

    Stock.deleteMany({date: new Date(date)}, (err, result) => {
        if(err) return next(err);
    });

    Documents.deleteMany({date: new Date(date)}, (err, result) => {
        if(err) return next(err);
    });

    Pendants.deleteMany({date: new Date(date)}, (err, result) => {
        if(err) return next(err);
    });

    Cashflow.deleteMany({date: new Date(date)}, (err, result) => {
        if(err) return next(err);
    });

    res.send({"status": 1});
    req.onSend();
});

app.get('/api/v1/dashboard', (req, res, next) => {
    var Documents = req.modelFactory.get('Documents');
    var Tables = req.modelFactory.get('Tables');
    var Sales = req.modelFactory.get('Sales');
    var Stock = req.modelFactory.get('Stock');
    var Orders = req.modelFactory.get('Orders');
    var tables, documents, orders, stock;
    Orders.aggregate(
        [
            { 
                "$project" : {
                    "finalized" : {
                        "$cond" : [
                            {
                                "$eq" : [
                                    "$status", 
                                    false
                                ]
                            }, 
                            {
                                "$sum" : 1
                            }, 
                            0
                        ]
                    }, 
                    "opened" : {
                        "$cond" : [
                            {
                                "$eq" : [
                                    "$status", 
                                    true
                                ]
                            }, 
                            {
                                "$sum" : 1
                            }, 
                            0
                        ]
                    }
                }
            }, 
            { 
                "$group" : {
                    "_id" : null, 
                    "opened" : {
                        "$sum" : "$opened"
                    }, 
                    "finalized" : {
                        "$sum" : "$finalized"
                    }
                }
            },
            {   "$project": {
                "_id": 0,
                "opened": 1,
                "finalized": 1
            }}
        ], (err, result) => {
            orders = result;
        });

    Documents.aggregate(
        [
            { 
                "$unwind" : {
                    "path" : "$invoices"
                }
            }, 
            { 
                "$project" : {
                    "invoiceId" : "$invoices.id", 
                    "documentNumber" : "$invoices.documentNumber", 
                    "date" : "$invoices.date", 
                    "amount" : "$invoices.amount", 
                    "status" : "$invoices.status", 
                    "expirationDate" : "$invoices.expirationDate", 
                    "payDate" : "$invoices.payDate", 
                    "documentType" : "$documentType"
                }
            }, 
            { 
                "$match" : {
                    "status" : 0
                }
            }, 
            { 
                "$group" : {
                    "_id" : "$documentType", 
                    "amount" : {
                        "$sum" : "$amount"
                    }
                }
            }, 
            { 
                "$project" : {
                    "_id" : 0,
                    "name" : {
                        "$cond" : [
                            {
                                "$eq" : [
                                    "$_id", 
                                    2
                                ]
                            }, 
                            "documentsToPay", 
                            "documentsToReceive"
                        ]
                    }, 
                    "amount" : 1
                }
            }
        ], (err, result) => {
          console.log(result);
          documents = result;
      });
        Sales.aggregate(
        [
            { 
                "$match" : {
                    "isProcessed" : false
                }
            }, 
            { 
                "$project" : {
                    "total" : {
                        "$subtract" : [
                            "$total", 
                            {
                                "$arrayElemAt" : [
                                    "$discounts.amount", 
                                    0
                                ]
                            }
                        ]
                    }
                }
            }, 
            { 
                "$group" : {
                    "_id" : null, 
                    "amount" : {
                        "$sum" : "$total"
                    }
                }
            }, 
            { 
                "$match" : {
    
                }
            }
        ], (err, result) => {
            let sales = result;
            Stock.aggregate([
                {
                    "$match": {"outputType": "sales"}
                },
                { 
                    "$sort" : {
                        "createdAt" : -1
                    }
                }, 
                { 
                    "$group" : {
                        "_id" : null, 
                        "amount" : {
                            "$sum" : "$subtotalPrice"
                        }
                    }
                }
            ], (err, result) => {
                    stock = result;
            });
            let stockAmount = 0;
            if(typeof stock !== 'undefined' && stock.length > 0) {
                stockAmount = stock[0].amount;
            } else {
                stockAmount = 0;
            }
            if(typeof sales !== 'undefined' && sales.length > 0) {
                salesAmount = sales[0].amount;
            } else {
                salesAmount = 0;
            }
            console.log('Stock Amount', stockAmount, 'Sales Amount', salesAmount);
        })
        
      Tables.aggregate(
        [
          { 
              "$project" : {
                  "opened" : {
                      "$cond" : [
                          {
                              "$eq" : [
                                  "$condition", 
                                  "Free"
                              ]
                          }, 
                          {
                              "$sum" : 1
                          }, 
                          0
                      ]
                  }, 
                  "closed" : {
                      "$cond" : [
                          {
                              "$ne" : [
                                  "$condition", 
                                  "Free"
                              ]
                          }, 
                          {
                              "$sum" : 1
                          }, 
                          0
                      ]
                  }
              }
          }, 
          { 
              "$group" : {
                  "_id" : null, 
                  "opened" : {
                      "$sum" : "$opened"
                  }, 
                  "closed" : {
                      "$sum" : "$closed"
                  }
              }
          }, 
          { 
              "$project" : {
                  "_id" : 0, 
                  "opened" : 1, 
                  "closed" : 1
              }
          }
      ], (err, result) => {
          tables = result;
          console.log('llego')
          var salesPerHour = {
            'amount': 0,
            'quantity': 0
          };
          var salesPerDay = {
            'amount': 0,
            'quantity': 0
          };
          var salesPerWeek = {
            'amount': 0,
            'quantity': 0
          };
          var salesPerMonth = {
            'amount': 0,
            'quantity': 0
          };
          
          
          (async () => {
            hourDate = moment().subtract(1, 'hours').format("YYYY-MM-DDT").toString().concat('00:00:00.000-0200');
            dayDate = moment().subtract(1, 'days').format("YYYY-MM-DDT").toString().concat('00:00:00.000-0200');
            weekDate = moment().subtract(1, 'weeks').format("YYYY-MM-DDT").toString().concat('00:00:00.000-0200');
            monthDate = moment().subtract(1, 'months').format("YYYY-MM-DDT").toString().concat('00:00:00.000-0200');

            var hourSales = await Sales.find({"status": {$ne: null}, "date": {$gte: new Date(hourDate)}}).exec();
            var daySales = await Sales.find({"status": {$ne: null}, "date": {$gte: new Date(dayDate)}}).exec();
            var weekSales = await Sales.find({"status": {$ne: null}, "date": {$gte: new Date(weekDate)}}).exec();
            var monthSales = await Sales.find({"status": {$ne: null}, "date": {$gte: new Date(monthDate)}}).exec();

            salesPerHour.quantity = Object.keys(hourSales).length; 
            for(let i = 0; i < Object.keys(hourSales).length; i++) {
              salesPerHour.amount += (hourSales[i].total);
            }
            salesPerDay.quantity = Object.keys(daySales).length;
            for(let i = 0; i < Object.keys(daySales).length; i++) {
              salesPerDay.amount += (daySales[i].total);
            }

            salesPerWeek.quantity = Object.keys(weekSales).length;
            for(let i = 0; i < Object.keys(weekSales).length; i++) {
              salesPerWeek.amount += (weekSales[i].total);
            }

            salesPerMonth.quantity = Object.keys(monthSales).length;
            for(let i = 0; i < Object.keys(monthSales).length; i++) {
              salesPerMonth.amount += (monthSales[i].total);
            }
 

            var documentsToPay, documentsToReceive, ordersOpened, ordersFinalized, tablesCount = 0;
            if(typeof documents[1] != 'undefined') {
                documentsToPay = documents[1].amount
            }
            if(typeof documents[0] != 'undefined') {
                documentsToReceive = documents[0].amount;
            }
            if(typeof orders[0] != 'undefined') {
                ordersOpened = orders[0].opened;
                ordersFinalized = orders[0].finalized;
            }
            if(typeof tables[0] != 'undefined'){
                tablesCount = tables[0];
            }
            res.send({'stock': stock, 'tables': tablesCount, 'documentsToPay': documentsToPay, 'documentsToReceive': documentsToReceive, 'salesPerHour': salesPerHour, 'salesPerDay': salesPerDay, 'salesPerWeek': salesPerWeek, 'salesPerMonth': salesPerMonth, 'ordersOpened': ordersOpened, 'ordersFinalized': ordersFinalized});
            req.onSend();
        })();
    });
});

// Catch 404 error and handle

app.use(function(req, res, next) {
    var err = new Error('Resource not found or missed required parameter: ' + req.url);
    err.status = 404;
    console.error(err);
    next(err);
});

// Handle all the errors and set the status to the response

app.use(function(err, req, res, next) {
    // formulate an error response here
    res.status(err.status || 500);
    console.log(err);
    res.json({
        'err': err.message,
        'status': 0
    });
    req.onSend();
});


app.listen(3000, function() {

    // We are done!
    console.log("Listening..");

});