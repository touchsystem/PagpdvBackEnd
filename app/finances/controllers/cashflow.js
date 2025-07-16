var formidable = require('formidable');
var fs = require('fs');
var numeral = require('numeral');
var moment = require('moment');
var tempfile = require('tempfile');
var pdf = require('phantom-html2pdf');
var exec = require('child_process').exec;
var settings = require('../config');

numeral.locale('pt-br');
moment.locale('pt-br');

exports.create = (req, res, next) => {
    /**
     * 
     * @api {post} /cashflow Crear una Cuenta Contable
     * @apiName Creación
     * @apiGroup Flujo de Caja Contable
     * @apiVersion  0.0.1
     * 
     * 
     * @apiParam  (body) {String} documentNumber Número de Factura
     * @apiParam (body) {String} accountNumber Número de Cuenta Contable
     * @apiParam (body) {Object[]} observations Observaciones del Flujo de Caja
     * @apiParam (body) {Number} creditAmount Monto asignado en la Columna Crédito
     * @apiParam (body) {Number} debitAmount Monto asignado en la Columna Débito
     * @apiParam (body) {String} date Fecha en Formato ISOString
     * 
     * @apiSuccess (200) {type} status Estado de la Operación
     * 
     * @apiParamExample  {type} Request-Example:
     * {
     *     "documentNumber": "001-001-0004991",
     *     "accountNumber": "211101",
     *     "observations": [{"description": "Pago de Factura 31/07/2018"}],
     *     "creditAmount": 100.00
     *     "debitAmount": 0
     * }
     * 
     * @apiSuccessExample {json} Success-Response:
     * {
     *     "status": 1
     * }
     * 
     * 
     */
    if (typeof req != 'undefined') {
        var obj = [];
        var params = req.body;
        var count = Object.keys(params).length;
        var i = 0;
        params.forEach(element => {
            obj.push({
                documentNumber: element.documentNumber,
                accountNumber: element.accountNumber,
                observations: element.observations,
                creditAmount: element.creditAmount,
                debitAmount: element.debitAmount,
                currency: element.currency,
                date: element.date
            });
        });
        var Cashflow = req.modelFactory.get('Cashflow');
        Cashflow.insertMany(obj, (err, result) => {
            if (err) {
                console.error(err);
                return next(err);
            }
            res.send({ 'status': 1 });
            req.onSend();
        });
    }
}

/*

    Function to import cashflow from the old database,
    this functions waits a JSON file like this:

    [{'debito': 12.00, 'credito': 0, 'id_conta': 11101, 'id_proveedor': }]

*/


exports.import = (req, res, next) => {
    /*console.log(req.fields);
    console.log(req.files);*/
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        var count = Object.keys(files).length;
        console.log(count);
        if (count >= 1) {
            var file = files.files.path;
            fs.readFile(file, (err, data) => {
                //console.log(data.toString());
                var body = JSON.parse(data.toString());
                body.forEach(element => {
                    //console.log(element.ID);
                    var order = { 'P': 1, 'S': 2, 'T': 3, 'Q': 4, 'C': 5 };
                    console.log('El elemento es ' + element.TIPO + ' y su orden es' + order[element.TIPO]);
                    if (typeof order[element.TIPO] != 'undefined') {
                        let level = order[element.TIPO];
                        var obj = {
                            accountNumber: element.CONTA,
                            denomination: element.NOME_CONTA,
                            level: level,
                            saldoAnterior: 0,
                            debit: 0,
                            credit: 0,
                            saldo: 0
                        }
                        var Account = req.modelFactory.get('Accounts')(obj);
                        Account.save((err, result) => {
                            if (err) {
                                console.error(err);
                                return next(err);
                            }
                        })
                    }
                });
                res.json({ 'status': 1 });
                req.onSend();
            });
        }
    });
}

