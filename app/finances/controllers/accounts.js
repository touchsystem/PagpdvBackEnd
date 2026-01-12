var formidable = require('formidable'),
    fs = require('fs'),
    path = require('path'),
    mongoose = require('mongoose');

exports.create = (req, res, next) => {
    /**
     * 
     * @api {post} /accounts Cuentas Contables
     * @apiName Crear
     * @apiGroup Cuentas Contables
     * @apiVersion  0.0.1
     * 
     * 
     * @apiParam (body) {String} denomination Denominación de la Cuenta Contable
     * @apiParam (body) {String} accountNumber Número de la Cuenta Contable
     * @apiParam (body) {String} level Nivel de la Cuenta Contable
     * @apiParam (body) {String} currency Moneda por defecto de la Cuenta Contable
     * 
     * @apiSuccess (200) {String} status Estado de la petición realizada
     * 
     * @apiParamExample  {type} Request-Example:
     * {
     *     denomination : "Caixa USD",
     *     accountNumber: "111104",
     *     currency: "BRL",
     *     level: 5
     * }
     * 
     * 
     * @apiSuccessExample {json} Success-Response:
     * {
     *     status : 1
     * }
     * 
     * 
     */
    var params = req.body;
    console.log("PARAMS -> " + req.body);
    var obj = {
        additionalInformation: params.additionalInformation,
        accountNumber: params.accountNumber,
        // TODO tomar por defecto de configuraciones
        currency: params.currency,
        denomination: params.denomination,
        level: params.level,
    }
    var Account = new req.modelFactory.getModels('Accounts').Accounts(obj);
    Account.save((err, result) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        res.json({ 'status': 1, 'id': result._id });
        req.onSend();
    });
}

exports.search = function (req, res, next) {
    /**
     * 
     * @api {get} /search?search=:search Búsqueda de Cuentas
     * @apiName Búsqueda
     * @apiGroup Cuentas Contables
     * @apiVersion  0.0.1
     * 
     * 
     * @apiParam (query) {String} search Palabra clave para la búsqueda
     * 
     * @apiSuccess (200) {Object[]} accounts Información de la Cuenta Contable
     * @apiSuccess (200) {String} accounts.accountNumber Número de la Cuenta Contable
     * @apiSuccess (200) {String} accounts.denomination Denominación de la Cuenta Contable
     * @apiSuccess (200) {Number} accounts.level Nivel de la Cuenta Contable
     * 
     * 
     * @apiSuccessExample {json} Respuesta Exitosa:
     * [{
     *     accountNumber: "111101",
     *     denomination: "Caixa Central",
     *     level: 5
     * },
     * {
     *     accountNumber: "111102",
     *     denomination: "Caixa USD",
     *     level: 5
     * }]
     * 
     * 
     */
    var queries = req.query;
    var search = queries.search;
    var level = queries.level;
    (typeof level != 'undefined') ? ((level.length > 0) ? level = level : level = { $ne: null }) : level = { $ne: null }
    /*if(typeof level != 'undefined') {
        if(level.length > 0) {
            level = `${level}`;
        } else {
            level = {$ne: null};
        }
    } else {
        level = {$ne: null};
    }*/

    console.log(search);
    limit = parseInt(queries.limit, 10);
    var Accounts = req.modelFactory.get('Accounts');
    Accounts.find({
        'status': 0,
        level: level,
        // "accountNumber":  {"$regex": ".*" + search + ".*", "$options": 'i'}
        $or: [
            { accountNumber: { $regex: ".*" + search + ".*", $options: 'i' } },
            { denomination: { $regex: ".*" + search + ".*", $options: 'i' } }
        ]
    }, (err, results) => {
        if (err) return next(err);
        console.log(results, 'test');
        res.send(results);
        req.onSend()
    });
    // var account = Accounts.find({'status': 0, "level": level, "denomination": {"$regex": ".*" + search + ".*", "$options": 'i'}}, (err, result) => {
    //     if(err) {
    //         console.error(err);
    //         return next(err);
    //     }  
    //     console.log(result);
    //     res.send(result);
    //     req.onSend();
    // }).limit(limit);


}

exports.import = (req, res, next) => {
    var obj = [];
    var form = new formidable.IncomingForm();

    function pushToObj(body) {
        return new Promise(function (resolve, reject) {
            var i = 0;
            body.forEach(element => {
                let level = order[element.TIPO];
                obj.push({ accountNumber: element.CONTA, denomination: element.NOME_CONTA, level: level, saldoAnterior: 0, debit: 0, credit: 0, saldo: 0 });
                i++;
                if (count == i) {
                    resolve(obj);
                }
            });
        });
    }

    form.parse(req, (err, fields, files) => {
        if (err) return next(err);
        let count = Object.keys(files).length;
        console.log(count);
        if (count >= 1) {
            var file = files.files.path;
            fs.readFile(file, (err, data) => {
                //console.log(data.toString());
                var body = JSON.parse(data.toString());
                var count = Object.keys(body).length;
                var order = { 'P': 1, 'S': 2, 'T': 3, 'Q': 4, 'C': 5 };

                (async () => {
                    const insertedObj = await pushToObj(body);
                })();

                var Account = req.modelFactory.get('Accounts');
                Account.insertMany(insertedObj, (err, result) => {
                    if (err) {
                        console.error(err);
                        return next(err);
                    }
                    res.end();
                    req.onSend();
                });
            });
        }
    });
}

