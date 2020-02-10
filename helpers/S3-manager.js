const fs = require('fs'),
    AWS = require('aws-sdk'),
    mongoose = require('mongoose'),
    pathUtil = require('path'),
    formidable = require('formidable'),
    http = require('http'),
    https = require('https'),
    Stream = require('stream').Transform,                                  
    mime = require('mime-types'),
    url = require('url'),
    tempfile = require('tempfile');
    
const ACCESS_KEY = '5ODQT2QWS4NBNTOLH7Y6';
const SECRET_KEY = 'CmkmT/CX2t1r72cmiS0hD80LGjQDe02Vr3nNKEPMKFA';

exports.delete = (fileName) => {
    if(fileName != "") {
        const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');
        // Init the AWS S3 class with own credentials
        var s3bucket = new AWS.S3({
            accessKeyId: ACCESS_KEY,
            endpoint: spacesEndpoint,
            secretAccessKey: SECRET_KEY,
            region: 'nyc3'
        });
        // Important: It is required to specify the Bucket and Key parameters 
        var params = {
            Bucket: 'touchmobile',
            Key: fileName
        };
        // Removes the file on the specified bucket and then return true if was successfully
        s3bucket.deleteObject(params, (err, data) => {
            if (err) return console.log(err, err.stack);
            return true;
        });
    }
}


exports.uploadFromFile = (link, path = 'images/test', callback) => {
    var results;
    const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');
    fs.readFile(link, (err, data) => {
        var s3bucket = new AWS.S3({
            accessKeyId: ACCESS_KEY,
            endpoint: spacesEndpoint,
            secretAccessKey: SECRET_KEY,
        });
        // Randomize the name so I can prevent duplicate names
        var name = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);;
        var filename = pathUtil.basename(link);
        console.log(filename);
        // Once you have the extension from the filename then create the Bucket if not exists, otherwise upload in the existing bucket
        s3bucket.createBucket({Bucket: 'ingressos'}, () => {
            var params = {
                Key: path+filename,
                Body: data,
                Bucket: 'ingressos',
                ACL: 'public-read'
            };
            s3bucket.upload(params, (err, res) => {
                fs.unlink(link, err => {
                    if (err) {
                        console.error(err);
                    }
                });
                    
                if (err) {
                    console.log('error msg: ', err);
                    callback(err, null);
                } else {
                    console.log("uploaded", res.Location);
                    results = res.Location;
                    callback(null, results);
                }
            });
        });
    });
}

exports.uploadFromUrl = (url, path = 'images/test') => {
    var results;
    var s3bucket = new AWS.S3({
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
    });
    
    https.request(url, function(response) {
        var data = new Stream();
        if(typeof url != 'undefined') {
            let ext = mime.extension(url);
            response.on('data', function(chunk){
                data.push(chunk);
            });

            response.on('end', function(){
                var name = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                s3bucket.createBucket({Bucket: 'ingressos'}, () => {
                    var params = {
                        Key: test+'/'+name+ext,
                        Body: data,
                        Bucket: 'ingressos',
                        ACL: 'public-read'
                    };
                    s3bucket.upload(params, (err, data) => {
                        if(err) {
                            console.log(err);
                            return "error";
                        }
                        fs.unlink(file, err => {
                            if (err) {
                                console.error(err);
                            }
                        });
                            
                        if (err) {
                            console.log('error msg: ', err);
                            return results = "error";
                        } else {
                            console.log("uploaded", data.Location);
                            return results = data.Location;
                        }
                    });
                });
            });
        } else {
            return results = "error";
        }
    }).end();
}

exports.upload = (req, res, next) => {
    // Init the variables and then read the incoming forms to this endpoint
    var files = [];
    var tenantId = req.database;
    var form = new formidable.IncomingForm();
    // Parsing the form to get fields and files properly
    form.parse(req, (err, fields, files) => {
        count = Object.keys(files).length;
        var file = files.file.path;
        // The formidable adds a path to the files variable, so I can read them with the node.js function fs.readFile
        fs.readFile(file, (err, data) => {
            // If the function returns err, so I can throw, if not init the AWS S3 class with its own parameters
            if (err) throw err; 
            const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');
            var s3bucket = new AWS.S3({
                accessKeyId: ACCESS_KEY,
                endpoint: spacesEndpoint,
                secretAccessKey: SECRET_KEY,
            });
            // Randomize the name so I can prevent duplicate names
            var name = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);;
            var filename = files.file.name;
            var ext = pathUtil.extname(filename);
            // Once you have the extension from the filename then create the Bucket if not exists, otherwise upload in the existing bucket
            s3bucket.createBucket({Bucket: 'touchmobile'}, () => {
                var params = {
                    Key: 'images/'+tenantId+'/'+name+ext,
                    Body: data,
                    Bucket: 'ingressos',
                    ACL: 'public-read'
                };
                s3bucket.upload(params, (err, data) => {
                    fs.unlink(file, err => {
                        if (err) {
                            console.error(err);
                        }
                    });
                        
                    if (err) {
                        console.log('error msg: ', err);
                        res.status(500).send(err);
                    } else {
                        console.log("uploaded", data.Location);
                        res.json({'status': 1, 'url': data.Location});
                        req.onSend();
                    }
                });
            });
        });
    })
};

exports.logs = (req, res, next) => {
    /**
     * 
     *  @todo Aplicar filtro principal de fecha para reducir la carga
     * 
     */
    var date = req.query.date;
    var year = new Date(date).getFullYear();
    var prefix = date;
    var s3bucket = new AWS.S3({
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
    });
    // https://s3.us-east-2.amazonaws.com/seurestaurante/searchtest/2018/07/01-07/log.json
    s3bucket.listObjects({
        Prefix: 'searchtest',
        Bucket: 'touchmobile'
    }, function(err, data) {
        if (err) return next(err)
        var treated = [];
        /*
            /(.*\.(log))/g
        */
        data.Contents.forEach(function(obj) {
            let patt = new RegExp(/(.*\.(json))/g);
            let res = patt.test(obj.Key.toString());
            if (res) {
                treated.push(obj.Key);
            }
        });
        console.log(treated);
        var tmp = tempfile('.json');
        var total = Object.keys(treated).length;
        var file;
        for (let i = 0; i < total; i++) {
            element = treated[i];
            console.log(element);
            (async () => {
                //return Promise((resolve, reject) => {
                    https.get('https://s3.us-east-2.amazonaws.com/touchmobile/' + element, (response) => {
                        var stream = '';
                        response.on('data', function(chunk) {
                            stream += chunk;
                        });
                        console.log('request');
                        response.on('end', function() {
                            console.log(stream);
                            var result = stream.replace(/(\[|\])/g, '');
                            console.log('i', i);
                            console.log(total);
                            if (total == 1) {
                                console.log('total');
                                file = stream;
                            } else {
                                if (i == 0) {
                                    file = '[' + stream;
                                } else if (i == Object.keys(treated).length) {
                                    file = stream + ']';
                                }
                            }
                            fs.appendFile(tmp, file, function(err) {
                                if (err) return next(err);
                                if(i == total - 1) {
                                    var readStream = fs.createReadStream(tmp);
                                    readStream.on('open', function () {
                                        // This just pipes the read stream to the response object (which goes to the client)
                                        readStream.pipe(res);
                                        req.onSend();
                                    });
                                    
                                    // This catches any errors that happen while creating the readable stream (usually invalid names)
                                    readStream.on('error', function(err) {
                                        res.end(err);
                                    });
                                }
                            });
                        });
                    });
                //});
            })();
        }
    });
}
