var express = require('express');
var router = express.Router();

const Fiscal = require('../controllers/index');

router.post('/fiscal', Fiscal.doFiscalProcess);

module.exports = router;