exports.list = (req, res, next) => {
    /**
     * 
     * @api {get} /accounts?page=:page&limit=:limit Obtener Lista de Cuentas Contables
     * @apiName Listar
     * @apiGroup Cuentas Contables
     * @apiVersion  0.0.1
     * 
     * 
     * @apiParam  (query) {Number} page Número de página a visualizar
     * @apiParam (query) {Number} limit Número de resultados a ser visualizado
     * 
     * @apiSuccess (200) {Object[]} docs Array de objetos con los datos peticionados
     * @apiSuccess (200) {String} docs.accountNumber Número de la Cuenta Contable
     * @apiSuccess (200) {String} docs.denomination Denominación de la Cuenta Contable
     * @apiSuccess (200) {String} docs.currency Divisa monetaria de la Cuenta Contable
     * @apiSuccess (200) {Number} docs.level Nivel jerarquico de la Cuenta Contable
     * 
     * @apiSuccess (200) {Number} limit Límite de registros
     * @apiSuccess (200) {String} page Página actual
     * @apiSuccess (200) {Number} pages Cantidad de páginas generada con la consulta
     * @apiSuccess (200) {Number} total Cantidad de registros generados con la consulta
     * 
     * 
     * @apiSuccessExample {json} Respuesta Exitosa:
     * {
     *     docs : [{
     *          accountNumber: "111101",
     *          denomination: "Caixa Central",
     *          level: 5,
     *          currency: "BRL"
     *     }, {
     *          accountNumber: "111101",
     *          denomination: "Caixa Dólar",
     *          level: 5,
     *          currency: "BRL"
     *     }, {
     *          accountNumber: "111101",
     *          denomination: "Caixa Peso Argentino",
     *          level: 5,
     *          currency: "BRL"
     *     },{
     *          accountNumber: "111101",
     *          denomination: "Caixa Guaraní",
     *          level: 5,
     *          currency: "BRL"
     *     }]
     * }
     * 
     * 
     */
    var queries = req.query;
    var page = queries.page;
    limit = parseInt(queries.limit, 10);
    req.modelFactory.get('Accounts').paginate({ status: 0 }, { page: page, limit: limit, sort: { accountNumber: 1 } }, (err, result) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        res.send(result);
        req.onSend();
    });
}

exports.detail = (req, res, next) => {
    /**
     * 
     * @api {get} /accounts/:id Obtener detalles de la Cuenta Contable
     * @apiName Detalles
     * @apiGroup Cuentas Contables
     * @apiVersion  0.0.1
     * 
     * 
     * @apiParam  (path) {String} id ObjectId de la Cuenta Contable
     * 
     * @apiSuccess (200) {String} accountNumber Número de la Cuenta Contable
     * @apiSuccess (200) {String} denomination Denominación de la Cuenta Contable
     * @apiSuccess (200) {String} currency Divisa monetaria de la Cuenta Contable
     * @apiSuccess (200) {Number} level Nivel jerarquico de la Cuenta Contable
     * 
     * @apiSuccessExample {json} Respuesta Exitosa:
     * {
     *     accountNumber: "111101",
     *     denomination: "Caixa Central",
     *     currency: "BRL", 
     *     level: 5
     * }
     * 
     * 
     */
    var id = req.params.id;
    if (id != 'undefined' || id != 'null') {
        req.modelFactory.get('Acccounts').find({ _id: id }, (err, result) => {
            if (err) {
                console.error(err);
                return next(err);
            }
            res.send(result);
            req.onSend();
        })
    }
}

exports.delete = (req, res, next) => {
    /**
     * 
     * @api {delete} /accounts/:id Eliminar una Cuenta Contable
     * @apiName Eliminación
     * @apiGroup Cuentas Contables
     * @apiVersion  0.0.1
     * 
     * 
     * @apiParam  (path) {String} id ObjectId de la Cuenta Contable
     * 
     * @apiSuccess (200) {Number} status Estado de la Operación
     * 
     * 
     * @apiSuccessExample {json} Success-Response:
     * {
     *     status: 1
     * }
     * 
     * 
     */
    var id = req.params.id;
    if (id != 'undefined' || id != 'null') {
        console.log(id, 'id');
        req.modelFactory.get('Accounts').update({ _id: mongoose.Types.ObjectId(id) }, { $set: { 'status': 1 } }, (err, result) => {
            if (err) {
                console.error(err);
                return next(err);
            }
            res.json({ 'status': 1 });
            req.onSend();
        });
    }
}

exports.update = (req, res, next) => {
    /**
     * 
     * @api {put} /accounts/:id Actualización de la Cuenta Contable
     * @apiName Actualización
     * @apiGroup Cuentas Contables
     * @apiVersion  0.0.1
     * 
     * 
     * @apiParam  (path) {String} id ObjectId de la Cuenta Contable
     * @apiParam (body) {String} accountNumber Número de la Cuenta Contable
     * @apiParam (body) {String} denomination Denominación de la Cuenta Contable
     * @apiParam (body) {String} level Nivel Jerarquico de la Cuenta
     * @apiParam (body) {String} currency Divisa de la cuenta
     * 
     * @apiSuccess (200) {String} status Estado de la Operación
     * 
     * 
     * @apiSuccessExample {json} Success-Response:
     * {
     *     status: 1
     * }
     * 
     * 
     */
    var id = req.params.id;

    if (id != 'undefined' || id != 'null') {
        var params = req.body;
        console.log("PARAMS TIPO DA CONTA -> " + params.currency);
        req.modelFactory.get('Accounts').findById(id, (err, p) => {
            if (!p) return next(new Error('There is a problem with a document or doesnt exist'));
            p.additionalInformation = params.additionalInformation,
                p.accountNumber = params.accountNumber,
                p.denomination = params.denomination,
                p.currency = params.currency,
                p.level = params.level;
            p.save(err => {
                if (err) {
                    console.error(err);
                    return next(err);
                }
                res.json({ 'status': 1 });
                req.onSend();
            });
        })
    }
}