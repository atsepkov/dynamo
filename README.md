# Dynamo
General case scaffold generator for code.

Scale development faster. Produce clean, uniform code that's easy to navigate/understand.

## Use Case 1
Your typical web app has a ton of repeated logic. Let's say you build a library app.
You first create a user model. For that model, you now build DB integration, controller, routes, client-side model and views.
You now repeat the same process with a book model, and later other models you add (periodical, admin, etc.).
Each one has unique columns in DB, unique controller logic, and probably unique views, but overall there is a lot of very
similar code between them that you simply can't factor out into reusable module because it would make logic harder to reason about
and possibly more verbose because while the flow is similar, it's littered with a ton of unique special-casing for each.
The code itself is simple to understand, but the scale of it makes it harder to traverse all at once. There are systems like RoR
that try to apply this kind of scale via magic, that many users learned to hate. However, the hate is due to the fact that this
magic is based on assumptions of a special case the original team needed. The approach special-cases web development with hardcoded
"best practices". What Dynamo aims to be is a more general-case scalability solution for code-building, where you define your
own magic and best practices and the system scales exactly as you expect, as opposed to accepting someone else's magic.

What happens when best practices change, architecture changes, or you get wiser and raelize your initial scaffold was crap? No problem,
just regenerate the scaffold using new best practices. The smart diffing algorithm will be able to change the scaffold without touching
your code as long as you don't touch the scaffold itself. You may want to add a git hook to ensure no dev edits the scaffold.

## Use Case 2
Take existing code that violates consistency rules, find common patterns you want to extend to the rest of the codebase, generate a builder
able to generate a scaffold that closely matches your exisitng code, keep refactoring current code until Dynamo stops reporting errors
(Dynamo will point out exact module violating the scaffold). Once done, your entire codebase will conform to the scaffold. You're now free
to update/modify the scaffold using Dynamo, scale it further, mass-generate unit tests, etc.

## Functionality
A typical compiler is a special-cased generator. It will take your code, compile it and run it. In Dynamo, compilation is multi-dimensional.
Code processing becomes its own scale in Dynamo. You can add as many pre-compilers as you wish, and they're all written in the same syntax.
The simpler codebits get moved around into bigger whole by later compilation steps, and you, the developer, can add as many compilation
steps as you wish.

Each new compilation stage is effectivelly a run stage as far as previous stage is concerned. In this way, the code from stage 1 is executed
in stage 2, which in turn uses it to compile stage 3. Stage 1 and 3 can't interact, but stage 2 can interact with output of stage 1 and input
of stage 3. Stage 2 is a derivative of stage 1. A string in higher level becomes code in lower level, but only executed at the end.

## Interaction
- magic variables in earlier stage are valid placeholders for later stage
- later stage can interact with output of earlier stage directly
- earlier stage needs a concept of magic operators (instructions for higher level on how to treat/separate/split data from this level)
    - without this addressed we will have too much segmentation at earliest stage, where you're forced to create a separate file for each column in a table
    - or maybe not, you just uplift the segmentation object into higher level
    - magic operators are not for separating logic into separate codebits, they're for differentiate template logic of current level from compiler logic of current level
    - the visible (input) directories define compiler logic, the hidden (_output) directories define intermediate template logic for next stage, except stage 1, where all your templates should reside
- need to be able to reference same file in multiple places without copying (effectivelly a require() generator)

## Concepts
Codebit:    # a chunk of code parsed from earlier stage
    inject(magic vars)          # add variables to this codebit (variables not part of template will be rejected)
    uplift()                    # execute template as is, without injecting variables (promote logic from lower level to current level)
    import(dependency)          # (deprecated, use wrapper template codebit instead) create a dependency between two codebits, building a new file with this codebit now results in requiring all dependencies
    generate(categories)        # produces output for this codebit, if there are missing variables, will produce another template with those variables left
    finalize(file[s])           # like generate but all variables must be injected, no argument = return output, argument results in file by that name
    refactor()                  # (deprecated, should be automatic?) grab user content they put into final code cell and output it in new location?

    _generated                  # intermediate code that was generated by this codebit
    _template                   # code that was used as template for this codebit
    _interface                  # dict of intefaces injected into this codebit (each interface is an array of injections)

