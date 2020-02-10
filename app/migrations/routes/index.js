var express = require('express');
var router = express.Router();

var Migration = require('../controllers/index');

router.post('/imports/products', Migration.products);
router.post('/imports/menus', Migration.menus);
router.post('/imports/menus/items', Migration.menuItems);
router.post('/imports/menus/groups', Migration.menuGroups);
router.post('/imports/products/groups', Migration.productGroups);
router.post('/imports/cashflow', Migration.cashflow);
router.post('/imports/accounts', Migration.accounts);
router.post('/imports/providers', Migration.provider);
router.post('/imports/customers', Migration.customer);
router.post('/exports/database', Migration.dump);

module.exports = router;