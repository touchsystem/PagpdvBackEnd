var { performance } = require('perf_hooks');
var fs = require('fs');
var numeral = require('numeral');
var pdf = require('phantom-html2pdf');
var S3Manager = require('../../../helpers/S3-manager');
var Excel = require('exceljs');
const moment = require('moment');
var tempfile = require('tempfile');
numeral.register('locale', 'pt-br', {
    delimiters: {
        thousands: '.',
        decimal: ','
    },
    abbreviations: {
        thousand: 'mil',
        million: 'milhões',
        billion: 'b',
        trillion: 't'
    },
    ordinal: function (number) {
        return 'º';
    },
    currency: {
        symbol: 'R$'
    }
});
numeral.locale('pt-br');

exports.getDataFromBalance = (req, res, next, callback) => {
    var startDate = req.query.startDate;
    var endDate = req.query.endDate;
    var models = req.modelFactory.getModels('Accounts', 'Cashflow');
    models.Cashflow.aggregate(
        [
            {"$match": {"accountNumber": { $not: /^888.*/ } }},
            { 
                "$group" : {
                    "_id" : "$accountNumber", 
                    "cashflow_docs" : {
                        "$push" : {"debitAmount": "$debitAmount", "creditAmount": "$creditAmount", "date": "$date"}
                    }
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "cashflow_docs": 
                    {"$filter": {
                            "input": "$cashflow_docs",
                            "as": "cashflow", 
                            "cond":  {"$and": [
                                {"$gte": ["$$cashflow.date", new Date(startDate)]},
                                {"$lte": ["$$cashflow.date", new Date(endDate)]}
                         ]}    
                        }
                  },
                  "balance_docs": 
                  {"$filter":{
                      "input": "$cashflow_docs",
                      "as": "balance",
                      "cond": {"$lt": ["$$balance.date", new Date(startDate)]}
                  }}
              }
            },
            //{"$match": { "cashflow_docs": { "$not": {"$size": 0}}}},
            {"$project": 
                {
                    "accountNumber": "$_id",
                    "cashflowDebit": {"$sum": "$cashflow_docs.debitAmount"},
                    "cashflowCredit": {"$sum": "$cashflow_docs.creditAmount"},
                    "balanceDebit": {"$sum": "$balance_docs.debitAmount"},
                    "balanceCredit": {"$sum": "$balance_docs.creditAmount"}, 
                    "previousBalance" : {
                        
                            "$subtract" : [
                                {"$sum": "$balance_docs.creditAmount"},
                                {"$sum": "$balance_docs.debitAmount"}
                            ]
                        
                    },
                }
            },
            {"$project": {
                    "accountNumber": 1,
                    "cashflowDebit": 1,
                    "cashflowCredit": 1,
                    "previousBalance": 1,
                    "balance": {"$subtract": [{"$add": ["$previousBalance", "$cashflowCredit"]}, "$cashflowDebit"]}
            }}
        ], (err, result) => {
            if(err) return next(err);
            var cashflow = result;
            //console.log(cashflow);
            models.Accounts.find({status: 0, "accountNumber": { $not: /^888.*/ }}, (err, result) => {
                var accounts = result;
                //console.log(result);
                console.log(cashflow);
                var myKeys = Object.keys(cashflow);
                var matchingKeys = myKeys.map(function(key, item){
                    Object.keys(accounts).map(function(i, k){
                        //console.log(accounts[i]);
                        var m = accounts[i]['accountNumber'].toString();
                        var q = cashflow[key]['accountNumber'].toString();
                        if(q.substr(0, m.length) == m)  {
                            accounts[k]['previousBalance'] += cashflow[key]['previousBalance'];
                            accounts[k]['debit'] += cashflow[key]['cashflowDebit'];
                            accounts[k]['credit'] += cashflow[key]['cashflowCredit'];
                            accounts[k]['balance'] += cashflow[key]['balance']
                        }
                    });
                    //console.log(accounts);
                });
                //console.log(accounts);
                callback(err, accounts);
            }).sort({accountNumber: 1})
    });
}

