let schema = stage(0).get('schema').uplift()                // parses schema from lower level into an object in this level
let rest = stage(0).get('rest').uplift()
let routes = stage(0).get('route')                          // no uplifting, this will be our generator for this stage
let ctrl = stage(0).get('controller').uplift({ model: {} }) // dummy model, we only want the keys
Object.keys(schema).forEach(table => {
    routes.inject({ object: table });
});
Object.keys(rest).forEach(route => {
    let data = {};
    Object.keys(schema).forEach(table => {
        schema[table].forEach(f => data[f] = `req.body.${f}`);
    });
    routes.inject({
        method: route.method,
        objMethod: Object.keys(ctrl),
        path: route.path,
        params: (route.path.includes(':id') ? `req.params.id, ` : '') + JSON.stringify(data)
    });
});
routes.finalize();                                          // produces 20 RESTful routes using the 3 templates above in output directory
