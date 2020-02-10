var express = require('express');
var router = express.Router();

const Currencies = require('../controllers/currencies');
const PaymentMethods = require('../controllers/paymentMethods');
const MenuGroups = require('../controllers/menuGroups');
const MenuItems = require('../controllers/menuItems');
const Contacts = require('../controllers/contacts');
const Recipes = require('../controllers/recipes');
const Products = require('../controllers/products');
const ProductionPoints = require('../controllers/productionPoints');
const ProductGroups = require('../controllers/productGroups');
const Tables = require('../controllers/tables');
const Users = require('../controllers/users');
const RecipeExtras = require('../controllers/recipesExtras');
const MenuDelivery = require('../controllers/menuDelivery');

router.post('/payments/methods', PaymentMethods.create);
router.get('/payments/methods', PaymentMethods.list);
router.delete('/payments/methods/:id', PaymentMethods.delete);
router.put('/payments/methods/:id', PaymentMethods.update);
router.get('/payments/methods/:id', PaymentMethods.show);
router.delete('/payments/methods/internal/:id', PaymentMethods.deleteInternal);

// Menu Groups routes
router.get('/menus/groups', MenuGroups.list);
router.post('/menus/groups', MenuGroups.create);
router.get('/menus/groups/search', MenuGroups.search);
router.get('/menus/groups/:id/show', MenuGroups.show);
router.get('/menus/groups/:id', MenuGroups.detail);
router.put('/menus/groups/:id', MenuGroups.update);
router.delete('/menus/groups/:id', MenuGroups.delete);

// MenuItem routes
router.post('/menus', MenuItems.create);
router.get('/menus', MenuItems.list);
router.get('/menus/search', MenuItems.search);
router.get('/menus/:id', MenuItems.detail);
router.put('/menus/:id', MenuItems.update);
router.delete('/menus/:id', MenuItems.delete);
router.get('/menus/reports/costs', MenuItems.reportCosts);

// MenuItems Delivery 

router.post('/menus/delivery', MenuDelivery.create);
router.get('/menus/delivery', MenuDelivery.list);
router.post('/menus/delivery/clone/:id', MenuDelivery.clone);
router.get('/menus/delivery/:id', MenuDelivery.detail);
router.put('/menus/delivery/:id', MenuDelivery.update);
router.delete('/menus/delivery/:id', MenuDelivery.delete);

//Recipes routes

router.post('/recipes', Recipes.create);
router.get('/recipes', Recipes.list);
router.get('/recipes/:id', Recipes.show);
router.put('/recipes/:id', Recipes.update);
router.delete('/recipes/:id', Recipes.delete);

router.post('/recipes/:id/extras', RecipeExtras.create);
router.get('/recipes/:id/extras', RecipeExtras.show);
router.put('/recipes/:id/extras', RecipeExtras.update);

// Products Groups routes
router.post('/products/groups', ProductGroups.create);
router.get('/products/groups', ProductGroups.list);
router.get('/products/groups/accounts', ProductGroups.accounts);
router.get('/products/groups/search', ProductGroups.search);
router.put('/products/groups/:id', ProductGroups.update);
router.delete('/products/groups/:id', ProductGroups.delete);

// Products routes
router.put('/products/test/:id', Products.test);
router.post('/products', Products.create);
router.get('/products', Products.list);
router.put('/products/:id', Products.update);
router.delete('/products/:id', Products.delete);
router.get('/products/search', Products.search);
router.get('/products/:id', Products.details);
router.delete('/products/internal/:id', Products.deleteInternal);

// Production Points routes
router.post('/production/points', ProductionPoints.create);
router.get('/production/points', ProductionPoints.list);
router.put('/production/points/:id', ProductionPoints.update);
router.delete('/production/points/:id', ProductionPoints.delete);
router.get('/production/points/search', ProductionPoints.search);
router.delete('/production/points/internal/:id', ProductionPoints.deleteInternal);

// Business Partners routes
router.post('/contacts', Contacts.create);
router.get('/contacts/:id', Contacts.detail);
router.get('/contacts/list/:rol', Contacts.list);
router.put('/contacts/:id', Contacts.update);
router.delete('/contacts/:id', Contacts.delete);
router.get('/contacts/search/:rol', Contacts.search);
router.delete('/contacts/internal/:id', Contacts.deleteInternal);

// Tables routes
router.post('/tables', Tables.create);
router.post('/tables/bulk', Tables.bulkCreate);
router.put('/tables/condition', Tables.condition);
router.get('/tables', Tables.list);
router.get('/tables/search', Tables.search);
router.delete('/tables/internal/:id', Tables.deleteInternal);
router.get('/tables/:id', Tables.detail);
router.put('/tables/:id', Tables.update);
router.delete('/tables/:id', Tables.delete);


// User routes
router.post('/users', Users.create);
router.get('/users', Users.list);
router.put('/users/:id', Users.update);
router.delete('/users/:id', Users.delete);
router.get('/users/search/waiter', Users.waiter);
router.get('/users/search', Users.search);
router.get('/users/all/:rol', Users.allByRol);
router.delete('/users/internal/:id', Users.deleteInternal);
module.exports = router;