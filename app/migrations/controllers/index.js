var mongoose = require('mongoose');
var formidable = require('formidable');
var fs = require('fs');
var numeral = require('numeral');
var moment = require('moment');
var exec = require('child_process').exec;
var tempfile = require('tempfile');

numeral.locale('pt-br');

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * 
 * 
 */


exports.productGroups = (req, res, next) => {
    var obj = [];

    function pushToObj(params) {
        return new Promise(function(resolve, reject) {
            var body = JSON.parse(params);
            let count = Object.keys(body).length;
            for(let j = 0; j < Object.keys(body).length; j++) {
                obj.push({name: body[j].NOME_GRUPO_PROUDTO, internalId: body[j].COD_INT, accountNumber: body[j].CONTA_CONTABIL});
                console.log('count ', count, ' i ', j);
                if(count-1 == j) {
                    console.log('count ', count, ' i ', j);
                    console.log(obj);
                    resolve(obj);
                }
            }
        });
    }

    var ProductGroups = req.modelFactory.get('ProductGroups');
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        let count = Object.keys(files).length;
        if(count > 0) {
            var file = files.files.path;
            fs.readFile(file, (err, data) => {
                var string = data.toString();
                (async () => {
                    var insertObj = await pushToObj(string).then((response) => {
                        var totalRows = Object.keys(response).length;
                        ProductGroups.insertMany(response, (err, result) => {
                            if(err) {
                                console.error(err);
                                return next(err);
                            }  
                            var message =  'Success! Total of: '+totalRows+' rows imported ';
                            res.send({'status': 1, 'msg': message});
                            req.onSend();
                        });
                    });
                    
                })();
            });
        }
    });
}

exports.products = (req, res, next) => {
    var obj = [];

    async function pushToObj(params) {
        return new Promise(async function(resolve, reject) {
            var productGroupId = [];
            var body = JSON.parse(params);
            let count = Object.keys(body).length;
            var productGroups = await req.modelFactory.get('ProductGroups').find({}).exec();
            await (() => {
                console.log('llego al segundo promise');
                return new Promise((resolve, reject) => {
                    for(let i = 0; i < productGroups.length; i++) {
                        let id = productGroups[i].internalId;
                        let objectId = productGroups[i]._id;
                        productGroupId[id] = objectId;
                        if(productGroups.length - 1 == i) {
                            resolve(productGroupId);
                        }
                    }
                });
            })().then(function(response){
                console.log('Llego al then');
                for(let j = 0; j < Object.keys(body).length; j++) {
                    var price = body[j].CUSTO.replace(",", ".");
                    obj.push({name: body[j].NOME_PRODUTO, internalId: body[j].COD_INT, price: price, groupId: response[body[j].COD_INT_GRUPO_CARDAPIO], unit: body[j].UNIDADE});
                    if(count-1 == j) {
                        resolve(obj);
                    }
                }
            });
        });
    }

    var Products = req.modelFactory.get('Products');
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        if(typeof files.files != 'undefined') {
            var file = files.files.path;
            fs.readFile(file, (err, data) => {
                console.log('llego a data');
                var string = data.toString();
                var body = JSON.parse(JSON.stringify(string)); 
                (async () => { 
                    var insertObj = await pushToObj(body).then((response) => {
                        var totalRows = Object.keys(response).length;
                        Products.insertMany(response, (err, result) => {                             
                            if(err) {
                                console.error(err);
                                return next(err);
                            }  
                            var message =  'Success! Total of: '+totalRows+' rows imported ';
                            res.send({'status': 1, 'msg': message});
                            req.onSend();
                        });
                    });       
                })();
            });
        } else {
            return next(new Error('Attached file not found'));
        }
    });
}

exports.menuGroups = (req, res, next) => {
    var obj = [];
    function pushToObj(params) {
        let count = Object.keys(params).length;
        return new Promise(function(resolve, reject) {
            for(let i = 0; i < Object.keys(params).length; i++) {
                obj.push({name: params[i].NOME_CARDAPIO, internalId: params[i].COD_INT});
                if(count-1 == i) {
                    resolve(obj);
                }
            }
        });
    }

    var MenuGroups = req.modelFactory.get('MenuGroups');
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        let count = Object.keys(files).length;
        if(count > 0) {
            var file = files.files.path;
            fs.readFile(file, (err, data) => {
                var string = data.toString();
                var body = JSON.parse(data);
                (async () => {
                    var insertObj = await pushToObj(body).then(function(response) {
                        var totalRows = Object.keys(response).length;
                        MenuGroups.insertMany(response, (err, result) => {
                            if(err) {
                                console.error(err);
                                return next(err);
                            }  
                            var message =  'Success! Total of: '+totalRows+' rows imported ';
                            res.send({'status': 1, 'msg': message});
                            req.onSend();
                        });
                    });
                })();
                
            });
        }
    });
}

