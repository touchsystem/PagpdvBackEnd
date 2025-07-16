/**
 *
 *      Multi Tenancy Manager Module
 *      written by Alberto Miranda
 *
 */

/*
 *     Import our Modules
 */

// Model Factory
var ModelFactory = require('./model-factory');

// JWT Decoder
var JWTDecoder = require('./security');

// Mongoose Module
var mongoose = require('mongoose');

// Notification Module

var notifications = require('./notifications');


module.exports = function (req, res, next) {

    // Get the X-Auth-Token from the request header.

    var token = req.headers['x-auth-token'];

    // Check if the token exists, otherwise send error

    if (!token) {
        res.json({ error: 2, message: 'Token not found. x-auth-token not setted.' });
        return;
    }

    //console.log('Token: ', token);

    // Call our JWT decoder module, and handle the promise

    JWTDecoder(token, res).then(function (result) {

        // Some log

        //console.log('params', req.params);

        //console.log('connect to: ', result.database);

        // Read the database name from the result

        var database = result.database;

        try {

            // Connect to our tenant db.
            const options = {
                autoIndex: false, // Don't build indexes
                poolSize: 30, // Maintain up to 10 socket connections
                // If not connected, return errors immediately rather than waiting for reconnect
                bufferMaxEntries: 0,
                connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                useNewUrlParser: true
            };
            // Producao
            // var connection = mongoose.createConnection('mongodb://touchsystem:4JK5Ky6O58nI9efw@touch1-shard-00-00-iuxja.mongodb.net:27017,touch1-shard-00-01-iuxja.mongodb.net:27017/' + database + '?ssl=true&replicaSet=Touch1-shard-0&authSource=admin', options);

            //Local
            var connection = mongoose.createConnection('mongodb://localhost:27017/' + database + '?ssl=false&authSource=admin', options);
            console.log("NOME DA CONEXAO -> " + connection.name);

            // Handle on close

            connection.on('close', function () {

                console.log('closed', connection.name);

            });

            /**
             * @todo Set config from push 
             */

            // Send notification

            // Handle on open

            connection.on('open', function () {

                console.log('connected to:', connection.name);

                // Provide our ModelFactory to the req

                req.modelFactory = new ModelFactory(connection);

                // Provide our DB Connection to the req

                req.database = database;
                req.connection = connection;

                // Provide the req.onsend method to close the connection to our database

                req.onSend = function () {

                    console.log('res sent', req.connection.name);

                    // Proceed to close the connection
                    try {
                        req.connection.close();
                    } catch (err) {
                        console.log(err);
                    }
                };

                // Call next to handle the request.

                next();

            });

        } catch (err) {

            console.log(err);

            // send error 3 if there was an error

            res.json({ error: 3, nativeError: err });

        }


    }); // end JWTDecoder call

}; // end module.exports.
