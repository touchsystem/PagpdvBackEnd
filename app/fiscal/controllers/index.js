var XMLParser = require("fast-xml-parser").j2xParser;
var moment = require('moment');
var mongoose = require('mongoose');
const request = require('request');
var soap = require('soap');
var numeral = require('numeral');
var qrcode = require('yaqrcode');

exports.GenerateXML = (nfe_id, nf, totalAmount, totalDiscount, invoiceSerie, invoiceNumber, digitChecker, products, merchant, customer, date) => {
    /*console.log('products', products);
    console.log('date', date);
    console.log('totalAmount', totalAmount);*/
    //console.log('customer', customer);
    var productsObj = [];
    var dest;
    merchant = merchant[0];
    if(customer.documentType == 'CPF') {
        dest = {
            'CPF': customer.documentId,
            'xNome': customer.name,
        }
    } else {
        dest = {
            'CNPJ': customer.documentId,
            'xNome': customer.name,
        }
    }

    for(let i = 0; i < Object.keys(products).length; i++){
        var ICMSSN;
        var CFOP;
        var CEST;
        if(products[i].fiscalCSOSN == '500') {
            CFOP = "5405";
            CEST = "0100100";
            ICMSSN = {
                'ICMSSN500': {
                    'orig': 0,
                    'CSOSN': products[i].fiscalCSOSN,
                    'vBCSTRet': '0',
                    'pST': '0.00',
                    'vICMSSTRet': '0'
                }
            }
        } else if(products[i].fiscalCSOSN == '102'){
            CFOP = "5102";
            ICMSSN = {
                'ICMSSN102': {
                    'orig': 0,
                    'CSOSN': products[i].fiscalCSOSN,
                    /*'vBCSTRet': '0',
                    'pST': '0',
                    'vICMSSTRet': '0'*/
                }
            }
        }
        productsObj.push({
            '@': {
                'nItem': i+1
            },
            'prod': {
            'cProd': products[i].internalId,
            'cEAN': 'SEM GTIN',
            'xProd': 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL', //products.name,
            'NCM': products[i].fiscalNCM,
            'CEST': CEST,
            'CFOP': CFOP,
            'uCom': 'UND',
            'qCom': products[i].quantity,
            'vUnCom': products[i].unitPrice,
            'vProd': products[i].subtotal,
            'cEANTrib': 'SEM GTIN',
            'uTrib': 'UND',
            'qTrib': products[i].quantity,
            'vUnTrib': products[i].unitPrice,
            'indTot': 1
            },
            'imposto': {
                'ICMS': ICMSSN,
                'PIS': {
                    'PISNT': {
                        'CST': '04'
                    }
                },
                'COFINS': {
                    'COFINSNT': {
                        'CST': '04'
                    }
                }
            }
        });
    }
    var obj = {
        'NFe': {
            '@': {
                'xmlns': 'http://www.portalfiscal.inf.br/nfe'
            },
            'infNFe': {
                '@': {
                    'versao': '4.00',
                    'Id': nfe_id,
                },
                'ide': {
                    'cUF': merchant.codeUF,
                    'cNF': nf.valueOf(),
                    'natOp': 'Venda de mercadoria',
                    'mod': '65',
                    'serie': invoiceSerie,
                    'nNF': invoiceNumber,
                    'dhEmi': date,
                    'tpNF': 1,
                    'idDest': 1,
                    'cMunFG': merchant.codeCity,
                    'tpImp': 4,
                    'tpEmis': 1,
                    'cDV': digitChecker,
                    'tpAmb': 2,
                    'finNFe': 1,
                    'indFinal': 1,
                    'indPres': 1,
                    'procEmi': 0,
                    'verProc': 6.3
                },
                'emit': {
                    'CNPJ': merchant.businessCode,
                    'xNome': merchant.name,
                    'enderEmit': {
                        'xLgr': merchant.address,
                        'nro': merchant.addressNumber,
                        'xCpl': merchant.addressComplement,
                        'xBairro': merchant.neighborhood,
                        'cMun': merchant.codeCity,
                        'xMun': merchant.city,
                        'UF': merchant.UF,
                        'CEP': merchant.zipCode,
                        'cPais': 1058,
                        'xPais': 'BRASIL',
                        'fone': merchant.telephone
                    },
                    'IE': merchant.IE,
                    'CRT': 1
                }, 
                'dest': dest,
                'det': productsObj,
                'total': {
                    'ICMSTot': {
                        'vBC': '0.00',
                        'vICMS': '0.00',
                        'vICMSDeson': '0.00',
                        'vFCP': '0.00',
                        'vBCST': '0.00',
                        'vST': '0.00',
                        'vFCPST': '0.00', 
                        'vFCPSTRet': '0.00',
                        'vProd': totalAmount.toFixed(2),
                        'vFrete': '0.00',
                        'vSeg': '0.00',
                        'vDesc': '0.00',
                        'vII': '0.00',
                        'vIPI': '0.00',
                        'vIPIDevol': '0.00',
                        'vPIS': '0.00',
                        'vCOFINS': '0.00',
                        'vOutro': '0.00',
                        'vNF': totalAmount.toFixed(2)
                    }
                },
                'transp': {
                    'modFrete': '9'
                },
                'pag': {
                    'detPag': {
                        'indPag': '0',
                        'tPag': '01',
                        'vPag': totalAmount.toFixed(2)
                    }
                },
                'infAdic': {
                    'infAdFisco': 'Nota.',
                    'infCpl': 'MERCADORIA:'
                }
            }
        }
    };
    return obj;
}

