import { DELIM } from './constants'

// basic building block, these get moved around and injected/combined with other code
// to produce a scaffold.
export class CodeBit {
    constructor(template) {
        let { t, v } = hydrate(template)
        this.template = t       // hydrated version of the template
        this.variables = v      // extracted variables
        this.usedVars = []      // variables we've seen injected
        this.interfaces = {}    // interfaces we've seen injected (groups of variables)
        this.dimensions = []    // dimensions of injection, this is priority/order of our interfaces
    }

    // injects variables into the codebit
    inject(vars) {
        let names = Object.keys(vars)
        let iface = names.sort().join(",")
        if (this.interfaces[iface]) {
            // we're really just appending to an existing interface
            this.interfaces[iface].push(vars)
            return
        }
        names.forEach(variable => {
            if (this.variables.includes(variable)) {        // variable was defined
                if (!this.usedVars.includes(variable)) {    // and not yet used
                    this.usedVars.push(variable)
                } else {
                    throw new Error(`Variable "${variable}" was already injected in earlier set`)
                }
            } else {
                throw new Error(`Injected variable "${variable}" does not exist in template`)
            }
        })
        this.interfaces[iface] = [vars]
        this.dimensions.push(iface)
    }

    // generates text using template and variables
    generate(groups) {

        // alias unused variables to themselves so we can pass them along in the template without filling them
        let unusedVars = this.variables.filter(v => !this.usedVars.includes(v))
        let dimensions = this.dimensions.slice(0)
        let interfaces = Object.assign({}, this.interfaces)
        if (unusedVars.length) {
            dimensions.push(unusedVars.join(','))
            interfaces = Object.assign(interfaces, {[unusedVars.join(',')]: [unusedVars.reduce((map, field) => {
                map[field] = '${' + field + '}'
                return map
            }, {})]})
        }
            
        console.log(this.dimensions.map(d => this.interfaces[d])) // TODO: here to debug first test of generation
        // let binds = cartesianProduct(this.dimensions.map(d => this.interfaces[d])).map(s => Object.assign({}, ...s))
        let binds = cartesianProduct(dimensions.map(d => interfaces[d])).map(s => Object.assign({}, ...s))
        let output = binds.map(slice => eval("({" + Object.keys(slice).join(',') + "}) => `" + this.template + "`")(slice))
        if (groups) {
            if (groups.length !== output.length) {
                throw new Error(`Codebit produced ${output.length} code chunks, can't group into ${groups.length} objects`)
            } else {
                // return several groups
                return groups.reduce((map, name, i) => {
                    map[name] = output[i]
                    return map
                }, {})
            }
        } else {
            // return a single blob
            return output.join('\n\n')
        }
    }

    // identical to generate, but requires all variables injected
    finalize() {
        if (this.variables.length > this.usedVars.length) {
            throw new Error("Template requires additional dimensions to finalize")
        }
        return this.generate()
    }

    // executes codebit in current scope
    uplift() {
        console.log(this.finalize())
        return eval("(" + this.finalize() + ")")
    }
}

// helper functions

// scan a string and extract magic variables (ones between delimiters)
function hydrate(template) {
    template = template.trim()
    let start = template.indexOf(DELIM[0])
    if (start === 0) {  // magic must start on first line
        let end = template.indexOf(DELIM[1])
        if (end === -1) {
            throw new Error('Invalid template, unterminated magic')
        } else {
            let magic = template.slice(start + DELIM[0].length, end - 1).split(',').map(v => v.trim())
            template = template.slice(end + DELIM[1].length).trim()
            magic.forEach(variable => {
                template = template.replace(new RegExp(`\\b${variable}\\b`, 'g'), '${' + variable + '}')
            })
            return {
                t: template,
                v: magic
            }
        }
    } else {
        // no variables
        return {t: template, v: []}
    }
}

// finds cartesian product of interfaces
function cartesianProduct(dimensions) {
    return dimensions.reduce((a, b) => a.reduce((r, v) => r.concat(b.map(w => [].concat(v, w))), []));
}
