var express = require('express'),
router = express.Router();

const Schedule = require('../controllers/schedule');

router.post('/schedule', Schedule.create);
router.get('/schedule', Schedule.list);

module.exports = router;