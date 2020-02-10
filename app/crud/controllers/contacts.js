var mongoose = require('mongoose');

exports.create = (req, res, next) => {
    // Set the params variable with the JSON body
    var id = req.params.id;
    var params = req.body;
    var transactionId = new Date().getTime();
    var informations = [];
    var addresses = [];
    /*
     "cellPhone":{
    "number":"858510200",
    "countryCode":"+55",
    "country":""
    },
    "telephone":{
    "number":"4512154688468",
    "countryCode":"+595",
    "country":""
    } 

    */
    (async () => {
        for(let i = 0; i < Object.keys(params.informations).length; i++) {
            let element = params.informations[i];
            informations.push({
                id: transactionId,
                name: element.name,
                email: element.email,
                contactPhone: element.contactPhone,
                observations: element.observations,
                default: element.default
            });
        }
    
        for(let i = 0; i < Object.keys(params.addresses).length; i++) {
            let element = params.addresses[i];
            addresses.push(
                {
                    id: transactionId,
                    addressLineOne: element.addressLineOne,
                    addressLineTwo: element.addressLineTwo, 
                    country: element.country,
                    city: element.city,
                    state: element.state,
                    shippingFee: element.shippingFee,
                    complement: element.complement,
                    postalCode: element.postalCode,
                    default: params.default
                }
            )
        }
    
        var obj = {
            name: params.name,
            tradeName: params.tradeName,
            internalId: params.internalId,
            documentId: params.documentId,
            documentType: params.documentType,
            type: params.type,
            roles: params.roles,
            informations: informations,
            addresses: addresses,
            isForeigner: params.isForeigner
        }
    
        // Get the Contacts model and then pass the parameters to the method
        var Contacts = new req.modelFactory.getModels('Contacts').Contacts(obj);
        // Saves it
        Contacts.save((err, result) => { 
            if(err) {
                console.error(err);
                return next(err);
            }  
            res.json({'status': 1, 'id': result._id});
            // Close the connection
            req.onSend();
        });
    })();
}

exports.list = (req, res, next) => {
    // Get the URI parameters
    var queries = req.query;
    var page = queries.page;
    var rol = req.params.rol;
    // Parse the limit parameter to Integer
    limit = parseInt(queries.limit, 10);
    // Get the respective model and then pass parameters to the paginate methods
    req.modelFactory.get('Contacts').paginate({status: 0, roles: {"$in": [rol]}}, {page: page, limit: limit}, (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }  
        res.send(result);
        // Close the connection
        req.onSend();
    });
}

exports.detail = (req, res, next) => {
    // Get the ID parameter
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        // Get the Contacts model and find by ID
        req.modelFactory.getModels('Contacts').Contacts.find({_id: id, status: 0}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }  
            res.send(result);
            // Close the connection
            req.onSend();
        });
    } else {
        next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
    }
}


exports.deleteInternal = function(req, res, next){
    // Get the ID parameters
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        // Get the respective model and then find the document by ID and removes it
        req.modelFactory.getModels('Contacts').Contacts.update({internalId: id }, { $set: { status: 1 }}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }  
            res.json({'status': 1});
            // Close the connectiond
            req.onSend();
        });
    } else {
        next(new Error('InternalId must be provided, was passing: ', id));
    }
}

exports.delete = function(req, res, next){
    // Get the ID parameters
    var id = req.params.id;
    if(id != "undefined" || id != "null"){
        // Get the respective model and then find the document by ID and removes it
        req.modelFactory.getModels('Contacts').Contacts.update({ _id: id }, { $set: { status: 1 }}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }  
            res.json({'status': 1});
            // Close the connectiond
            req.onSend();
        });
    } else {
        next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
    }
}

exports.update = function(req, res, next){
    // Get the ID parameter and the JSON body
    var id = req.params.id;
    var queries = req.query;
    if(id != "undefined" || id != "null"){
        var params = req.body;
        // Get the respective model and then find the document by id
        var filter = "";
        if(typeof queries.internal != 'undefined' && queries.internal == 'ok') {
            filter = {internalId: id};
        } else {
            filter = {_id: mongoose.Types.ObjectId(id)};
        }

        req.modelFactory.get('Contacts').findOne(filter, function(err, p){
            if(!p)
                return next(new Error('There is a problem with a document or doesnt exist'));
            else {
                // If we get a document, set the parameters from the JSON body
                p.name = params.name,
                p.tradeName = params.tradeName,
                p.documentId = params.documentId,
                p.documentType = params.documentType,
                p.type = params.type
                p.roles = params.roles,
                p.informations = params.informations,
                p.isForeigner = params.isForeigner,
                p.addresses = params.addresses;
                // Save it
                p.save(err => {
                    if(err) {
                        console.error(err);
                        return next(err);
                    }  
                    else
                        res.json({'status': 1});
                        // Close the connection
                        req.onSend();
                });
            }
        })

    } else {
        next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
    }
}

exports.search = (req, res, next) => {
    var queries = req.query;
    var search = queries.search;
    var rol = req.params.rol;
    limit = parseInt(queries.limit, 10);
    var Contacts = req.modelFactory.get('Contacts');
    Contacts.aggregate([
        {"$match": {"status": 0}},
        {"$match": {$or: [{"documentId": {"$regex": ".*" + search + ".*", "$options": 'i'}}, {"name": {"$regex": ".*" + search + ".*", "$options": 'i'}} ] }},
        {"$match": {"roles": {"$in": [rol]}}},
        {"$limit": limit}
    ], (err, result) => {
        if(err) {
            console.error(err);
            return next(err);
        }  
        res.send(result);
        req.onSend();
    });
}