exports.generateExcel = (req, res, next) => {
    /**
     * 
     * @api {get} /balance/generate/excel Generar Balance en formato XLSX
     * @apiName Reporte en Excel
     * @apiGroup Balance Contable
     * @apiVersion  0.0.1
     * @apiDescription Permite generar un balance completo con los datos del flujo de caja 
     * utilizando filtro con fecha inicial y final, formato en Excel<br><br>
     * 
     * @apiSuccessExample {text} Success-Response:
     * Este endpoint descarga un archivo.
     * 
     * 
     */
    var data = this.getDataFromBalance(req, res, next, (err, result) => {
        var filename = tempfile('.xlsx');
        res.status(200);
        var workbook = new Excel.Workbook();
        //res.setHeader('Content-disposition', 'attachment; filename=db_dump.xls');
        res.setHeader('Content-type', 'application/vnd.ms-excel');
        /*var options = {
            stream: res, // write to server response
            useStyles: false,
            useSharedStrings: false
        };
        var workbook = new Excel.stream.xlsx.WorkbookWriter(options);*/
        var sheet = workbook.addWorksheet('Balancete');
        sheet.columns = [
            { header: 'Codigo', key: 'id', width: 10 },
            { header: 'Denominacão', key: 'denominacao', width: 32 },
            { header: 'Sdo Anterior', key: 'previousBalance', width: 10, outlineLevel: 1 },
            { header: 'Debito', key: 'debit', width: 10, outlineLevel: 1 },
            { header: 'Credito', key: 'credit', width: 10, outlineLevel: 1 },
            { header: 'Saldo', key: 'balance', width: 10, outlineLevel: 1 }
        ];
        result.forEach(element => {
            sheet.addRow({id: element.accountNumber, denominacao: element.denomination, previousBalance: numeral(element.previousBalance).format('0,0'), debit: numeral(element.debit).format('0,0'), credit: numeral(element.credit).format('0,0'), balance: numeral(element.balance).format('0,0')});
        });
        //console.log(sheet);
        res.attachment("balance.xlsx")
        workbook.xlsx.write(res)
            .then(function() {
            res.end()
        });
    });
}

