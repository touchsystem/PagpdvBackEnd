var express = require('express');
var router = express.Router();

const Delivery = require('../controllers/index');

router.post('/delivery/items/', Delivery.create);
router.put('/delivery/items/:id', Delivery.update);
router.get('/delivery/items/:id', Delivery.show);
router.get('/delivery/items/', Delivery.list);
router.delete('/delivery/items/:id', Delivery.delete);

module.exports = router;
