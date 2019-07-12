let orm = stage(0).get('orm')
let models = Object.keys(schema)
models.forEach(table => {
    orm.inject({ obj: table,  model: `${table}Schema`, schema: schame[table].map(f => `${f}: String`).join(',') })
});
routes.finalize(models)     // generates 3 mongoose models and puts them in separate files named after schema keys
