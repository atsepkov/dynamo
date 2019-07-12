<< method, objMethod, object, path, params >>
app.method('path', (req, res) => {
    let result = object.objMethod(params);
    if (result.error) {
        res.status(500).send(error);
    } else {
        res.send(result);
    }
});
