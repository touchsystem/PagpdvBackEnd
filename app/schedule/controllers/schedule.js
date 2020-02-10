exports.create = (req, res, next) => {
    var params = req.body;
    var obj = {
        contactId: params.contactId,
        contactInfo: params.contactInfo,
        documentId: params.documentId,
        tables: params.tables,
        observations: params.observations,
        scheduleDate: params.scheduleDate,
        date: params.date
    }
    var Schedule = req.modelFactory.get('Schedule');
    var newSchedule = Schedule(obj);
    newSchedule.save((err, result) => {
        if(err) return next(err);
        res.send({'status': 1, 'id': result._id});
        req.onSend();
    }); 
}

exports.list = (req, res, next) => {
    var queries = req.query;
    var startDate = queries.startDate;
    var endDate = queries.endDate;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    if(typeof page == 'undefined') {
        return next(new Error('Parameter page was waiting, nulled or empty given'));
    }
    if(typeof limit == 'undefined') {
        return next(new Error('Parameter limit was waiting, nulled or empty given'));
    }
    var Schedule = req.modelFactory.get('Schedule');
    var date = {"$match": {}};
    if(typeof(startDate && endDate) != 'undefined') {
        date["$match"] = {"date": {$gte: new Date(startDate), $lte: new Date(endDate)}};
    }
    var aggregate = Schedule.aggregate([
        date,
        {"$lookup": {"from": "Contacts", "localField": "contactId", "foreignField": "_id", "as": "contacts_docs"}},
        {"$project": {
            "customerName": "contacts_docs.name",
            "contactInfo": 1,
            "documentId": 1,
            "tables": 1,
            "observations": 1,
            "scheduleDate": 1,
            "date": 1
        }}
    ]);
    Schedule.aggregatePaginate(aggregate, {page: page, limit: limit}, (err, result, pageCount, count) => {
        if(err) {
            console.error(err);
            return next(err);
        }
        // Response with JSON in this standard format
        res.json({"docs": result, "total": count, "limit": limit, "page": page, "pages": pageCount});
        // Close the connection
        req.onSend();
    });
}

exports.delete = (req, res, next) => {
    var id = req.params.id;
    if(id != "undefined" || id != null){
        req.modelFactory.get('Schedule').update({_id: id}, {$set: {status: 1}}, (err, result) => {
            if(err) {
                console.error(err);
                return next(err);
            }
            res.json({'status': 1});
            req.onSend();
        });
    } else {
        next(new Error('ID must be provided or ObjectID missformed. Was passed: ', id));
    }
}