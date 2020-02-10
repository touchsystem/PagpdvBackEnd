var request = require('request');

const CLIENT_ID = 'touchmobile';
const CLIENT_SECRET = 'Mr6c+aCg';

apiService = {
    token: "",
    makeAuth: function(username, password, cb) {
        var options = { 
            method: 'POST',
            url: 'https://pos-api.ifood.com.br/oauth/token',
            qs: { 
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                username: username,
                password: password,
                grant_type: 'password' 
            }
        };
        request(options, function (error, response, body) {
            if (error) return next(error);
            var body = JSON.parse(body);
            if(body.error) {
                cb({'status': 0, 'errorCode': body.error, 'msg': body.error_description})
                return 
                //res.send({'status': 0, 'errorCode': body.error, 'msg': body.error_description})
            } else {
                //console.log(body, 'body');
                cb({'status': 1, 'access_token': body.access_token, 'token_type': body.token_type, 'expires': body.expires_in})
                //res.send({'status': 1, 'access_token': body.access_token, 'token_type': body.token_type, 'expires': body.expires_in});
            } 
        });
    }
}

exports.authentication = (req, res, next) => {
    var Enterprises = req.modelFactory.get('Enterprises');
    Enterprises.find({}).exec((err, result) => {
        if(err) return next(err);
        res.locals.ifood = {};
        if(typeof result[0].iFoodConfig != 'undefined'){
            var username = result[0].iFoodConfig.username;
            var password = result[0].iFoodConfig.password;
            apiService.makeAuth(username, password, function(result){
                console.log(result);
                res.send(result);
            });
        } else {
            return next(new Error("iFood parameters was not setted properly on the config section. Please try again."))
        }
    });
}


exports.changePrice = (req, res, next) => {
    var code = req.params.code;
    var params = req.body;

    var merchants = params.merchants;
    var price = params.price;
    var startDate = params.startDate;

    var token = req.headers.authorization.split(" ");
    var bearer = token[1];

    var options = {
        method: 'PATCH',
        url: `https://pos-api.ifood.com.br/v1.0/skus/${code}/prices`,
        headers:{
            Authorization: ' Bearer '+bearer          
        },
        body: {
            merchantIds: merchants,
            externalCode: code,
            price: price,
            startDate: startDate
        },
        json: true
    };

    request(options, function (error, response, body) {
        if (error) {
            reject(new Error(error));
        }
        console.log('body ', body);
        console.log('response ', response);
        resolve(response);
    });
}

exports.details = (req, res, next) => {
    var reference = req.params.reference;
    
    if(typeof reference == 'undefined') {
        return next(new Error("Reference parameter was not setted on the request. Please try again."));
    }
    var token = req.headers.authorization.split(" ");
    var bearer = token[1];
    var options = { 
        method: 'GET',
        url: 'https://pos-api.ifood.com.br/v1.0/orders/'+reference,
        headers:{
            Authorization: ' Bearer '+bearer          
        }
    };

    request(options, function (error, response, body) {
        if(error) return next(error);
        var body = JSON.parse(body);
        body.status = 1;
        res.send(body);
    });
}

exports.changeStatus = (req, res, next) => {
    var reference = req.params.reference;
    var status = req.params.status;

    var token = req.headers.authorization.split(" ");
    var bearer = token[1];

    var options = {
        method: 'POST',
        url: `https://pos-api.ifood.com.br/v1.0/orders/${reference}/statuses/${status}`,
        headers:{
            Authorization: ' Bearer '+bearer          
        }
    }

    request(options, function(error, response, body) {
        if(error) return next(error);
        console.log(body);
        //var body = JSON.parse(body);
        if(typeof body.error != 'undefined') {
            res.send(body);
        } else {
            res.send({'status': 1});
        }
    });
}

exports.merchantAvailability = (req, res, next) => {
    var merchantId = req.params.id;
    var params = req.body;
    var status = params.status;
    var reason = params.reason;

    var options = { 
        method: 'PUT',
        url: `https://pos-api.ifood.com.br/v1.0/merchants/${merchantId}/statuses`,
        body: {
            status: status,
            reason: reason
        }  
    };

    request(options, function (error, response, body) {
        if (error) return next(error);
        var body = JSON.parse(body);
        console.log('body ', body);
        console.log('response ', response);
    });
}

exports.menuAvailability = (id, status, merchantId) => {
    var options = { 
        method: 'PATCH',
        url: `https://pos-api.ifood.com.br/v1.0/merchants/${merchantId}/skus/${id}`,
        body: JSON.stringify(status)
    };
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        console.log('body ', body);
        console.log('response ', response);
    });
}