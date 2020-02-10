var mongoose = require('mongoose');
var fs = require('fs');

exports.initialize = (req, res, next) => {
    var params = req.body;
    if(typeof params.iFoodConfig != 'undefined') {
        var iFoodParams = {'clientId': params.iFoodConfig.clientId, 'clientSecret': params.iFoodConfig.clientSecret, 'username': params.iFoodConfig.username, 'password': params.iFoodConfig.password, 'grant_type': 'password'};
    } else {
        var iFoodParams = new Array();
    }
    
    var p1 = new Promise((resolve, reject) => {
        fs.readFile('./resources/samples/accounts.json', 'utf-8', (err, data) => {
            var Accounts = req.modelFactory.get('Accounts');
            Accounts.insertMany(JSON.parse(data), (err, reuslt) => {
                if(err) reject();
                resolve();
            })
        });
    });

    var p2 = new Promise((resolve, reject) => {
        fs.readFile('./resources/samples/methods.json', 'utf-8', (err, data) => {
            var PaymentMethods = req.modelFactory.get('PaymentMethods');
            PaymentMethods.insertMany(JSON.parse(data), (err, result) => {
                if(err) reject();
                resolve();
            });
        });
    });
    Promise.all([p1, p2]).then(values => { 
        var obj = {
            name: params.name,
            businessName: params.businessName,
            businessCode: params.businessCode,
            schedule: params.schedule,
            icon: params.icon,
            address: params.address,
            addressNumber: params.addressNumber,
            addressComplement: params.addressComplement,
            email: params.email,
            IE: params.IE,
            phone: params.phone,
            UF: params.UF,
            codeUF: params.codeUF,
            zipCode: params.zipCode,
            neighborhood: params.neighborhood,
            city: params.city,
            fiscalStatus: params.fiscalStatus,
            codeCity: params.codeCity,
            language: params.language,
            currency: params.currency,
            theme: params.theme,
            iFoodParameters: iFoodParams,
            date: params.date,
            methods: params.methods,
            lat: params.lat,
            lng: params.lng
        }
        
        var Enterprises = req.modelFactory.get('Enterprises')(obj);
        Enterprises.save((err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.send({'status': 1, 'id': result._id});
            req.onSend();
        });
    }, reason => {
        return next(new Error('There was an error with the JSON sample file'));
    });
}