exports.menus = (req, res, next) => {
    var obj = [];
    var MenuGroups = req.modelFactory.get('MenuGroups');
    async function pushToObj(params) {
        return new Promise(async function(resolve, reject) {
            var menuGroupId = [];
            var body = JSON.parse(params);
            let count = Object.keys(body).length;
            var menuGroups = await req.modelFactory.get('MenuGroups').find({}).exec();
            await (() => {
                return new Promise((resolve, reject) => {
                    for(let i = 0; i < menuGroups.length; i++) {
                        let id = menuGroups[i].internalId;
                        let objectId = menuGroups[i]._id;
                        menuGroupId[id] = objectId;
                        if(menuGroups.length-1 == i) {
                            resolve(menuGroupId);
                        }
                    }
                });
            })().then(function(response){
                for(let j = 0; j < Object.keys(body).length; j++) {
                    var price =  body[j].PRECIO.replace(",", ".");
                    obj.push({internalId: body[j].COD_INT.toString(), name: body[j].NOME_CARDAPIO, items: new Array(0), hasDelivery: 'false', 'description': '', days: ["monday", "thursday", "wednesday", "tuesday", "friday", "saturday", "sunday"], 'status': 0, open: 'false', paused: 'false', favorite: 'false', price: price, groupId: response[body[j].COD_INT_GRUPO_CARDAPIO], fiscalOrigin: body[j].FISCAL_ORIGEM, fiscalNCM: body[j].FISCAL_NCM, fiscalCSOSN: body[j].FISCAL_CSOSN, fiscalCNAE: body[j].FISCAL_CNAE, fiscalAliquot: body[j].FISCAL_ALICOTA});
                    if(count-1 == j) {
                        resolve(obj);
                    }
                }
            });
        });
    }

    var Menus = req.modelFactory.get('MenuItems');
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        let count = Object.keys(files).length;
        if(count > 0){
            var file = files.files.path;
            fs.readFile(file, (err, data) => {
                var body = data.toString();
                (async () => {
                    var insertObj = await pushToObj(body).then(function(response){
                        var totalRows = Object.keys(response).length;
                        Menus.insertMany(response, (err, result) => {
                            if(err) {
                                console.error(err);
                                return next(err);
                            }  
                            var message =  'Success! Total of: '+totalRows+' rows imported ';
                            res.send({'status': 1, 'msg': message});
                            req.onSend();
                        });
                    });
                })();
                
            });
        }
    });
}

