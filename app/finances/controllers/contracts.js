const mongoose = require('mongoose');
const { Validator } = require('node-input-validator');

exports.create = async (req, res, next) => {
    const params = req.body;
    const v = new Validator(params, {
        observation: 'required',
        accountId: 'required',
        amount: 'required',
        day: 'required',
        contactId: 'required'
    })

    const validated = await v.check();
    if(!validated) {
        res.status(401).send(v.errors);
    } else {
        params.contactId = mongoose.Types.ObjectId(params.contactId);
        var Contracts = new req.modelFactory.getModels('Contracts').Contracts(params);
        Contracts.save((err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.json({'status': 1, 'id': result._id});
            req.onSend();
        })
    }
}

exports.list = async(req, res, next) => {
    console.log('llego');
    const queries = req.query;
    (!queries.limit) ? limit = 10 : limit = Number(queries.limit);
    page = queries.page || 1;
    skip = (page - 1) * limit;
    // Parse the limit parameter to Integer
    var Contracts = req.modelFactory.get('Contracts');

    Contracts.aggregate([
        {'$lookup': {"from": "Contacts", "foreignField": "_id", "localField": "contactId", "as": "contacts_docs"}},
        {"$lookup": {"from": "Accounts", "foreignField": "_id", "localField": "accountId", "as": "accounts_docs"}},
        {"$project": {
            "observation": 1,
            "accountNumber": {"$arrayElemAt": ["$accounts_docs.accountNumber", 0]},
            "accountId": 1,
            "accountDescription": {"$arrayElemAt": ["$accounts_docs.denomination", 0]},
            "day": 1,
            "amount": 1,
            "contactId": 1,
            "contact": {"$arrayElemAt": ["$contacts_docs.name", 0]}
        }},
        {"$project": {
            "observation": 1,
            "accountNumber": 1,
            "accountId": 1,
            "contactId": 1,
            "accountDescription": {"$concat": [ "$accountNumber", " - ", "$accountDescription"]},
            "day": 1,
            "amount": 1,
            "contact": 1
           
        }},
        {"$facet": {
            "total": [
                {"$group": {_id: null, count: {$sum: 1}}},
            ],
            "docs": [
                {"$skip": skip},
                {"$limit": limit}
            ]
        }},
        {"$project": {
            "total": {$arrayElemAt: ["$total.count", 0]},
            "docs": 1
        }},
        {"$project": {
            "total": 1,
            "pages": {"$divide": ["$total", limit]},
            "docs": 1
        }}
    ], (err, result) => {
        if(err) console.log(err);
        console.log(JSON.stringify(result), 'result');
        res.send(result);
    });
}

exports.generate = async(req, res, next) => {
    var Contracts = req.modelFactory.get('Contracts');
    var Documents = req.modelFactory.get('Documents');
    var contractsDocuments = [];

    Contracts.find({}, (err, result) => {
        result.forEach((value, index) => {
            console.log(value);
            contractsDocuments.push({'businessPartnerId': value.contactId, date: new Date(), emissionDate: new Date(), accountNumber: '', observations: 'Gerado contrato', documentType: 3})
        })
    });

}


exports.update = async (req, res, next) => {
    var id = req.params.id;
    if(id != 'undefined' || id != 'null'){
        const params = req.body;
        const v = new Validator(params, {
            observation: 'required',
            accountId: 'required',
            amount: 'required',
            day: 'required',
            contactId: 'required'
        })
    
        const validated = await v.check();
        if(!validated) {
            res.status(401).send(v.errors);
        } else {
            req.modelFactory.get('Contracts').findById(id, (err, p) => {
                if(!p) return next(new Error('There is a problem with a document or doesnt exist'));
                p.observation = params.observation,
                p.accountId = params.accountId,
                p.amount = params.amount,
                p.contactId = params.contactId,
                p.day = params.day;
                p.save(err => {
                    if(err) {
                        console.error(err);
                        return next(err);
                    }
                    res.json({'status': 1});
                    req.onSend();
                });
            })
        }  
    } else {
        return next(new Error('There is a problem with a document or doesnt exist'));
    }
 
}
/*
{
    $facet: {
        total: [
            { $group: { _id: null, count: { $sum: 1 } } },
        ],
        docs: [
            { $skip: skip},
            { $limit: limit}
        ]
    }
},
{"$project": {
    "total": {$arrayElemAt: ["$total.count", 0]},
    "docs": 1
}},
{"$project": {
    "total": 1,
    "pages": {"$divide": ["$total", limit]},
    "docs": 1
}}
*/