exports.accountsPdf = (req, res, next) => {
    /**
     * 
     * @api {get} /cashflow/reports/accounts Generar Reporte por Cuenta
     * @apiName Reporte por Cuentas
     * @apiGroup Flujo de Caja Contable
     * @apiVersion  0.0.1
     * 
     * @apiParam  (query) {String} startDate Fecha Inicial
     * @apiParam (query) {String} endDate Fecha Final
     * @apiParam (query) {String} account Número de la Cuenta Contable
     * 
     * 
     * @apiSuccessExample {pdf} Success-Response:
     * 'Este endpoint genera un archivo.'
     * 
     * 
     */
    var queries = req.query;
    var startDate = req.query.startDate;
    var endDate = req.query.endDate;
    var account = queries.account;
    var Cashflow = req.modelFactory.get('Cashflow');
    Cashflow.find({ 'accountNumber': account, 'date': { '$gte': new Date(startDate), '$lte': new Date(endDate) } }, (err, result) => {
        if (err) return next(err);
        var accountDetails = result;
        Cashflow.aggregate(
            [
                {
                    "$match": {
                        "accountNumber": account
                    }
                },
                {
                    "$group": {
                        "_id": "$accountNumber",
                        "cashflow_docs": {
                            "$push": {
                                "debitAmount": "$debitAmount",
                                "creditAmount": "$creditAmount",
                                "date": "$date"
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "_id": 1,
                        "cashflow_docs": {
                            "$filter": {
                                "input": "$cashflow_docs",
                                "as": "cashflow",
                                "cond": {
                                    "$and": [
                                        {
                                            "$gte": [
                                                "$$cashflow.date",
                                                new Date(startDate)
                                            ]
                                        },
                                        {
                                            "$lte": [
                                                "$$cashflow.date",
                                                new Date(endDate)
                                            ]
                                        }
                                    ]
                                }
                            }
                        },
                        "balance_docs": {
                            "$filter": {
                                "input": "$cashflow_docs",
                                "as": "balance",
                                "cond": {
                                    "$lt": [
                                        "$$balance.date",
                                        new Date(startDate)
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "accountNumber": "$_id",
                        "cashflowDebit": {
                            "$sum": "$cashflow_docs.debitAmount"
                        },
                        "cashflowCredit": {
                            "$sum": "$cashflow_docs.creditAmount"
                        },
                        "balanceDebit": {
                            "$sum": "$balance_docs.debitAmount"
                        },
                        "balanceCredit": {
                            "$sum": "$balance_docs.creditAmount"
                        },
                        "previousBalance": {
                            "$sum": {
                                "$subtract": [
                                    {
                                        "$sum": "$balance_docs.debitAmount"
                                    },
                                    {
                                        "$sum": "$balance_docs.creditAmount"
                                    }
                                ]
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "accountNumber": 1,
                        "cashflowDebit": 1,
                        "cashflowCredit": 1,
                        "previousBalance": 1,
                        "balance": {
                            "$subtract": [
                                {
                                    "$add": [
                                        "$previousBalance",
                                        "$cashflowDebit"
                                    ]
                                },
                                "$cashflowCredit"
                            ]
                        }
                    }
                }
            ], (err, result) => {
                if (err) return next(err);
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

                            table.balance > tbody > tr > td {
                                border: 1px solid black;
                            }
                        }
                    </style>
                </head>
                <body>
                <div align="left" class="header">
                    <b style="font-family: Arial; font-size: 25px">Rélatorio de Conta</b><br>
                    <b>Conta: ${account}</b><br>
                    <span style="font-family: Arial">Periodo: ${moment(startDate).format('L')} a ${moment(endDate).format('L')}</span><br><br>
                </div>
                <table align="center">
                    <thead style="padding-bottom: 1em;">
                            <tr>
                                <th>Data</th>
                                <th>Observações</th>
                                <th>Débito</th>
                                <th>Crédito</th>
                            </tr>
                    </thead>
                <tbody>
                <tr></tr>`;
                (async () => {
                    var totalDebitAmount = 0;
                    var totalCreditAmount = 0;
                    for (let i = 0; i < Object.keys(accountDetails).length; i++) {
                        let element = accountDetails[i];
                        html += `<tr>
                            <td width="100"><span>${moment(element.date).format('L')}</span></td>
                            <td width="220"><span>${element.observations}</span></td>
                            <td width="80" align="right"><span>${numeral(element.debitAmount).format('0,0.00')}</span></td>
                            <td width="80" align="right"><span>${numeral(element.creditAmount).format('0,0.00')}</span></td>
                        </tr>`;
                        totalDebitAmount += element.debitAmount;
                        totalCreditAmount += element.creditAmount;
                    }
                    html += `
                    <tr>
                        <td style="border-top: 3px solid black"colspan="3"><b style="text-transform: uppercase; font-family: Arial">Total:</b></td>
                        <td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalDebitAmount).format('0,0.00')}</b></td>
                        <td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalCreditAmount).format('0,0.00')}</b></td>
                    </tr>
                    </tbody>
                    </table>
                    <table class="balance">
                        <tbody>
                            <tr> 
                                <td><b>Saldo Anterior:</b> ${result[0].previousBalance}</td>
                                <td><b>Debito:</b> ${result[0].cashflowDebit}</td>
                                <td><b>Credito:</b> ${result[0].cashflowCredit}</td>
                                <td><b>Saldo:</b> ${result[0].balance}</td>
                            </tr>
                        </tbody>
                    </table>
                    </body>
                    </html>`;
                    var options = {
                        format: 'A4',
                        "border": {
                            "top": "1in",
                            "right": "0.5in",
                            "bottom": "1.5in",
                            "left": "0.5in"
                        },
                    };
                    /*res.setHeader('Content-Type', 'application/pdf');
                    pdf.create(html, options).toStream(function(err, stream) {
                        if(err) {
                            console.error(err);
                            return next(err);
                        }
                        stream.pipe(res);
                    });*/

                    var options = {
                        "html": html,
                        "paperSize": { format: 'Legal', orientation: 'portrait', border: '0.3in' }
                    }

                    var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
                    var endDate = moment(req.query.endDate).format('DD-MM-YYYY');

                    pdf.convert(options, function (err, result) {
                        var tmpPath = result.getTmpPath();
                        console.log(tmpPath);
                        S3Manager.uploadFromFile(tmpPath, 'pdf/balance-' + startDate + '-ao-' + endDate + '-', function (err, data) {
                            console.log(data, 'response');
                            res.send(data);
                            req.onSend();
                        });
                    });
                })();
            });
    });
}

exports.dailyPdf = async (req, res, next) => {
    /**
     * 
     * @api {get} /cashflow/reports/daily Generar Reporte Diario
     * @apiName Reporte de Flujo de Caja Diario
     * @apiGroup Flujo de Caja Contable
     * @apiVersion  0.0.1
     * 
     * 
     * @apiParam  (query) {String} startDate Fecha Inicial
     * @apiParam (query) {String} endDate Fecha final
     * @apiParam (query) {String} account Cuenta Contable
     * 
     * 
     * @apiSuccessExample {text} Success-Response:
     * 'Este endpoint genera un archivo.'
     * 
     * 
     */
    var queries = req.query;
    var filter = {};
    var startDate = queries.startDate;
    var endDate = queries.endDate;
    var currency = queries.currency;
    console.log("Currency -> " + currency);
    if (currency === 'ALL') {
        currency = '';
    }
    var title = "";
    if (queries.account) {
        filter["accountNumber"] = queries.account;
    }

    if (currency) {
        filter["currency"] = currency;
    }

    console.log("filter ", filter);
    console.log(startDate, 'startDate');
    console.log(endDate, 'endDate');


    if (startDate && endDate) {
        filter["date"] = { "$gte": moment(startDate).startOf('day').toDate(), "$lte": moment(endDate).endOf('day').toDate() };
        title = "Periodo " + moment(startDate).format("L") + " a: " + moment(endDate).format("L");
    } else {
        const startOfMonth = moment().startOf('month').format('YYYY-MM-DD hh:mm:ss');
        console.log(startOfMonth, 'startOfMonth');
        filter["date"] = { '$gte': new Date(startOfMonth), '$lte': new Date() };
        title = 'Mes: ' + moment().format('MMMM')
    }


    var match = { "$match": {} };

    if (startDate && endDate) {
        match["$match"] = {
            "date": { "$gte": moment(startDate).startOf('day').toDate(), "$lte": moment(endDate).endOf('day').toDate() },
            "currency": currency
        };

    } else {
        const startOfMonth = moment().startOf('month').format('YYYY-MM-DD hh:mm:ss');
        match["$match"] = {
            "date": { '$gte': new Date(startOfMonth), '$lte': new Date() },
            "currency": currency
        };
    }

    console.log("MATCH -> ", match);
    var result = await req.modelFactory.get('Cashflow').aggregate([match]).exec();
    console.log(result);
    console.log("FIM");
    var header = await req.modelFactory.get('Cashflow').aggregate([
        match,
        {
            "$group": {
                "_id": "$accountNumber",
                "currency": { "$first": "$currency" },
                "cashflow_docs": {
                    "$push": { "debitAmount": "$debitAmount", "creditAmount": "$creditAmount", "date": "$date" }
                }
            }
        },
        {
            "$project": {
                "_id": 1,
                "currency": 1,
                "cashflow_docs":
                {
                    "$filter": {
                        "input": "$cashflow_docs",
                        "as": "cashflow",
                        "cond": {
                            "$and": [
                                { "$gte": ["$$cashflow.date", new Date(startDate)] },
                                { "$lte": ["$$cashflow.date", new Date(endDate)] }
                            ]
                        }
                    }
                },
                "balance_docs":
                {
                    "$filter": {
                        "input": "$cashflow_docs",
                        "as": "balance",
                        "cond": { "$lt": ["$$balance.date", new Date(startDate)] }
                    }
                }
            }
        },
        {
            "$project":
            {
                "accountNumber": "$_id",
                "currency": 1,
                "cashflowDebit": { "$sum": "$cashflow_docs.debitAmount" },
                "cashflowCredit": { "$sum": "$cashflow_docs.creditAmount" },
                "balanceDebit": { "$sum": "$balance_docs.debitAmount" },
                "balanceCredit": { "$sum": "$balance_docs.creditAmount" },
                "previousBalance": {
                    "$sum": {
                        "$subtract": [
                            { "$sum": "$balance_docs.debitAmount" },
                            { "$sum": "$balance_docs.creditAmount" }
                        ]
                    }
                },
            }
        },
        {
            "$project": {
                "accountNumber": 1,
                "currency": 1,
                "cashflowDebit": 1,
                "cashflowCredit": 1,
                "previousBalance": 1,
                "balance": { "$subtract": [{ "$add": ["$previousBalance", "$cashflowDebit"] }, "$cashflowCredit"] }
            }
        },
        {
            "$group": {
                "_id": { type: "$type", currency: "$currency" },
                "cashflowDebit": { "$sum": "$cashflowDebit" },
                "cashflowCredit": { "$sum": "$cashflowCredit" },
                "previousBalance": { "$sum": "$previousBalance" },
                "balance": { "$sum": "$balance" }
            }
        }
    ]).exec();

    console.log("COMEÇO HEADER");
    console.log(header, 'header');
    console.log("FIM DO HEADER");
    console.log("Começo do FILTER");
    console.log(filter);
    console.log("Fim do FILTER");

    req.modelFactory.get('Cashflow').find(filter, (err, result) => {
        if (err) return next(err);
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
            <b style="font-family: Arial; font-size: 25px">Rélatorio de Fluxo</b><br>
            <span style="font-family: Arial">${title}</span><br><br>
        </div>
        <table align="center" width="100%">
            <thead style="padding-bottom: 1em;">
                    <tr>
                        <th>Data</th>
                        <th>Conta</th>
                        <th>Observações</th>
                        <th>Débito</th>
                        <th>Crédito</th>
                    </tr>
            </thead>
        <tbody>
        <tr></tr>`;
        (async () => {
            var totalDebitAmount = 0;
            var totalCreditAmount = 0;
            for (let i = 0; i < Object.keys(result).length; i++) {
                let element = result[i];
                var description = "";
                // console.log(typeof element.observations);

                if (typeof element.observations != 'undefined') {
                    if (Array.isArray(element.observations)) {
                        description = element.observations[0].description;
                    } else if (typeof element.observations == 'string') {
                        description = element.observations;
                    } else {
                        description = element.observations.description;
                    }
                } else {
                    description = 'Movimento de Caixa';
                }


                // console.log(description);
                html += `<tr>
                    <td width="100"><span>${moment(element.date).format('L')}</span></td>
                    <td width="150"><span>${element.accountNumber}</span></td>
                    <td width="220"><span>${description}</span></td>
                    <td width="80" align="right"><span>${numeral(element.debitAmount).format('0,0.00')}</span></td>
                    <td width="80" align="right"><span>${numeral(element.creditAmount).format('0,0.00')}</span></td>
                </tr>`;
                totalDebitAmount += element.debitAmount;
                totalCreditAmount += element.creditAmount;
            }
            html += `
            <tr>
                <td style="border-top: 3px solid black"colspan="3"><b style="text-transform: uppercase; font-family: Arial">Total:</b></td>
                <td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalDebitAmount).format('0,0.00')}</b></td>
                <td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalCreditAmount).format('0,0.00')}</b></td>
            </tr>
            </tbody>
            </table>
            <table>
                <tr>
                    <td colspan="3"><b>Sdo Anterior</b></td><td>${numeral(header[0].previousBalance).format('0,0.00')}</td>
                </tr>
                <tr>
                    <td colspan="3"><b>Credito</b></td><td>${numeral(header[0].cashflowCredit).format('0,0.00')}</td>
                </tr>
                <tr>
                    <td colspan="3"><b>Débito</b></td><td>${numeral(header[0].cashflowDebit).format('0,0.00')}</td>
                </tr>
                <tr>
                    <td colspan="3"><b>Saldo</b></td><td>${numeral(header[0].balance).format('0,0.00')}</td>
                </tr>
            </table>
            </body>
            </html>`;
        })();
        var options = {
            "html": html,
            "paperSize": { format: 'Legal', orientation: 'portrait', border: '0.3in' }
        }

        var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
        var endDate = moment(req.query.endDate).format('DD-MM-YYYY');

        pdf.convert(options, function (err, result) {
            var tmpPath = result.getTmpPath();
            console.log(tmpPath);
            S3Manager.uploadFromFile(tmpPath, 'pdf/cashflow-' + startDate + '-ao-' + endDate + '-', function (err, data) {
                console.log(data, 'response');
                res.send(data);
                req.onSend();
            });
        });
    }).sort({ date: 1 });
}

/*
exports.dailyPdf = (req, res, next) => {
    /**
     * 
     * @api {get} /cashflow/reports/daily Generar Reporte Diario
     * @apiName Reporte de Flujo de Caja Diario
     * @apiGroup Flujo de Caja Contable
     * @apiVersion  0.0.1
     * 
     * 
     * @apiParam  (query) {String} startDate Fecha Inicial
     * @apiParam (query) {String} endDate Fecha final
     * @apiParam (query) {String} account Cuenta Contable
     * 
     * 
     * @apiSuccessExample {text} Success-Response:
     * 'Este endpoint genera un archivo.'
     * 
     * 
     */
/*    var queries = req.query;
    var filter = {};
    var startDate = queries.startDate;
    var endDate = queries.endDate;
    var title = "";
    if(queries.account) {
        filter["accountNumber"] = queries.account;
    } 

    if(startDate && endDate) {
        filter["date"] = {"$gte": new Date(startDate), "$lte": new Date(endDate)};
        title = "Periodo "+moment(startDate).format("L")+" a: "+moment(endDate).format("L");
    } else {
        const startOfMonth = moment().startOf('month').format('YYYY-MM-DD hh:mm:ss');
        console.log(startOfMonth, 'startOfMonth');
        filter["date"] = {'$gte': new Date(startOfMonth), '$lte': new Date()};
        title = 'Mes: '+moment().format('MMMM')
    }
    
    console.log(filter);

    req.modelFactory.get('Cashflow').find(filter, (err, result) => {
        if(err) return next(err);
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
            <b style="font-family: Arial; font-size: 25px">Rélatorio de Fluxo</b><br>
            <span style="font-family: Arial">${title}</span><br><br>
        </div>
        <table align="center">
            <thead style="padding-bottom: 1em;">
                    <tr>
                        <th>Data</th>
                        <th>Conta</th>
                        <th>Observações</th>
                        <th>Débito</th>
                        <th>Crédito</th>
                    </tr>
            </thead>
        <tbody>
        <tr></tr>`;
        (async () => {
            var totalDebitAmount = 0;
            var totalCreditAmount = 0;
            for(let i = 0; i < Object.keys(result).length; i++) {
                let element = result[i];
                let description = "";
                if(typeof element.observations != 'undefined') {
                    if(Object.keys(element.observations).length == 1) {description = element.observations[0].description}
                }

                console.log(element.date);
            
                html += `<tr>
                    <td width="100"><span>${moment(element.date).format('L')}</span></td>
                    <td width="150"><span>${element.accountNumber}</span></td>
                    <td width="220"><span>${description}</span></td>
                    <td width="80" align="right"><span>${numeral(element.debitAmount).format('0,0.00')}</span></td>
                    <td width="80" align="right"><span>${numeral(element.creditAmount).format('0,0.00')}</span></td>
                </tr>`;
                totalDebitAmount += element.debitAmount;
                totalCreditAmount += element.creditAmount;
            }
            html += `
            <tr>
                <td style="border-top: 3px solid black"colspan="3"><b style="text-transform: uppercase; font-family: Arial">Total:</b></td>
                <td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalDebitAmount).format('0,0.00')}</b></td>
                <td style="border-top: 3px solid black" align="right"><b style="text-transform: uppercase; font-family: Arial">${numeral(totalCreditAmount).format('0,0.00')}</b></td>
            </tr>
            </tbody>
            </table>
            </body>
            </html>`;
        })();
        var options = {
            "html": html,
            "paperSize": {format: 'Legal', orientation: 'portrait', border: '0.3in'}
        }
        pdf.convert(options, function(err, result) {
            var tmpPath = result.getTmpPath();
            console.log(tmpPath);
            S3Manager.uploadFromFile(tmpPath, 'pdf/report', function(err, data){ 
                console.log(data, 'response');
                res.send(data);
                req.onSend();
            });
        });
    }).sort({date: 1});
}*/

exports.filter = (req, res, next) => {
    var page = req.query.page;
    limit = parseInt(req.query.limit, 10);
    var startDate = req.query.startDate;
    var endDate = req.query.endDate;
    var accountNumber = req.query.accountNumber;
    var models = req.modelFactory.getModels('Accounts', 'Cashflow');
    var match = { "$match": {} };
    var filter = {};
    if (typeof accountNumber != 'undefined' && accountNumber != null) {
        match["$match"] = { "accountNumber": accountNumber };
        filter["accountNumber"] = accountNumber;
    }

    if (typeof (startDate && endDate) != 'undefined') {
        filter["date"] = { '$gte': new Date(startDate), '$lte': new Date(endDate) };
    }

    models.Cashflow.aggregate(
        [
            match,
            {
                "$group": {
                    "_id": "$accountNumber",
                    "cashflow_docs": {
                        "$push": { "debitAmount": "$debitAmount", "creditAmount": "$creditAmount", "date": "$date" }
                    }
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "cashflow_docs":
                    {
                        "$filter": {
                            "input": "$cashflow_docs",
                            "as": "cashflow",
                            "cond": {
                                "$and": [
                                    { "$gte": ["$$cashflow.date", new Date(startDate)] },
                                    { "$lte": ["$$cashflow.date", new Date(endDate)] }
                                ]
                            }
                        }
                    },
                    "balance_docs":
                    {
                        "$filter": {
                            "input": "$cashflow_docs",
                            "as": "balance",
                            "cond": { "$lt": ["$$balance.date", new Date(startDate)] }
                        }
                    }
                }
            },
            {
                "$project":
                {
                    "accountNumber": "$_id",
                    "cashflowDebit": { "$sum": "$cashflow_docs.debitAmount" },
                    "cashflowCredit": { "$sum": "$cashflow_docs.creditAmount" },
                    "balanceDebit": { "$sum": "$balance_docs.debitAmount" },
                    "balanceCredit": { "$sum": "$balance_docs.creditAmount" },
                    "previousBalance": {
                        "$sum": {
                            "$subtract": [
                                { "$sum": "$balance_docs.debitAmount" },
                                { "$sum": "$balance_docs.creditAmount" }
                            ]
                        }
                    },
                }
            },
            {
                "$project": {
                    "accountNumber": 1,
                    "cashflowDebit": 1,
                    "cashflowCredit": 1,
                    "previousBalance": 1,
                    "balance": { "$subtract": [{ "$add": ["$previousBalance", "$cashflowDebit"] }, "$cashflowCredit"] }
                }
            },
            {
                "$group": {
                    "_id": "$type",
                    "cashflowDebit": { "$sum": "$cashflowDebit" },
                    "cashflowCredit": { "$sum": "$cashflowCredit" },
                    "previousBalance": { "$sum": "$previousBalance" },
                    "balance": { "$sum": "$balance" }
                }
            }
        ], (err, result) => {
            var header = result;
            console.log('Header', header);
            var Cashflow = req.modelFactory.get('Cashflow');
            console.log(filter);
            Cashflow.paginate(filter, { page: page, limit: limit, sort: { date: -1 } }, (err, result) => {
                if (err) {
                    console.error(err);
                    return next(err);
                }
                var body = result;
                res.send({ 'header': header, 'body': body });
                req.onSend();
            });
        }).sort({ accountNumber: 1 });
}

exports.show = (req, res, next) => {
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    var models = req.modelFactory.getModels('Contacts');
    var aggregate = models.Contacts.aggregate([
        { '$match': { 'status': 0 } },
        { "$lookup": { "from": "Cashflow", "localField": "_id", "foreignField": "businessPartnerId", "as": "cashflow_docs" } },
        {
            "$project": {
                "_id": 1,
                "$project": {
                    "_id": 1,
                    "cashflow": {
                        $filter: {
                            input: "$cashflow_docs",
                            as: "cashflow",
                            cond: { $eq: ["$$cashflow.status", 0] }
                        }
                    }
                }
            }
        }
    ]);
    req.modelFactory.get('Contacts').aggregatePaginate(aggregate, { page: page, limit: limit }, (err, result, pageCount, count) => {
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
    /**
     * 
     * @api {get} /cashflow/filter Listar Flujo de Caja con Filtros
     * @apiName Filtrar Flujo de Caja
     * @apiGroup Flujo de Caja Contable
     * @apiVersion  0.0.1
     * 
     * @apiParam (query) {Number} page Número de página a visualizar
     * @apiParam (query) {Number} limit Número de resultados a ser visualizado
     * @apiParam (query) {String} startDate Fecha inicial (Opcional)
     * @apiParam (query) {String} endDate Fecha final (Opcional)
     * @apiParam (query) {String} accountNumber Número de Cuenta Contable (Opcional)
     * 
     * @apiSuccess (200) {Object[]} header Cabecera del Flujo de Caja
     * @apiSuccess (200) {Number} header.balance Saldo Actual en el Flujo de Caja
     * @apiSuccess (200) {Number} header.cashflowCredit Credito total en el Flujo de Caja
     * @apiSuccess (200) {Number} header.cashflowDebit Debito total en el Flujo de Caja
     * @apiSuccess (200) {Number} header.previousBalance Saldo Anterior en el Flujo de Caja
     * @apiSuccess (200) {Object[]} body Cuerpo del Flujo de Caja
     * @apiSuccess (200) {Object[]} body.docs Array de objetos con los datos peticionados
     * @apiSuccess (200) {String} body.docs.accountNumber Número de la Cuenta Contable
     * @apiSuccess (200) {String} body.docs.denomination Denominación de la Cuenta Contable
     * @apiSuccess (200) {String} body.docs.currency Divisa monetaria de la Cuenta Contable
     * @apiSuccess (200) {Number} body.docs.level Nivel jerarquico de la Cuenta Contable
     * 
     * @apiSuccess (200) {Number} limit Límite de registros
     * @apiSuccess (200) {String} page Página actual
     * @apiSuccess (200) {Number} pages Cantidad de páginas generada con la consulta
     * @apiSuccess (200) {Number} total Cantidad de registros generados con la consulta
     * 
     * 
     * @apiSuccessExample {json} Respuesta Exitosa:
     * {
     *     "header": [
     *          {
     *              "balance": -977,
     *              "cashflowCredit": 0,
     *              "cashflowDebit": 0,
     *              "previousBalance": -922 
     *          }
     *     ]
     *     "body": [
     *          {
     *              "docs": [
     *                  {
     *                      "_id":"5b5b5348cad7322b6a3eb6f1",
     *                      "documentNumber":"001-002-1188444"
     *                      "accountNumber":"211101",
     *                      "date":"2018-07-12T00:00:00.000Z",
     *                      "creditAmount":461,
     *                      "debitAmount":0,
     *                      "observations":[{"description": "Compra de produtos - 12/07/2018"}]
     *                  },
     *                  {
     *                      "_id":"5b5b5348cad7322b6a3eb6f1",
     *                      "documentNumber":"001-002-1188444",
     *                      "accountNumber":"211101",
     *                      "date":"2018-07-12T00:00:00.000Z",
     *                      "creditAmount":461,
     *                      "debitAmount":0,
     *                      "observations":[{"description": "Compra de produtos - 12/07/2018"}]
     *                  }
     *              ],
     *              "limit": 10,
     *              "page": 1,
     *              "pages": 1,
     *              "total": 2
     *          }
     *      ] 
     * }
     * 
     * 
     */
    var queries = req.query;
    var startDate = req.query.startDate;
    var endDate = req.query.endDate;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    req.modelFactory.get('Cashflow').aggregate(
        [
            {
                "$group": {
                    "_id": "$accountNumber",
                    "cashflow_docs": {
                        "$push": { "debitAmount": "$debitAmount", "creditAmount": "$creditAmount", "date": "$date" }
                    }
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "cashflow_docs":
                    {
                        "$filter": {
                            "input": "$cashflow_docs",
                            "as": "cashflow",
                            "cond": {
                                "$and": [
                                    { "$gte": ["$$cashflow.date", new Date(startDate)] },
                                    { "$lte": ["$$cashflow.date", new Date(endDate)] }
                                ]
                            }
                        }
                    },
                    "balance_docs":
                    {
                        "$filter": {
                            "input": "$cashflow_docs",
                            "as": "balance",
                            "cond": { "$lt": ["$$balance.date", new Date(startDate)] }
                        }
                    }
                }
            },
            {
                "$project":
                {
                    "accountNumber": "$_id",
                    "cashflowDebit": { "$sum": "$cashflow_docs.debitAmount" },
                    "cashflowCredit": { "$sum": "$cashflow_docs.creditAmount" },
                    "balanceDebit": { "$sum": "$balance_docs.debitAmount" },
                    "balanceCredit": { "$sum": "$balance_docs.creditAmount" },
                    "previousBalance": {
                        "$sum": {
                            "$subtract": [
                                { "$sum": "$balance_docs.debitAmount" },
                                { "$sum": "$balance_docs.creditAmount" }
                            ]
                        }
                    },
                }
            },
            {
                "$project": {
                    "accountNumber": 1,
                    "cashflowDebit": 1,
                    "cashflowCredit": 1,
                    "previousBalance": 1,
                    "balance": { "$subtract": [{ "$add": ["$previousBalance", "$cashflowDebit"] }, "$cashflowCredit"] }
                }
            },
            {
                "$group": {
                    "_id": "$type",
                    "cashflowDebit": { "$sum": "$cashflowDebit" },
                    "cashflowCredit": { "$sum": "$cashflowCredit" },
                    "previousBalance": { "$sum": "$previousBalance" },
                    "balance": { "$sum": "$balance" }
                }
            }
        ], (err, result) => {
            let header = result;
            var aggregate = req.modelFactory.get('Cashflow').aggregate([
                {
                    "$project": {
                        "accountNumber": 1,
                        "creditAmount": 1,
                        "debitAmount": 1,
                        "date": 1,
                        "documentNumber": 1,
                        "observations": "$observations.description"
                    }
                }
            ]);
            req.modelFactory.get('Cashflow').aggregatePaginate(aggregate, { page: page, limit: limit }, (err, result, pageCount, count) => {
                if (err) {
                    console.error(err);
                    return next(err);
                }
                // Response with JSON in this standard format
                res.json({ "header": header, "body": { "docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount } });
                // Close the connection
                req.onSend();
            });
        });
}


exports.import = function (req, res, next) {
    obj = [];
    var form = new formidable.IncomingForm();
    form.maxFileSize = 200 * 1024 * 1024;
    form.parse(req, (err, fields, files) => {
        if (err) return next(err);
        let count = Object.keys(files).length;
        console.log(count);
        if (count >= 1) {
            var file = files.files.path;
            fs.readFile(file, (err, data) => {
                //console.log(data.toString());
                var body = JSON.parse(data.toString());
                var count = Object.keys(body).length;
                var iterate = new Promise(function (resolve, reject) {
                    var i = 0;
                    body.forEach(element => {
                        var debitAmount = numeral(element.DEBITO);
                        var creditAmount = numeral(element.CREDITO);
                        //console.log(debitAmount);
                        //var  = 
                        let ISODate = moment(element.DATA, "DD/MM/YYYY").format("YYYY-MM-DDT").toString().concat('00:00:00.000-0200');
                        //var ISODate = (new Date(moment(element.DATA, '')));
                        console.log('ISODate', ISODate);
                        obj.push({ accountNumber: element.CONTA, documentNumber: element.DOC, observations: element.OBS, debitAmount: debitAmount.value(), creditAmount: creditAmount.value(), date: { $date: ISODate } });
                        i++;
                        if (count == i) {
                            resolve(1);
                        }
                    });
                });
                iterate.then(function (result) {
                    //console.log(JSON.stringify(obj));
                    var filename = tempfile('.json');
                    //console.log('Nombre archivo', filename);
                    //var filename = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);;
                    //console.log(obj);
                    var json = JSON.stringify(obj);
                    console.log(json);
                    fs.writeFile(filename, json, { flag: 'w' }, (err) => {
                        if (err) return next(err);
                        var database = req.database;
                        console.log(database);
                        exec('mongoimport --uri "mongodb://touchsystem:4JK5Ky6O58nI9efw@touch1-shard-00-00-iuxja.mongodb.net:27017,touch1-shard-00-01-iuxja.mongodb.net:27017/' + database + '?ssl=true&replicaSet=Touch1-shard-0&authSource=admin" --collection Cashflow --drop --file ' + filename + ' --jsonArray', function (error, stdout, stderr) {
                            //console.log('stdout: ', stdout);
                            //console.log('stderr: ', stderr);
                            if (error !== null) {
                                //console.log('exec error: ', error);
                            }
                        });
                    });
                    /*var Cashflow = req.modelFactory.get('Cashflow');
                    Cashflow.insertMany(obj, (err, result) => {
                        if(err) return console.log(err);
                        console.log(result);
                        res.end();
                        req.onSend();
                    });*/
                });
            });
        }
    });
}

exports.detail = (req, res, next) => {
    /**
     * 
     * @api {get} /cashflow/:id Detalles del Flujo de Caja
     * @apiName Detalle
     * @apiGroup Flujo de Caja Contable
     * @apiVersion  0.0.1
     * 
     * 
     * @apiParam (path) {String} id ObjectId del Flujo de Caja
     * 
     * @apiSuccess (200) {String} accountNumber Número de la Cuenta Contable
     * @apiSuccess (200) {String} documentNumber Número de Factura
     * @apiSuccess (200) {ISOString} date Fecha del Sistema
     * @apiSuccess (200) {Number} creditAmount Monto en Crédito
     * @apiSuccess (200) {Number} debitAmount Monto en Débito
     * @apiSuccess (200) {Object[]} observations Observaciones del Flujo de Caja
     * 
     * 
     * @apiSuccessExample {json} Respuesta Exitosa:
     * {
     *     "accountNumber": "111101",
     *     "documentNumber": "001-001-00091919",
     *     "date": "2018-09-11T11:57:00",
     *     "creditAmount": 990.00,
     *     "debitAmount": 0,
     *     "observations": [{"description": "Pago de Factura"}]
     * }
     * 
     * 
     */
    var id = req.params.id;
    if (id != 'undefined' || id != 'null') {
        req.modelFactory.get('Cashflow').find({ _id: id }, (err, result) => {
            if (err) {
                console.error(err);
                return next(err);
            }
            res.send(result);
            req.onSend();
        });
    }
}

exports.update = (req, res, next) => {
    var id = req.params.id;
    if (id != 'undefined' || id != 'null') {
        var params = req.body;
        req.modelFactory.get('Cashflow').findById(id, (err, p) => {
            if (!p)
                next(new Error('No se ha podido encontrar el documento'));
            else {
                p.documentNumber = params.documentNumber,
                    p.accountId = params.accountId,
                    p.observations = params.observations,
                    p.debitAmount = params.debitAmount,
                    p.creditAmount = params.creditAmount;
                p.save(err => {
                    if (err) {
                        console.error(err);
                        return next(err);
                    }
                    res.json({ 'status': 1 });
                    req.onSend();
                })
            }
        })
    } else {
        next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
    }
}