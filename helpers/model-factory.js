/**
 *
 *      Model Factory Module
 *      This module provides a factory for all models from the database.
 *      written by Alberto Miranda
 *
 *      @example require('model-factory').getModels('Car', 'Moto'); // gets the model car and moto
 *      @example require('model-factory').getModels('Car'); // gets only the car model
 *      @example require('model-factory').getAllModels(); // gets all models
 *      @example require('model-factory').get('Car'); // get specific model
 *      @
 */

/*
 *  All Available models
 */

var models = {
    Contacts: require('../app/crud/models/contacts'),
    MenuGroups: require('../app/crud/models/menuGroups'),
    MenuItems: require('../app/crud/models/menuItems'),
    PaymentMethods: require('../app/crud/models/paymentMethods'),
    ProductionPoints: require('../app/crud/models/productionPoints'),
    ProductGroups: require('../app/crud/models/productGroups'),
    Products: require('../app/crud/models/products'),
    Recipes: require('../app/crud/models/recipes'),
    RecipeItems: require('../app/crud/models/recipeItems'),
    Tables: require('../app/crud/models/tables'),
    Users: require('../app/crud/models/users'),
    Enterprises: require('../app/settings/models/enterprises'),
    Accounts: require('../app/finances/models/accounts'),
    Cashflow: require('../app/finances/models/cashflow'),
    Shortcuts: require('../app/finances/models/shortcuts'),
    Documents: require('../app/finances/models/documents'),
    Stock: require('../app/finances/models/stock'),
    Pendants: require('../app/finances/models/pendantsStock'),
    StockGroups: require('../app/finances/models/stockGroups'),
    Sales: require('../app/sales/models/sales'),
    DeliveryMenuItems: require('../app/delivery/models/index'),
    Exchange: require('../app/sales/models/exchange'),
    Orders: require('../app/sales/models/orders'),
    Schedule: require('../app/schedule/models/schedule'),
    PDV: require('../app/settings/models/pdv'),
    StockProvider: require('../test/models/stock.js'),
    CMV: require('../app/sales/models/cmv'),
    Contracts: require('../app/finances/models/contracts')
};

/*
 *  Our module
 *
 */

module.exports = function(connection){

  this.connection = connection;

  var _this = this;

  /*
   * getAllModels -> return all models.
   */

  this.getAllModels = function(){

      Object.keys(models).filter(function(item, k){

          // add item

            results[item] = _this.connection.model(item, models[item]);

      });

  };

  /*
   * getModels -> returns all especified models.
   */


  this.getModels = function(){

      var results = {};

      var args = arguments;

      var m = Object.keys(args).map(function (key) { return args[key]; });

      console.log('m', m);

      Object.keys(models).filter(function(item, k){

        //console.log('item', item, 'k', k);

        if(m.indexOf(item) !== -1){

            console.log('added', item);

            results[item] = _this.connection.model(item, models[item]);
        }

      });

      return results;
  }

    this.get = function(model) {
        return this.getModels(model)[model];
    }

  return this;
};