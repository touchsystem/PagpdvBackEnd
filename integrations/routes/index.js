const express = require('express');
const router = express.Router();

const Ifood = require("../ifood/controllers/index");

router.post('/ifood/auth', Ifood.authentication);
router.post('/ifood/orders/:reference/statuses/:status', Ifood.changeStatus);
router.get('/ifood/orders/:reference', Ifood.details);
router.patch('/ifood/skus/:code', Ifood.changePrice);
router.put('/ifood/merchants/:id/statuses', Ifood.merchantAvailability);

module.exports = router;