exports.getDigitChecker = (string) => {
    var digit = 0;
    var peso = 9;
    for(let i = string.length - 1; i >= 0; i--) {
        digit += parseInt(string[i].valueOf()) * peso;
        if(peso == 2) {
            peso = 9;
        } else {
            peso--;
        }
    }
    digit = digit % 11;
    if(digit == 10) {
        return 0;
    } else {
        return digit.valueOf();
    }
}

exports.generateIdNFe = (codeUf, serie, numeroNfe, businessCode) => {
    // uf 2 caracteres           Ex: SP          35
    // periodo 4 caracteres      Ex: Jul/2017    1707
    // cnpj 14                   Ex: CNPJ        08951491000168
    // modelo 2                  Ex: NFe         55
    // serie 3                   Ex: Serie 1     001
    // numero 9                  Ex: NFe 1101    000001101
    // tpEmis 1                  Ex: 1           1
    // codigo numero 8           Ex: CodNumérico 75345491
    // dv 1                      Ex: Dig.Veriif  calculado...
    // 52 1808 06039615000108 65 013 000000442 1 00000442 9
   
    var monthAndYear = moment().format('YYMM');
    console.log('dateMonthYear', monthAndYear);
    var modelInvoice = 65;
    var emissionType = 1; // 1 produc 2 homolog
    var invoiceSerie = serie.padStart(3, 0);
    var invoiceNumber = numeroNfe.padStart(9, 0);
    var codNum = numeroNfe.padStart(8, 0);
    var codeKey = codeUf+monthAndYear+businessCode+modelInvoice+invoiceSerie+invoiceNumber+emissionType+codNum;
    var digitChecker = this.getDigitChecker(codeKey);
    console.log('ide', codeKey+digitChecker);
    return "NFe"+codeKey+digitChecker;
}