Stage:      # set of directories that define compilation steps for this stage
    get(name)                   # get a codebit with this name, can also to be used to generate a codebit using a dimension intersection

Parser:     # a logic that defines how to "uplift" a file type (so you can uplift json, yaml, etc.)
    eval(code)                  # generates a compatible construct/object based on parser rules

trends I expect:
- more template-like logic will live at lower levels
- more controller-like logic will live at higher levels
- most projects will not use more than 2 levels
- each level will be used to serve some purpose of development process, i.e.:
    - 0: templates > 1: compiler > 2: code > 3: tests > 4: deploy > 5: scale

concepts
- all templates should reside in stage 0, all logic that will be used towards output should be at stage 0, the rest is compiler logic
- a codebit can be a fragment or a wrapper for one or more other codebits, a stage is a single compilation pass
- generate and uplift are opposite processes, generate flattens an object into a string, uplift evals a string/object into compiler code
- inject is like a sql-equivalent of a bind
- you're always inside a shell/compiler, you're being evaled, even as compiler logic, your bits are passive (declarative, not imperative)
- in order to uplift an object, all binds need to be assigned (what about multiple bind slices?)
- you can edit compiled code as long as it doesn't violate the scaffold (diff can't contain any red, only green)
- forklift: use scaffold difference to refactor all code at once
- your generated scaffold is a grid, each location can be referenced as a coordinate using dimensions, for example, the following selector
  would find a codebit named 'item', then fetch the output of `foo,bar x baz,qux` intersection, this may be useful for refactoring code
    stage(0).get('route method,params baz,qux')
  an equivalent way to drive to same destination if you have different data may be
    stage(0).get('item').generate(['one', 'two'])['two']

selectors
- if you think of output as a grid, you can fetch exact scaffold cell via a selector, as mentioned in last bullet above, something along these lines:
    stage(0).get('route object:user method:get')            # returns generated code at given intersection, method is unique, other params can be omitted
                                                            # since dimensions are labeled, order does not matter
    stage(0).get('route user get,...')                      # (maybe) an equivalent syntax to above that omits key names by referencing ALL columns in dimension+alphabetical order
    stage(0).get('route user', { method: 'get' })           # yet another equivalent syntax that passes the hash directly
    stage(0).get(route, 'user', { method: 'get' })          # (maybe) yet another equivalent syntax that uses prefetched codebit
    stage(0).get('route object:user')                       # returns an entire slice
- can slice be a dynamic codebit? It's a template that may or may not have magic variables
- do we want to allow dynamic codebits? Code/file that comes out of "nowhere" seems dangerous/scary. It's effectivelly a detached codebit
    - yes, you can search for all finalize() calls

common patterns I forsee that may need a method/abstraction:
    Object.keys(items).forEach(item => { ... });

    stage(n).get(resource)

# Example of Schema Template -- schema.js (level 0)

    { 
        user: [ 'user', 'pw', 'avatar', 'email' ],
        topic: [ 'name', 'description' ],
        blog: [ 'name', 'content', 'author', 'date', 'topic' ],
        comment: [ 'user', 'blog', 'content' ]
    }

# Example of a Route Template -- route.js (level 0)

    << method, objMethod, object, path, params >> # defines magic variables in below codebit
    app.method('path', (req, res) => {
        let result = object.objMethod(params);
        if (result.error) {
            res.status(500).send(error);
        } else {
            res.send(result);
        }
    });

# Example of Route Convention Template -- rest.js (level 0)

    {
        list: { method: 'get', path: '/object' },
        get: { method: 'get', path: '/object/:id' },
        post: { method: 'post', path: '/object' },
        put: { method: 'put', path: '/object/:id' },
        del: { method: 'delete', path: '/object/:id' },
    }

# Example of a Mongoose codebit -- orm.js (level 0)

    << obj, model schema >>
    let model = new mongoose.Schema({
        schema
    });
    let obj = mongoose.Model('obj', model);

