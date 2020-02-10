const Router = require('express').Router;

const router = Router();

router.get('/check-data', require('../controllers/check-data'));

router.post('/query/:collection', require('../controllers/query'));

module.exports = router;