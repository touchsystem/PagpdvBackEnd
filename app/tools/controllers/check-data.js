module.exports = async (req, res) => {

    if(!req.query.systemDate){

        res.send({"error": "parameter systemDate mandatory"})

        req.onSend();

        return;
    }

    var init = new Date(req.query.systemDate + 'T00:00:00Z');
    var end = new Date(req.query.systemDate + 'T23:59:59Z');

    var cash = req.modelFactory.get('Cashflow');
    var docs = req.modelFactory.get('Documents');
    var sales = req.modelFactory.get('Sales');
    var method = req.query.method || 'find';


    const docsToDelete = await docs[method]({
        date: {
            $gte: init,
            $lte: end
        },
        documentType: 1
    }).exec();

    const cashFlowToDelete = await cash[method]({
        date: {
            $gte: init,
            $lte: end
        },
        accountNumber: 311101,
    }).exec();

    const a = await cash[method]({
        date: {
            $gte: init,
            $lte: end
        },
        accountNumber: 311102,
    }).exec();

    var cashtodel;
    if(cashFlowToDelete.concat){
        cashtodel = cashFlowToDelete.concat(a);
    }else if(!isNaN(cashFlowToDelete)){
        cashtodel = cashFlowToDelete + a;
    }else{
        cashtodel = {
            a: cashFlowToDelete,
            b: a
        };
    }

    const salesToDelete = await sales[method]({
        systemDate: {
            $gte: init,
            $lte: end
        },
    });

    const results = await sales.aggregate([
        {
            $match: {
                date: {
                    $gte: init,
                    $lte: end,
                }
            }
        },  
            {
                
                $unwind: "$payment"
            },
            {
                $project: {
                    payment:1 
                }
            }
        ]).exec();

    const total = results.reduce((prev, next) => {
        return prev + next.payment.localCurrencyAmount;
    }, 0);

    res.send({
        dateRange: [
            init, end
        ],
        details: {
            cashFlowToDelete: cashtodel,
            salesToDelete: salesToDelete,
            docsToDelete: docsToDelete
        },
        t: total,
        r: results
    });

    req.onSend();

};