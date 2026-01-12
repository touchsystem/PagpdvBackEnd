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



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ "limit": '10mb' }));

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

app.use(function (req, res, next) {
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

    Stock.deleteMany({ date: new Date(date) }, (err, result) => {
        if (err) return next(err);
    });

    Documents.deleteMany({ date: new Date(date) }, (err, result) => {
        if (err) return next(err);
    });

    Pendants.deleteMany({ date: new Date(date) }, (err, result) => {
        if (err) return next(err);
    });

    Cashflow.deleteMany({ date: new Date(date) }, (err, result) => {
        if (err) return next(err);
    });

    res.send({ "status": 1 });
    req.onSend();
});


app.get('/api/v1/dashboard', (req, res, next) => {
    var CashFlow = req.modelFactory.get('Cashflow');
    var Accounts = req.modelFactory.get('Accounts');
    var Documents = req.modelFactory.get('Documents');
    var Tables = req.modelFactory.get('Tables');
    var Sales = req.modelFactory.get('Sales');
    var Stock = req.modelFactory.get('Stock');
    var Orders = req.modelFactory.get('Orders');
    var tables, documents, orders, stock, cashflow, accounts;

    const caixas = ["111102", "111106", "111204", "111202", "111201", "111101"];



    // Orders.aggregate(
    //     [
    //         { 
    //             "$project" : {
    //                 "finalized" : {
    //                     "$cond" : [
    //                         {
    //                             "$eq" : [
    //                                 "$status", 
    //                                 false
    //                             ]
    //                         }, 
    //                         {
    //                             "$sum" : 1
    //                         }, 
    //                         0
    //                     ]
    //                 }, 
    //                 "opened" : {
    //                     "$cond" : [
    //                         {
    //                             "$eq" : [
    //                                 "$status", 
    //                                 true
    //                             ]
    //                         }, 
    //                         {
    //                             "$sum" : 1
    //                         }, 
    //                         0
    //                     ]
    //                 }
    //             }
    //         }, 
    //         { 
    //             "$group" : {
    //                 "_id" : null, 
    //                 "opened" : {
    //                     "$sum" : "$opened"
    //                 }, 
    //                 "finalized" : {
    //                     "$sum" : "$finalized"
    //                 }
    //             }
    //         },
    //         {   "$project": {
    //             "_id": 0,
    //             "opened": 1,
    //             "finalized": 1
    //         }}
    //     ], (err, result) => {
    //         orders = result;
    //     });

    const inicioMes = moment().startOf('month').toDate();
    const fimMes = moment().endOf('month').toDate();
    // const inicioMes = moment('2025-05-01').toDate();
    console.log("inicioMes ", inicioMes);
    // const fimMes = moment('2025-05-28').toDate();
    console.log("fim mes ", fimMes);
    function getAccounts() {
        return Accounts.aggregate([
            { $match: { accountNumber: { $in: caixas }, status: 0 } },
            { $project: { _id: 0, accountNumber: 1, denomination: 1, currency: 1 } }
        ]).exec().then(result => {
            return result.sort((a, b) => {
                const aIsBanco = a.denomination.toUpperCase().startsWith('BANCO');
                const bIsBanco = b.denomination.toUpperCase().startsWith('BANCO');
                const aIsCaixa = a.denomination.toUpperCase().startsWith('CAIXA');
                const bIsCaixa = b.denomination.toUpperCase().startsWith('CAIXA');
                if (aIsBanco && !bIsBanco) return -1;
                if (!aIsBanco && bIsBanco) return 1;
                if (aIsCaixa && !bIsCaixa) return 1;
                if (!aIsCaixa && bIsCaixa) return -1;
                return (a.denomination || '').localeCompare(b.denomination || '');
            });
        });
    }
    function getCashflow() {
        return CashFlow.aggregate([
            { $match: { accountNumber: { $in: caixas } } },
            { $group: { _id: "$accountNumber", saldo: { $sum: { $subtract: ["$debitAmount", "$creditAmount"] } }, count: { $sum: 1 } } }
        ]).exec();
    }
    // ,
    function getSaldoAcumuladoPorCaixa() {
        return CashFlow.find({
            accountNumber: { $in: caixas },
            date: { $gte: inicioMes, $lte: fimMes }
        }).exec().then(lancamentos => {
            const saldosPorCaixaPorDia = {};
            lancamentos.forEach(lancamento => {
                const caixa = lancamento.accountNumber;
                const dia = lancamento.date.toISOString().substr(0, 10);
                if (!saldosPorCaixaPorDia[caixa]) saldosPorCaixaPorDia[caixa] = {};
                if (!saldosPorCaixaPorDia[caixa][dia]) saldosPorCaixaPorDia[caixa][dia] = 0;
                saldosPorCaixaPorDia[caixa][dia] += (lancamento.debitAmount - lancamento.creditAmount);
            });
            const saldoAcumuladoPorCaixa = {};
            Object.keys(saldosPorCaixaPorDia).forEach(caixa => {
                let saldo = 0;
                saldoAcumuladoPorCaixa[caixa] = [];
                const dias = Object.keys(saldosPorCaixaPorDia[caixa]).sort();
                dias.forEach(dia => {
                    saldo += saldosPorCaixaPorDia[caixa][dia];
                    saldoAcumuladoPorCaixa[caixa].push({ dia, saldo });
                });
            });
            return saldoAcumuladoPorCaixa;
        });
    }

    function getDocuments() {
        return Documents.aggregate([
            { "$unwind": { "path": "$invoices" } },
            { "$project": { "invoiceId": "$invoices.id", "documentNumber": "$invoices.documentNumber", "date": "$invoices.date", "amount": "$invoices.amount", "status": "$invoices.status", "expirationDate": "$invoices.expirationDate", "payDate": "$invoices.payDate", "documentType": "$documentType" } },
            { "$match": { "status": 0 } },
            { "$group": { "_id": "$documentType", "amount": { "$sum": "$amount" } } },
            { "$project": { "_id": 0, "name": { "$cond": [{ "$eq": ["$_id", 2] }, "documentsToPay", "documentsToReceive"] }, "amount": 1 } }
        ]).exec();
    }

    Promise.all([
        getAccounts(),
        getCashflow(),
        getSaldoAcumuladoPorCaixa(),
        getDocuments()
    ]).then(([accounts, cashflow, saldoAcumuladoPorCaixa, documents]) => {
        let documentsToPay, documentsToReceive;
        if (typeof documents[1] != 'undefined') {
            documentsToPay = documents[1].amount;
        }
        if (typeof documents[0] != 'undefined') {
            documentsToReceive = documents[0].amount;
        }
        res.send({
            documentsToPay,
            documentsToReceive,
            cashflow,
            accounts,
            saldoAcumuladoPorCaixas: saldoAcumuladoPorCaixa
        });
        req.onSend();
    }).catch(err => {
        console.error(err);
        res.status(500).send({ error: 'Erro ao buscar dados' });
    });
    /*Accounts.aggregate([
        {
            $match: {
                accountNumber: { $in: caixas },
                status: 0
            }
        },
        {
            $project: {
                _id: 0,
                accountNumber: 1,
                denomination: 1
            }
        }
    ], (err, result) => {

        if (err) {
            console.error(err);
        } else {
            accounts = result.sort((a, b) => {
                const aIsBanco = a.denomination.toUpperCase().startsWith('BANCO');
                const bIsBanco = b.denomination.toUpperCase().startsWith('BANCO');
                const aIsCaixa = a.denomination.toUpperCase().startsWith('CAIXA');
                const bIsCaixa = b.denomination.toUpperCase().startsWith('CAIXA');

                if (aIsBanco && !bIsBanco) return -1;
                if (!aIsBanco && bIsBanco) return 1;
                if (aIsCaixa && !bIsCaixa) return 1;
                if (!aIsCaixa && bIsCaixa) return -1;

                // Se ambos são do mesmo tipo ou nenhum dos dois, ordena por nome
                return (a.denomination || '').localeCompare(b.denomination || '');
            });
            console.log(accounts);
        }
        // res.send({ cashflow });
        // req.onSend();
    }
    )*/

    /*
    CashFlow.aggregate([
        {
            $match: {
                accountNumber: { $in: caixas }
            }
        },
        {
            $group: {
                _id: "$accountNumber",
                saldo: { $sum: { $subtract: ["$debitAmount", "$creditAmount"] } },
                count: { $sum: 1 }
            }
        }
    ], (err, result) => {
        cashflow = result;
        if (err) {
            console.error(err);
        } else {
            console.log(result);
        }
        // res.send({ cashflow });
        // req.onSend();
    }
    )*/

    // const inicioMes = new Date(2025, 3, 1, 0, 0, 0);
    // const fimMes = new Date(2025, 5 + 1, 0, 23, 59, 59);

    /*
    const saldosPorCaixaPorDia = {};
    const saldoAcumuladoPorCaixa = {};
    CashFlow.find({
        date: { $gte: inicioMes, $lte: fimMes }
    }).exec((err, lancamentos) => {
        if (err) {
            return "Entrou no erro";
        }
        lancamentos.forEach(lancamento => {
            const caixa = lancamento.accountNumber;
            const dia = lancamento.date.toISOString().substr(0, 10);
            if (!saldosPorCaixaPorDia[caixa]) saldosPorCaixaPorDia[caixa] = {};
            if (!saldosPorCaixaPorDia[caixa][dia]) saldosPorCaixaPorDia[caixa][dia] = 0;

            saldosPorCaixaPorDia[caixa][dia] += (lancamento.debitAmount - lancamento.creditAmount);
        });



        Object.keys(saldosPorCaixaPorDia).forEach(caixa => {
            let saldo = 0;
            saldoAcumuladoPorCaixa[caixa] = [];
            // Ordena os dias
            const dias = Object.keys(saldosPorCaixaPorDia[caixa]).sort();
            dias.forEach(dia => {
                saldo += saldosPorCaixaPorDia[caixa][dia];
                saldoAcumuladoPorCaixa[caixa].push({ dia, saldo });
            });
        });

        console.log("Saldo Acumulador por Caixa - ", saldoAcumuladoPorCaixa);
    }) */


    /*
       Documents.aggregate(
           [
               {
                   "$unwind": {
                       "path": "$invoices"
                   }
               },
               {
                   "$project": {
                       "invoiceId": "$invoices.id",
                       "documentNumber": "$invoices.documentNumber",
                       "date": "$invoices.date",
                       "amount": "$invoices.amount",
                       "status": "$invoices.status",
                       "expirationDate": "$invoices.expirationDate",
                       "payDate": "$invoices.payDate",
                       "documentType": "$documentType"
                   }
               },
               {
                   "$match": {
                       "status": 0
                   }
               },
               {
                   "$group": {
                       "_id": "$documentType",
                       "amount": {
                           "$sum": "$amount"
                       }
                   }
               },
               {
                   "$project": {
                       "_id": 0,
                       "name": {
                           "$cond": [
                               {
                                   "$eq": [
                                       "$_id",
                                       2
                                   ]
                               },
                               "documentsToPay",
                               "documentsToReceive"
                           ]
                       },
                       "amount": 1
                   }
               }
           ], (err, result) => {
               console.log(result);
               documents = result;
   
               var documentsToPay, documentsToReceive;
               if (typeof documents[1] != 'undefined') {
                   documentsToPay = documents[1].amount
               }
               if (typeof documents[0] != 'undefined') {
                   documentsToReceive = documents[0].amount;
               }
   
               res.send({ 'documentsToPay': documentsToPay, 'documentsToReceive': documentsToReceive, 'cashflow': cashflow, 'accounts': accounts, 'saldoAcumuladoPorCaixas': saldoAcumuladoPorCaixa });
               req.onSend();
           }); */

    // Sales.aggregate(
    //     [
    //         {
    //             "$match": {
    //                 "isProcessed": false
    //             }
    //         },
    //         {
    //             "$project": {
    //                 "total": {
    //                     "$subtract": [
    //                         "$total",
    //                         {
    //                             "$arrayElemAt": [
    //                                 "$discounts.amount",
    //                                 0
    //                             ]
    //                         }
    //                     ]
    //                 }
    //             }
    //         },
    //         {
    //             "$group": {
    //                 "_id": null,
    //                 "amount": {
    //                     "$sum": "$total"
    //                 }
    //             }
    //         },
    //         {
    //             "$match": {

    //             }
    //         }
    //     ], (err, result) => {
    //         let sales = result;
    //         Stock.aggregate([
    //             {
    //                 "$match": { "outputType": "sales" }
    //             },
    //             {
    //                 "$sort": {
    //                     "createdAt": -1
    //                 }
    //             },
    //             {
    //                 "$group": {
    //                     "_id": null,
    //                     "amount": {
    //                         "$sum": "$subtotalPrice"
    //                     }
    //                 }
    //             }
    //         ], (err, result) => {
    //             stock = result;
    //         });
    //         let stockAmount = 0;
    //         if (typeof stock !== 'undefined' && stock.length > 0) {
    //             stockAmount = stock[0].amount;
    //         } else {
    //             stockAmount = 0;
    //         }
    //         if (typeof sales !== 'undefined' && sales.length > 0) {
    //             salesAmount = sales[0].amount;
    //         } else {
    //             salesAmount = 0;
    //         }
    //         console.log('Stock Amount', stockAmount, 'Sales Amount', salesAmount);
    //     })

    // Tables.aggregate(
    //     [
    //         {
    //             "$project": {
    //                 "opened": {
    //                     "$cond": [
    //                         {
    //                             "$eq": [
    //                                 "$condition",
    //                                 "Free"
    //                             ]
    //                         },
    //                         {
    //                             "$sum": 1
    //                         },
    //                         0
    //                     ]
    //                 },
    //                 "closed": {
    //                     "$cond": [
    //                         {
    //                             "$ne": [
    //                                 "$condition",
    //                                 "Free"
    //                             ]
    //                         },
    //                         {
    //                             "$sum": 1
    //                         },
    //                         0
    //                     ]
    //                 }
    //             }
    //         },
    //         {
    //             "$group": {
    //                 "_id": null,
    //                 "opened": {
    //                     "$sum": "$opened"
    //                 },
    //                 "closed": {
    //                     "$sum": "$closed"
    //                 }
    //             }
    //         },
    //         {
    //             "$project": {
    //                 "_id": 0,
    //                 "opened": 1,
    //                 "closed": 1
    //             }
    //         }
    //     ], (err, result) => {
    //         tables = result;
    //         console.log('llego')
    //         var salesPerHour = {
    //             'amount': 0,
    //             'quantity': 0
    //         };
    //         var salesPerDay = {
    //             'amount': 0,
    //             'quantity': 0
    //         };
    //         var salesPerWeek = {
    //             'amount': 0,
    //             'quantity': 0
    //         };
    //         var salesPerMonth = {
    //             'amount': 0,
    //             'quantity': 0
    //         };


    //         (async () => {
    //             hourDate = moment().subtract(1, 'hours').format("YYYY-MM-DDT").toString().concat('00:00:00.000-0200');
    //             dayDate = moment().subtract(1, 'days').format("YYYY-MM-DDT").toString().concat('00:00:00.000-0200');
    //             weekDate = moment().subtract(1, 'weeks').format("YYYY-MM-DDT").toString().concat('00:00:00.000-0200');
    //             monthDate = moment().subtract(1, 'months').format("YYYY-MM-DDT").toString().concat('00:00:00.000-0200');

    //             var hourSales = await Sales.find({ "status": { $ne: null }, "date": { $gte: new Date(hourDate) } }).exec();
    //             var daySales = await Sales.find({ "status": { $ne: null }, "date": { $gte: new Date(dayDate) } }).exec();
    //             var weekSales = await Sales.find({ "status": { $ne: null }, "date": { $gte: new Date(weekDate) } }).exec();
    //             var monthSales = await Sales.find({ "status": { $ne: null }, "date": { $gte: new Date(monthDate) } }).exec();

    //             salesPerHour.quantity = Object.keys(hourSales).length;
    //             for (let i = 0; i < Object.keys(hourSales).length; i++) {
    //                 salesPerHour.amount += (hourSales[i].total);
    //             }
    //             salesPerDay.quantity = Object.keys(daySales).length;
    //             for (let i = 0; i < Object.keys(daySales).length; i++) {
    //                 salesPerDay.amount += (daySales[i].total);
    //             }

    //             salesPerWeek.quantity = Object.keys(weekSales).length;
    //             for (let i = 0; i < Object.keys(weekSales).length; i++) {
    //                 salesPerWeek.amount += (weekSales[i].total);
    //             }

    //             salesPerMonth.quantity = Object.keys(monthSales).length;
    //             for (let i = 0; i < Object.keys(monthSales).length; i++) {
    //                 salesPerMonth.amount += (monthSales[i].total);
    //             }


    //             var documentsToPay, documentsToReceive, ordersOpened, ordersFinalized, tablesCount = 0;
    //             if (typeof documents[1] != 'undefined') {
    //                 documentsToPay = documents[1].amount
    //             }
    //             if (typeof documents[0] != 'undefined') {
    //                 documentsToReceive = documents[0].amount;
    //             }
    //             if (typeof orders[0] != 'undefined') {
    //                 ordersOpened = orders[0].opened;
    //                 ordersFinalized = orders[0].finalized;
    //             }
    //             if (typeof tables[0] != 'undefined') {
    //                 tablesCount = tables[0];
    //             }
    //             res.send({ 'stock': stock, 'tables': tablesCount, 'documentsToPay': documentsToPay, 'documentsToReceive': documentsToReceive, 'salesPerHour': salesPerHour, 'salesPerDay': salesPerDay, 'salesPerWeek': salesPerWeek, 'salesPerMonth': salesPerMonth, 'ordersOpened': ordersOpened, 'ordersFinalized': ordersFinalized });
    //             req.onSend();
    //         })();
    //     });
});
// Catch 404 error and handle

app.use(function (req, res, next) {
    var err = new Error('Resource not found or missed required parameter: ' + req.url);
    err.status = 404;
    console.error(err);
    next(err);
});

// Handle all the errors and set the status to the response

app.use(function (err, req, res, next) {
    // formulate an error response here
    res.status(err.status || 500);
    console.log(err);
    res.json({
        'err': err.message,
        'status': 0
    });
    req.onSend();
});


app.listen(3000, function () {

    // We are done!
    console.log("Listening..");

});