exports.menuItems = (req, res, next) => {
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        var file = files.files.path;
        fs.readFile(file, (err, data) => {
            var body = JSON.parse(data.toString());
            var treatedComposicion = [];
            var treatedProducts = [];
            var treatedCardapio = [];
            (async() => {
                var Products = await req.modelFactory.get('Products').find({}).exec();
                var MenuItems = await req.modelFactory.get('MenuItems').find({}).exec();
                await (() => {
                    let count = Object.keys(Products).length;
                    var productosObj = Products;
                    for(let i = 0; i < Object.keys(productosObj).length; i++){
                        treatedProducts[productosObj[i].internalId] = {'name': productosObj[i].name, 'relatedId': productosObj[i]._id};
                    }
                })();
                await (() => {
                    return new Promise((resolve, reject) => {
                        var cardapioObj = MenuItems;
                        let count = Object.keys(cardapioObj).length;
                        for(let i = 0; i < Object.keys(cardapioObj).length; i++) {
                            treatedCardapio[cardapioObj[i].internalId] = {'id': cardapioObj[i].internalId, 'name': cardapioObj[i].name, 'price': cardapioObj[i].price, 'items': [], 'paused': false, 'open': false, 'favorite': false, 'days': ["monday","thursday","wednesday","tuesday","friday","saturday","sunday"]};
                            if(count - 1 == i) {
                                resolve(treatedCardapio);
                            }
                        }
                    });                                       
                })();
                await (() => {
                    return new Promise((resolve, reject) => {
                        var composicionObj = body;
                        let count = Object.keys(composicionObj).length;
                        console.log('llego');
                        for(let i = 0; i < Object.keys(composicionObj).length; i++) {
                            if(composicionObj[i].COD_INT_CARDAPIO != '') {
                                if(typeof treatedComposicion[composicionObj[i].COD_INT_CARDAPIO] == 'undefined') { 
                                    treatedComposicion[composicionObj[i].COD_INT_CARDAPIO] = []; 
                                }
     
                                let productObj = treatedProducts[composicionObj[i].COD_INT_PRODUTO];
                                if(typeof productObj != 'undefined') {
                                    var measure =  composicionObj[i].QTDE.replace(",", ".");
                                    treatedComposicion[composicionObj[i].COD_INT_CARDAPIO].push({'name': productObj.name, 'items': [], 'related': productObj.relatedId, 'measure': measure, 'paused': false, 'open': false, 'favorite': false, 'days': ["monday","thursday","wednesday","tuesday","friday","saturday","sunday"]});
                                    //console.log(treatedComposicion[composicionObj[i].COD_INT_CARDAPIO]);
                                }
                            }
                            if(count - 1 == i) {
                                resolve();
                            }
                        }
                    });
                })(); 
                
                var result = [];
                await (() => {
                    console.log('llego');
                    return new Promise((resolve, reject) => {
                        var j = 0;
                        let count = Object.keys(treatedCardapio).length;
                        var MenuItem = req.modelFactory.get('MenuItems');

                        var updates = treatedCardapio.map(function(item, index){
                            if(typeof treatedComposicion != 'null') {
                                return MenuItem.update({'internalId': index}, {$set: {items: treatedComposicion[index]}});      
                            } else {
                                return MenuItem.update({'internalId': index}, {$set: {items: []}});      
                            }
                            
                        });
                        
                        Promise.all(updates).then(function(results){
                            resolve(results);
                        });
                    });
                })().then((response) => {
                    res.send({'status': 1});
                    req.onSend();
                });
            })();
        });
    });
}

exports.provider = (req, res, next) => {
    var form = new formidable.IncomingForm();
    var providerType, documentType;
    var obj = [];
    form.parse(req, (err, fields, files) => {
        var file = files.files.path;
        fs.readFile(file, (err, data) => {
            var body = JSON.parse(data.toString());
            (async () => {
                await (() => {
                    return new Promise((resolve, reject) => {
                        let count = Object.keys(body).length;
                        for(let i = 0; i < Object.keys(body).length; i++) {
                            var addresses = [];
                            var informations = [];
                            var contactPhone = [];
                            let element = body[i];
                            contactPhone.push({'number': element.TELEFONE});
                            contactPhone.push({'number': element.CELULAR});
                            let transactionId = new Date().getTime();
                            informations.push({'id': transactionId, 'name': '', 'email': element.EMAIL, 'contactPhone': contactPhone, default: true});
                            addresses.push({'id': transactionId, 'addressLineOne': element.ENDERECO, 'addressLineTwo':  '', 'city': element.CIDADE, 'postalCode': element.CEP, 'district': element.BAIRRO, 'state': element.UF, 'default': true}); 
                            if(element.CNPJ_CPF.length == 14) {
                                providerType = 2;
                                documentType = 'CNPJ';
                            } else if(element.CNPJ_CPF.length < 5) {
                                providerType = 2;
                                documentType = '';
                            } else {
                                providerType = 1;
                                documentType = 'CPF';
                            }
                            obj.push({
                                name: element.FORNECEDOR,
                                tradeName: element.FANTASIA,
                                type: providerType,
                                documentId: element.CNPJ_CPF,
                                documentType: documentType,
                                informations: informations,
                                stateRegistration: element.IE_RG,
                                roles: ['providers'],
                                addresses: addresses
                            });
                            if(count - 1 == i) {
                                resolve(obj);
                            } 
                        }
                    }).then((response) => {
                        let totalRows = Object.keys(response).length;
                        var Contacts = req.modelFactory.get('Contacts');
                        Contacts.insertMany(response, (err, result) => {
                            if(err) return next(err);
                            res.send({'status': 1, 'msg': 'Imported '+totalRows+' rows successfully!'});
                            req.onSend();
                        });
                    });
                })();
            })();
        });
    });
}

