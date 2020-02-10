var express = require('express');
var router = express.Router();

const Sales = require('../controllers/sales');
const Orders = require('../controllers/orders');
const Exchange = require('../controllers/exchange');

router.post('/sales/pos', Sales.create);
router.delete('/sales/pos/:id', Sales.delete);
router.get('/sales/cashier/amount/:cashierId/', Sales.getAmountCashier);
router.post('/sales/cashier/closure/:cashierId/', Sales.closure);
//router.post('/sales/cashier/change', Sales.changeDate);
router.post('/sales/sync', Sales.sync);
router.get('/sales/initialize', Sales.initialize);
router.get('/sales/cashier/delivery/:date', Sales.getSalesDelivery);
router.get('/sales/reception', Sales.reception);
router.get('/sales/reports/reception', Sales.receptionPdf);
router.get('/sales/reports/acumulated', Sales.acumulatedReception);
router.get('/sales/reports/menus', Sales.salesMenus);
router.get('/sales/convert/tables', Sales.convert);
router.get('/sales/reports/customers', Sales.getSalesCustomerReport);

router.get('/orders/', Orders.list);
router.post('/orders/last', Orders.last);
router.post('/orders/update', Orders.update);
router.post('/orders/cancel', Orders.cancel);

router.post('/exchange', Exchange.create);
router.post('/exchange/sell', Exchange.sell);
router.get('/exchange', Exchange.exchange);
router.get('/exchange/cash/list', Exchange.getActualCash);

module.exports = router;