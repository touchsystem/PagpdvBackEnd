var express = require('express');
var router = express.Router();

const TestController = require('./controller');

router.post('/purchases', TestController.purchases);
router.post('/transaction/manual/output', TestController.manualTransaction);
router.get('/stock/reports/list', TestController.getActualStock)
router.get('/cmv/differences/reports', TestController.differenceReports);
router.get('/products/calculate', TestController.recalculateProducts);
router.get('/purchases/calculate', TestController.recalculatePurchases);
router.get('/sales/calculate', TestController.recalculateSales);
router.get('/stock/differences/reports', TestController.stockDifferenceReports);
router.post('/sales/closure', TestController.closure);
router.get('/sales/reports/total', TestController.totalSales);


router.get('/get/stock', TestController.getAllStock);
router.get('/average/calculate', TestController.calcAverage);
router.get('/export', TestController.export);
router.get('/calculate/cmv', TestController.calculateCMVPerDay)
module.exports = router;