exports.customer = (req, res, next) => {
    /**
      {
        "name": "WAL MART BRASIL LTDA",
        "documentId": "00.063.960/0001-09",
        "documentType": "CNPJ",
        "type": 2,
        "roles": ["Provider", "Customer"],
        "informations": [{
            "name": "Matheus Welbert",
            "email": "mwelbert@walmart.com.br",
            "contactPhone": [
                {
                    "number": "465444654654654",
                    "countryCode": "+55",
                    "country": "Brazil",
                    "hasWhatsapp": true
                }
            ],
            "default": false
        }],
        "addresses": [
            {
                "addressLineOne": "Avda Costa e Silva",
                "addressLineTwo": "",
                "country": "Brasil",
                "city": "Foz do Iguacu",
                "state": "PR",
                "postalCode": "13123",
                "default": true
            }
        ]
    }
     */

    var form = new formidable.IncomingForm();
    var providerType, documentType;
    var obj = [];
    form.parse(req, (err, fields, files) => {
        var file = files.files.path;
        fs.readFile(file, (err, data) => {
            var body = JSON.parse(data.toString());
            (async () => {
                await (() => {
                    return new Promise((resolve, reject) => {
                        let count = Object.keys(body).length;
                        for(let i = 0; i < Object.keys(body).length; i++) {
                            var addresses = [];
                            var informations = [];
                            let element = body[i];
                            var contactPhone = [];
                            contactPhone.push({'number': element.TELEFONE});
                            contactPhone.push({'number': element.CELULAR});
                            let transactionId = new Date().getTime();
                            informations.push({'id': transactionId, 'name': element.CLIENTE, 'email': element.EMAIL, 'contactPhone': contactPhone, default: true});
                            addresses.push({'id': transactionId, 'addressLineOne': element.ENDERECO, 'addressLineTwo':  '', 'city': element.CIDADE, 'postalCode': element.CEP, 'district': '', 'state': element.UF, 'complement': '', 'default': true}); 
                            if(element.CNPJ_CPF.length == 14) {
                                documentType = 'CNPJ';
                                documentId = element.CNPJ
                            } else if(element.CNPJ_CPF.length < 5) {
                                documentType = '';
                            } else {
                                documentType = 'CPF';
                            }
                            obj.push({
                                name: element.CLIENTE,
                                tradeName: element.FANTASIA,
                                documentId: element.CNPJ_CPF,
                                documentType: documentType,
                                informations: informations,
                                roles: ['customers'],
                                addresses: addresses
                            });
                            if(count - 1 == i) {
                                resolve(obj);
                            } 
                        }
                    }).then((response) => {
                        let totalRows = Object.keys(response).length;
                        var Contacts = req.modelFactory.get('Contacts');
                        Contacts.insertMany(response, (err, result) => {
                            if(err) return next(err);
                            res.send({'status': 1, 'msg': 'Imported '+totalRows+' rows successfully!'});
                            req.onSend();
                        });
                    });
                })();
            })();
        });
    });
}

exports.accounts = (req, res, next) => {
    var obj = [];
    var form = new formidable.IncomingForm();

    function pushToObj (body) {
        return new Promise(function(resolve, reject){
            var i = 0;
            let count = Object.keys(body).length;
            var order = {'P': 1, 'S': 2, 'T': 3, 'Q': 4, 'C': 5};
            body.forEach(element => {
                let level = order[element.TIPO];
                obj.push({accountNumber: element.CONTA, denomination: element.NOME_CONTA, level: level, saldoAnterior: 0, debit: 0, credit: 0, saldo: 0});
                i++;
                if(count - 1 == i) {
                    resolve(obj);
                }
            });
        });
    }

    form.parse(req, (err, fields, files) => {
        if(err) return next(err);
        let count = Object.keys(files).length;
        console.log(count);
        if(count >= 1) {
            var file = files.files.path;
            fs.readFile(file, (err, data) => {
                var body = JSON.parse(data.toString());
                var count = Object.keys(body).length;

                (async () => {
                    var insertedObj = await pushToObj(body).then((response) => { 
                        var Account = req.modelFactory.get('Accounts');
                        let totalRows = Object.keys(response).length;
                        Account.insertMany(response, (err, result) => {
                            if(err) {
                                console.error(err);
                                return next(err);
                            }  
                            res.send({'status': 1, 'msg': 'Success! Total Rows imported '+totalRows+' successfully'});
                            req.onSend();
                        });
                    });
                })();
            });
        }
    });
}

