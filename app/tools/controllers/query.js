module.exports = async (req, res) => {

    var model = req.modelFactory.get(req.params.collection);

    const results = await model.find(req.body).exec();

    res.send({
        results
    });

    req.onSend();

};