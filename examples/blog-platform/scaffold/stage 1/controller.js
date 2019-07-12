let schema = stage(0).get('schema').uplift()
let models = Object.keys(schema);
let ctrl = stage(0).get('controller')
models.forEach(table => {
    ctrl.inject({ model: table })
});
ctrl.finalize(models)       // generates 3 controllers based on our model
