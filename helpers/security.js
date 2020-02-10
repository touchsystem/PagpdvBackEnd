var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');

/**
 *
 * This Module extracts the tenantId from the token. and returns a promise.
 *
 * @param token
 */

module.exports = function(tkn, request) {

    var token = tkn;

    console.log(token);

    var promise = new Promise(function(resolve, reject){

        
        /**
         * @todo Connect to the Main Database to get the server credentials.
         * @type {Promise}
         */

        //var connection = mongoose.connect('mongodb://touchsystem:4JK5Ky6O58nI9efw@touch1-shard-00-00-iuxja.mongodb.net:27017,touch1-shard-00-01-iuxja.mongodb.net:27017/settings?ssl=true&replicaSet=Touch1-shard-0&authSource=admin');

        console.log('verigfy', token);

        var secret = Buffer.from('KuOCSJ7jMWb4whJ8Q1tL', 'base64');

        jwt.verify(token, 'KuOCSJ7jMWb4whJ8Q1tL', {algorithm: 'HS512'}, function(error, decoded){

            if(error){
                request.send({error: 1, nativeError: error});
                reject();
                return;
            }
            resolve({
                tenantId: decoded.tenantId,
                database: "db-" + decoded.tenantId
            });

        });

    });

    return promise;

};