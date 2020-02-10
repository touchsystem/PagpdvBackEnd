var express = require('express');
var router = express.Router();

const Enterprises = require('../controllers/enterprises-manager');
const PDV = require('../controllers/pdv');
const Wizard = require('../controllers/wizard');

router.get('/enterprises/', Enterprises.list);
router.post('/enterprises/', Enterprises.create);
router.put('/enterprises/:id', Enterprises.update);
router.get('/enterprises/:id', Enterprises.show);

router.post('/pdv/', PDV.create);
router.get('/pdv/', PDV.list);
router.put('/pdv/:id', PDV.update);
router.get('/pdv/:id', PDV.show);
router.delete('/pdv/:id', PDV.delete);

router.post('/wizard/', Wizard.initialize);

module.exports = router;