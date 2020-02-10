var mongoose = require('mongoose');

exports.create = (req, res, next) => {
    var params = req.body;
    var iFoodParams = {'merchantId': params.iFoodConfig.merchantId, 'clientId': params.iFoodConfig.clientId, 'clientSecret': params.iFoodConfig.clientSecret, 'username': params.iFoodConfig.username, 'password': params.iFoodConfig.password, 'grant_type': 'password'};
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
        tenantId: params.tenantId,
        language: params.language,
        currency: params.currency,
        deliveryType: params.deliveryType,
        theme: params.theme,
        iFoodConfig: iFoodParams,
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
    })
}

exports.list = (req, res, next) => {
    var page = req.query.page;
    limit = parseInt(req.query.limit, 10);
    var Enterprises = req.modelFactory.get('Enterprises');
    Enterprises.find({'status': 0}, (err, result) => {
        if(err) return next(err);
        res.send(result);
        req.onSend();
    }).limit(1);
}

exports.show = (req, res, next) => {
    var id = req.params.id; 
    if(typeof id != 'undefined') {
        var Enterpises = req.modelFactory.get('Enterprises');
        Enterprises.find({'status': 0, 'tenantId': id}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.send(result);
            req.onSend();
        });
    } else {
        return next(new Error('Missing ID parameter'));
    }
}

exports.update = (req, res, next) => {
    var id = req.params.id;
    if(id != 'undefined' || id != 'null'){
        var params = req.body;
        var Enterprise = req.modelFactory.get('Enterprises');
        Enterprise.findById(id, (err, p) => {
            if(!p) return next(new Error('There is a problem with a document or doesnt exist'));
            p.name = params.name,
            p.businessName = params.businessName,
            p.businessCode = params.businessCode,
            p.schedule = params.schedule,
            p.icon = params.icon,
            p.address = params.address,
            p.addressComplement = params.addressComplement,
            p.addressNumber = params.addressNumber,
            p.codeCity = params.codeCity,
            p.UF = params.UF,
            p.codeUF = params.codeUF,
            p.iFoodConfig = params.iFoodConfig,
            p.email = params.email,
            p.city = params.city,
            p.IE = params.IE,
            p.zipCode = params.zipCode,
            p.neighborhood = params.neighborhood,
            p.tenantId = params.tenantId,
            p.language = params.language,
            p.currency = params.currency,
            p.theme = params.theme,
            p.date = params.date,
            p.fiscalStatus = params.fiscalStatus,
            p.methods = params.methods,
            p.lat = params.lat,
            p.lng = params.lng,
            p.phone = params.phone;
            p.save(err => {
                if(err) {
                    console.error(err);
                    return next(err);
                }
                res.json({'status': 1});
                req.onSend();
            });
        });
    }
}