# Example of Controller codebit -- controller.js (level 0)

    << model >>
    {
        list: () => model.find(),
        get: (id) => model.findById(id),
        post: (data) => model.create(data),
        put: (id, data) => model.findByIdAndUpdate(id, data),
        delete: (id) => model.findByIdAndDelete(id),
    }

# Example of Route Generator -- routes.js (level 1)

    let schema = stage(0).get('schema').uplift()        # parses schema from lower level into an object in this level
    let rest = stage(0).get('rest').uplift()
    let routes = stage(0).get('route');                 # no uplifting, this will be our generator for this stage
    let ctrl = stage(0).get('controller').uplift({ model: {} })     # dummy model, we only want the keys
    Object.keys(schema).forEach(table => {
        routes.inject({ object: table });
    });
    Object.keys(rest).forEach(route => {
        let data = {};
        Object.keys(schema).forEach(table => {
            schema[table].forEach(f => data[f] = `req.body.${f}`);
        });
        routes.inject({ method: route.method, objMethod: Object.keys(ctrl), path: route.path, params: (route.path.includes(':id') ? `req.params.id, ` : '') + JSON.stringify(data) });
    });
    routes.generate();                                  # produces 20 RESTful routes using the 3 templates above in output directory

# Example of Model Generator -- model.js (level 1)

    let schema = stage(0).get('schema').uplift()
    let orm = stage(0).get('orm')
    let models = Object.keys(schema);
    models.forEach(table => {
        orm.inject({ obj: table,  model: `${table}Schema`, schema: schame[table].map(f => `${f}: String`).join(',') });
    });
    routes.generate(models);                            # generates 3 mongoose models and puts them in separate files named after schema keys

# Example of Controller Generator -- controller.js (level 1)

    let schema = stage(0).get('schema').uplift()
    let models = Object.keys(schema);
    let ctrl = stage(0).get('controller')
    models.forEach(table => {
        ctrl.inject({ model: table });
    });
    ctrl.generate(models)                               # generates 3 controllers based on our model

# Example 1
Web App

level 1:
- router/   define 4 methods (GET/POST/PUT/DELETE) <- magic variables being portions of url and controller names
- model/    define one object for talking to DB <- magic variables being table/column names
- schema/   define a hash of tables of columns <- no magic, effectivelly a set of constants
- view/     define html page (template) for an element, define header html, define footer, nav
- controller/   define any curation logic
output/
- same as input

level 2:
  (schema is uplifted, from template to compiler logic)
- router/   inject schema into routes for-each schema to generate set of routes
- model/    inject schema into model template for-each schema to generate set of models
- view/     inject schema into views for-each schema to generate set of views
output/
- router/   set of routes for each schema object
- model/    model for each schema object
- view/     view for each schema object

# Design Questions
- What happens if you inject a codebit into another codebit? Does it flatten? Does it create another layer of dimension-forming (more branches)
- How can you encourage devs to uplift complex portions of the code into the scaffold instead of modifying generated code (undesired)
- How can you organize that code cleanly at lowest level? perhaps some sort of naming convention to let user know:
    - when each template gets used (which layers)
- How can you inspect state at all times?
    - An always-on shell that lets you examine any portion of current state
    - You're expected to have input (editor)/output (shell) side by side as you code
    - a background daemon auto-recompiles your code in real time
    - in the shell you can view any final/generated file immediatelly (or error)
- You can't inject same variable more than once into the template, but can you append? Only if you append entire injection interface at once

# Shell Invocation
dynamo build (in home directory to generate output)
dynamo inspect (to enter shell for current project)

# Shell Screen Example:

    module: name (stage/path/name.js)
    source:
        <codebit you're editing>

    templates:
        <templates you're using, with highlighted magic>
        <magic gets highlighted differently based on injections of this level>
        <output also shows a little badge (branching factor) near each defined magic>
        <badges are colorcoded based on injection group>

    output:
        <virtual output, partially resolved - may still have magic - highlighted>

# Shell Commands
(shell is basically a view generator of current state, you interact with shell using files, not lines of code)
stage(1).get('module')

# Libs/Implementation
- diff for diffing scaffold
- daemon/shell uses chokidar (https://github.com/paulmillr/chokidar)
- express-based route communication
- shell generates external state in watch mode that can be talked to via endpoints
