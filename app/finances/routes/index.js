var express = require('express');
var router = express.Router();

var Cashflow = require('../controllers/cashflow');
var Accounts = require('../controllers/accounts');
var Balance = require('../controllers/balance');
var Shortcuts = require('../controllers/shortcuts');
var Documents = require('../controllers/documents');
var Stock = require('../controllers/stock');
var Contracts = require('../controllers/contracts');
var StockGroups = require('../controllers/stockGroups');

router.post('/contracts', Contracts.create);
router.get('/contracts', Contracts.list);
router.put('/contracts/:id', Contracts.update);
router.post('/contracts/generate', Contracts.generate);

// Shortcuts

router.post('/shortcuts', Shortcuts.create);
router.get('/shortcuts', Shortcuts.list);
router.get('/shortcuts/search', Shortcuts.search);
router.delete('/shortcuts/:id', Shortcuts.delete);

// Accounts routes

router.post('/accounts', Accounts.create);
router.get('/accounts', Accounts.list);
router.put('/accounts/:id', Accounts.update);
router.delete('/accounts/:id', Accounts.delete);
router.post('/accounts/import', Accounts.import);
router.get('/accounts/search', Accounts.search);

// Cashflow routes

router.post('/cashflow/import', Cashflow.import);
router.get('/cashflow/filter', Cashflow.filter);
router.get('/cashflow/:id', Cashflow.detail);
router.get('/cashflow', Cashflow.list);
router.post('/cashflow', Cashflow.create);
router.get('/cashflow/reports/daily', Cashflow.dailyPdf);
router.get('/cashflow/reports/accounts', Cashflow.accountsPdf);

// Balance 

router.get('/balance/generate', Balance.generatePDF);
router.get('/balance/generate/excel', Balance.generateExcel);

// Documents 

router.get('/documents', Documents.list);
router.post('/documents', Documents.create);
router.get('/documents/search', Documents.search);
router.post('/documents/pay', Documents.pay);
router.post('/documents/pay/split', Documents.payAndSplit);
router.get('/documents/show/:documentType/:businessPartnerId/:status', Documents.show);
router.get('/documents/purchases', Documents.purchases);
router.delete('/documents/purchases/:transactionId', Documents.deletePurchases);
router.get('/documents/reports', Documents.reports);
router.get('/documents/resume/:businessPartnerId', Documents.businessResume);
router.get('/documents/reports/customers', Documents.customers);
router.get('/documents/:documentId', Documents.details);
// Stock



// Listar productos no vinculados
router.get('/stock/pendants/list', Stock.listPendants);
// Reporte de entrada de productos
router.get('/stock/reports/incoming/resume', Stock.stockEntryResumePdf);
router.get('/stock/reports/incoming', Stock.stockEntryPdf);
router.get('/stock/reports/outgoing', Stock.outputPdf);
// Reporte de productos actuales en Stock
router.get('/stock/reports/list', Stock.getActualStock);
// Listar salida manual
router.get('/stock/manual/output', Stock.listOutput);
// Salida manual 
router.post('/stock/manual/output', Stock.outputTransaction);
// Eliminar una transaccion de salida manual
router.delete('/stock/manual/output/:transactionId', Stock.deleteTransaction);
// Tratar los pendientes de las ventas y remover lo procesado
router.post('/stock/pendants/output', Stock.treatPendants);
// Dar salida a los vinculados y guardar los no vinculados en una collection
router.post('/stock/sales/output', Stock.outputStock);
// Procesamiento de Stock 
router.post('/stock/sales/process', Stock.processStock);
// Historico de entradas 
router.get('/stock/historical/entries/:productId', Stock.detailsEntry);
router.get('/stock/list', Stock.list);

router.post('/stock/cmv/process', Stock.processCMV);

router.post('/stock/correction', Stock.priceCorrection);

router.post('/stock/groups', StockGroups.create);
router.delete('/stock/groups/:id', StockGroups.delete);
router.put('/stock/groups/:id', StockGroups.update);
router.get('/stock/groups', StockGroups.list);

router.get('/stock/cmv/', Stock.listCMV);
module.exports = router;