exports.generatePDF = (req, res, next) => {
    /**
     * 
     * @api {get} /balance/generate Generar Balance en PDF
     * @apiName Reporte en PDF
     * @apiGroup Balance Contable
     * @apiVersion  0.0.1
     * @apiDescription Permite generar un balance completo con los datos del flujo de caja 
     * utilizando filtro con fecha inicial y final, formato en PDF<br><br>
     * 
     * @apiSuccessExample {text} Success-Response:
     * Este endpoint descarga un archivo.
     * 
     */


    var start = performance.now();
    var now = new Date();
    var showZeroBalance = req.query.showZeroBalance;
    var startDate = req.query.startDate;
    var endDate = req.query.endDate;
    var data = this.getDataFromBalance(req, res, next, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        var html = `<html>
        <head>  
            <style>
            html {
                zoom: 0.55;
            }
            @media print {
                .first {
                    padding-top: 10px !important;
                }

                .second, .third, .fourth {
                    padding-top: 5px !important;
                    padding-bottom: 5px !important;
                }

                .first > span {
                    font-family: Arial; 
                    font-weight: bold; 
                    color: red;
                    font-size: 18px !important;
                }

                .second > span  {
                    font-family: Arial;
                    font-weight: bold; 
                    color: blue;
                    font-size: 16px !important;
                }

                .third > span {
                    font-family: Arial; 
                    font-weight: bold; 
                    color: green; 
                    font-size: 15px !important;
                }

                .fourth > span {
                    font-family: Arial;
                    font-weight: bold;
                    color: brown;
                    font-size: 14px !important;
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
            <h1 style="font-family: Arial">Balancete</h1>
            <span style="font-family: Arial">Periodo: ${moment(startDate).format('L')} a ${moment(endDate).format('L')}</span><br><br>
        </div>
        <table align="center" width="100%">
            <thead style="padding-bottom: 1em;">
                    <tr style="border: 1px solid black; border-width: 2px 0px 2px 0px; padding-bottom: 1em;">
                        <th  style="font-family: Arial; font-size: 14px; border: 1px solid black; border-width: 2px 0px 2px 0px;">Codigo</th>
                        <th  style="font-family: Arial; font-size: 14px;  border: 1px solid black; border-width: 2px 0px 2px 0px">Denominacão</th>
                        <th  style="font-family: Arial; font-size: 14px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">Sdo Anterior</th>
                        <th  style="font-family: Arial; font-size: 14px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">Debito</th>
                        <th  style="font-family: Arial; font-size: 14px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">Credito</th>
                        <th  style="font-family: Arial; font-size: 14px;  border: 1px solid black; border-width: 2px 0px 2px 0px" align="right">Saldo</th>
                    </tr>
            </thead>
        <tbody>
        <tr></tr>`;
        var count = Object.keys(result).length;
        var i = 0;
        var iterate = new Promise(function(resolve, reject){
            result.forEach(element => {
                //console.log('Denominacion: '+ element.denomination+' Saldo Anterior: '+element.previousBalance);
                var style;
                switch(element.level) {
                    case 1:
                        css = 'first';
                        break;
                    case 2:
                        css = 'second';
                        break;
                    case 3:
                        css = 'third';
                        break;
                    case 4:
                        css = 'fourth';
                        break;
                    default: 
                        css = 'default';
                        break;
                }
                var row;
                if(element.level != 5) {
                    row = 'margin-bottom: 10px;'
                }
                if(showZeroBalance == "false") {
                    if(element.balance == 0 && element.accountNumber.length > 3) {
                        console.log('tiene saldo cero');
                    } else {
                        html += `
                        <tr style="${row}">
                            <td width="100" class="${css}"><span>${element.accountNumber}</span></td>
                            <td style="width: 300px" class="${css}"><span>${element.denomination}</span></td>
                            <td width="80" class="${css}" align="right"><span>${numeral(element.previousBalance).format('0,0.00')}</span></td>
                            <td width="80" class="${css}" align="right"><span>${numeral(element.debit).format('0,0.00')}</span></td>
                            <td width="80" class="${css}" align="right"><span>${numeral(element.credit).format('0,0.00')}</span></td>
                            <td width="80" class="${css}" align="right"><span>${numeral(element.balance).format('0,0.00')}</span></td>
                        </tr>`;
                    }
                } else {
                    html += `
                    <tr style="${row}">
                        <td width="100" class="${css}"><span>${element.accountNumber}</span></td>
                        <td style="width: 300px" class="${css}"><span>${element.denomination}</span></td>
                        <td width="80" class="${css}" align="right"><span>${numeral(element.previousBalance).format('0,0.00')}</span></td>
                        <td width="80" class="${css}" align="right"><span>${numeral(element.debit).format('0,0.00')}</span></td>
                        <td width="80" class="${css}" align="right"><span>${numeral(element.credit).format('0,0.00')}</span></td>
                        <td width="80" class="${css}" align="right"><span>${numeral(element.balance).format('0,0.00')}</span></td>
                    </tr>`;
                }
                i++;
            });
            if(count == i) {
                resolve(i);
            }
        });
        var end = performance.now();
        total = Math.floor(end-start)/1000;
        html += `
        </tbody>
        </table><br>
        <div><small>Gerado em ${total} segundos</small></div>
        </body>
        </html>`;

        iterate.then((result) => {
            try {
                /*pdf.create(html, options).toStream(function(err, stream) {
                    if(err) {
                        console.error(err);
                        return next(err);
                    }
                    res.setHeader('Content-Type', 'application/pdf');
                    stream.pipe(res);
                });
                pdf.create(html, options).toStream(function(err, stream) {
                    if(err) return next(err);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', 'attachment; filename=download.pdf');
                    stream.pipe(res);
                });
                pdf.create(html, options).toFile('./businesscard.pdf', function(err, result) {
                  if (err) return console.log(err);
                  res.send(result); // { filename: '/app/businesscard.pdf' }
                });*/
                var options = {
                    "html": html,
                    "paperSize": {format: 'Legal', orientation: 'portrait', border: '1cm'}
                }
                var startDate = moment(req.query.startDate).format('DD-MM-YYYY');
                var endDate = moment(req.query.endDate).format('DD-MM-YYYY');

                pdf.convert(options, function(err, result) {
                    var tmpPath = result.getTmpPath();
                    console.log(tmpPath);
                    S3Manager.uploadFromFile(tmpPath, 'pdf/balance-'+startDate+'-ao-'+endDate+'-', function(err, data){ 
                        console.log(data, 'response');
                        res.send(data);
                        req.onSend();
                    });
                });
            } catch (error) {
                console.log(error);
            }
        })
    });
}