exports.doFiscalProcess = (req, res, next) => {
    var params = req.body;
    var saleId = params.saleId;
    var invoiceNumber = params.fiscal.invoiceNumber;
    var invoiceSerie = params.fiscal.invoiceSerie;
    (async () => {
        if(typeof saleId != 'undefined') {
            var Enterprises = req.modelFactory.get('Enterprises');
            var merchant = await Enterprises.find({}).sort({createdAt: -1}).limit(1).exec();
            if(merchant[0].fiscalStatus != 'undefined') {
                var Sales = req.modelFactory.get('Sales');
                if(merchant[0].fiscalStatus == 1) {
                    var sales = await Sales.update({_id: mongoose.Types.ObjectId(saleId)}, {$set: {'fiscal.invoiceSerie': invoiceSerie, 'fiscal.invoiceNumber': invoiceNumber}}).exec();
                    Sales.aggregate(
                        [
                            { 
                                "$match" : {
                                    "_id" : mongoose.Types.ObjectId(saleId)
                                }
                            }, 
                            { 
                                "$unwind" : {
                                    "path" : "$menuItems"
                                }
                            }, 
                            { 
                                "$lookup" : {
                                    "from" : "MenuItems", 
                                    "localField" : "menuItems._id", 
                                    "foreignField" : "_id", 
                                    "as" : "menus_docs"
                                }
                            }, 
                            { 
                                "$unwind" : {
                                    "path" : "$menus_docs", 
                                    "includeArrayIndex" : "arrayIndex", 
                                    "preserveNullAndEmptyArrays" : false
                                }
                            }, 
                            { 
                                "$project" : {
                                    "_id" : 1, 
                                    "total": 1,
                                    "discounts": 1,
                                    "serviceTaxes": 1,
                                    "menuItems" : {
                                        "name" : "$menuItems.name", 
                                        "quantity": "$menuItems.quantity",
                                        "unitPrice" : "$menuItems.unitPrice", 
                                        "subtotal" : "$menuItems.subtotal", 
                                        "_id" : "$menuItems._id", 
                                        "fiscalNCM" : "$menus_docs.fiscalNCM", 
                                        "fiscalCSOSN" : "$menus_docs.fiscalCSOSN", 
                                        "fiscalCEST" : "$menus_docs.fiscalCEST", 
                                        "fiscalAliquot" : "$menus_docs.fiscalAliquot",
                                        "internalId": "$menus_docs.internalId"
                                    }, 
                                    "businessPartnerId" : "$businessPartnerId"
                                }
                            }, 
                            { 
                                "$group" : {
                                    "_id" : "$_id", 
                                    "menuItems" : {
                                        "$push" : "$menuItems"
                                    }, 
                                    "total": {
                                        "$first": "$total"
                                    },
                                    "serviceTaxes": {
                                        "$first": "$serviceTaxes"
                                    },
                                    "discounts": {
                                        "$first": "$discounts"
                                    },
                                    "businessPartnerId" : {
                                        "$first" : "$businessPartnerId"
                                    }
                                }
                            }, 
                            { 
                                "$lookup" : {
                                    "from" : "Contacts", 
                                    "localField" : "businessPartnerId", 
                                    "foreignField" : "_id", 
                                    "as" : "contacts_docs"
                                }
                            }, 
                            { 
                                "$project" : {
                                    "_id" : 1, 
                                    "total": 1,
                                    "serviceTaxes": 1,
                                    "discounts": 1,
                                    "menuItems" : 1, 
                                    "customer" : {
                                        "name" : {
                                            "$arrayElemAt" : [
                                                "$contacts_docs.name", 
                                                0
                                            ]
                                        }, 
                                        "documentId" : {
                                            "$arrayElemAt" : [
                                                "$contacts_docs.documentId", 
                                                0
                                            ]
                                        }, 
                                        "documentType" : {
                                            "$arrayElemAt" : [
                                                "$contacts_docs.documentType", 
                                                0
                                            ]
                                        }, 
                                        "informations" : "$contacts_docs.informations", 
                                        "addresses" : "$contacts_docs.addresses"
                                    }
                                }
                            }
                        ], (err, result) => {
                            //console.log('fiscal', result[0].fiscal);
                            var date = moment().format(); 
                            //console.log('merchant', merchant);
                            var nfe_id = this.generateIdNFe(merchant[0].codeUF, invoiceSerie, invoiceNumber, merchant[0].businessCode);
                            var nf = nfe_id.substring(38, nfe_id.length - 1);
                            var digitChecker = nfe_id.substring(nfe_id.length - 1);
                            var discounts;
                            if(typeof result[0].menuItems == 'undefined') {
                                return next(new Error('Sales has not products on it'));
                            }
                            /* preguntar donde irá serviceTaxes */
                            var products = result[0].menuItems;
                            var customer = result[0].customer;
                            var totalAmount = result[0].total;
                            if(Object.keys(result[0].discounts).length == 1) {
                                discounts = result[0].discounts[0].amount;
                            } else {
                                discounts = '0.00';
                            }
                            var jsonXML = this.GenerateXML(nfe_id, nf, totalAmount, discounts, invoiceSerie, invoiceNumber, digitChecker, products, merchant, customer, date);
                            var defaultOptions = {
                                attributeNamePrefix : "@_",
                                attrNodeName: "@",
                                textNodeName : "#text",
                                ignoreAttributes :false,
                                ignoreNameSpace : false,
                                allowBooleanAttributes : false,
                                parseNodeValue : false,
                                parseAttributeValue : false,
                                trimValues: false,
                                cdataTagName: "__cdata", //default is 'false'
                                cdataPositionChar: "\\c",
                            };
                            var parser = new XMLParser(defaultOptions);
                            res.send(parser.parse(jsonXML));
                            /*var xml = parser.parse(jsonXML);
                            //console.log('CNPJ', '06039615000108');
                            console.log('CNPJ', merchant[0].businessCode);
                            var url = 'http://homolog.aclti.com.br/NFeV5/NFCeService.svc?singleWsdl';
                            var args = {cnpj: merchant[0].businessCode, xml: xml};
                            soap.createClient(url, function(err, client) {
                                client.Autoriza(args, function(err, result) {
                                    if(result.AutorizaResult.statusAutorizacao == 'OK') {
                                        var base64 = qrcode(result.AutorizaResult.urlQrCode, {
                                            size: 200
                                        });
                                        res.send({'qrcode': base64, 'key': result.AutorizaResult.chave, 'dh': result.AutorizaResult.dhAutorizacao, 'status': result.AutorizaResult.statusAutorizacao});
                                        req.onSend();
                                    } else {
                                        res.send(result);
                                        req.onSend();
                                    }
                                });
                            });*/
                    });
                } else {
                    return next(new Error('This merchant is disabled for fiscal operations'))
                }
            }
        } else {
            return next(new Error('Missing saleId in body, please try again'));
        }
    })();
}