exports.dump = function(req, res, next) {
    var path = "./backups";
    var database = req.database;

    if (!fs.existsSync(path)) {
        try {
            fs.mkdirSync(path)
        } catch (err) {
            if (err.code !== 'EXIST') throw err
        }
    }

    //mongoimport --uri "mongodb://touchsystem:4JK5Ky6O58nI9efw@touch1-shard-00-00-iuxja.mongodb.net:27017,touch1-shard-00-01-iuxja.mongodb.net:27017" --db db-169 
    // "Touch1-shard-0/touch1-iuxja.mongodb.net:27017"
    exec('mongodump -h Touch1-shard-0/touch1-shard-00-00-iuxja.mongodb.net:27017,touch1-shard-00-01-iuxja.mongodb.net:27017,touch1-shard-00-02-iuxja.mongodb.net:27017 --ssl --username touchsystem --password 4JK5Ky6O58nI9efw --authenticationDatabase admin  --db '+database+' --gzip --out '+path+'/'+database+'/', function(error, stdout, stderr) {
        console.log('stdout', stdout);
        console.log('stderr', stderr);
        console.log('error', error);
        console.log('db', database);
        if (error) {
            return next(error);
        } else {
            res.send({'status': 1, 'msg': 'Success! Total Rows imported: successfully'});
            req.onSend();
        }
    });
}

exports.cashflow = function(req, res, next) {
    req.setTimeout(5000);
    console.log('llego cashflow');
    obj = [];
    var form = new formidable.IncomingForm();
    form.maxFileSize = 200 * 1024 * 1024;
    form.parse(req, (err, fields, files) => {
        if(err) return next(err);
        let count = Object.keys(files).length;
        if(count >= 1) {
            var file = files.files.path;
            fs.readFile(file, (err, data) => {
                var count = Object.keys(data).length;
                var result = data.toString();
                (async function(){
                    var promise = new Promise(function(resolve, reject){
                        var body = JSON.parse(result);
                        var total = Object.keys(body).length;
                        for(let i = 0; i <= total; i++) {
                            let element = body[i];
                            console.log(element);
                            var debitAmount = numeral(element.DEBITO);
                            var creditAmount = numeral(element.CREDITO);
                            let ISODate = moment(element.DATA, "DD/MM/YYYY").format("YYYY-MM-DDT").toString().concat('00:00:00.000-0200');
                            obj.push({accountNumber: element.CONTA, documentNumber: element.DOC, observations: element.OBS, debitAmount: debitAmount.value(), creditAmount: creditAmount.value(), date: {$date: ISODate}});
                            //console.log(obj);
                            if(total - 1 == i) {
                                resolve(obj);
                            }
                        }
                    });
                    let response = await promise.then(function(response){
                        let totalRows = Object.keys(response).length;
                        var filename = tempfile('.json');
                        var json = JSON.stringify(response);
                        fs.writeFile(filename, json,  { flag: 'w' }, (err) => {
                            if(err) return next(err);
                            var database = req.database;
                            exec('mongoimport --uri "mongodb://touchsystem:4JK5Ky6O58nI9efw@touch1-shard-00-00-iuxja.mongodb.net:27017,touch1-shard-00-01-iuxja.mongodb.net:27017/' + database + '?ssl=true&replicaSet=Touch1-shard-0&authSource=admin" --collection Cashflow --file '+filename+' --jsonArray --batchSize 100', function(error, stdout, stderr) {
                                console.log('stdout', stdout);
                                console.log('stderr', stderr);
                                console.log('error', error);
                                console.log('db', database);
                                if (error) {
                                    return next(error);
                                } else {
                                    res.send({'status': 1, 'msg': 'Success! Total Rows imported: '+totalRows+' successfully'});
                                    req.onSend();
                                }
                            });
                        });
                    });
                })();
            });
        }
    });
}
