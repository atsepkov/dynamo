import * as fs from 'fs-extra'
import * as path from 'path'
import readDir from 'recursive-readdir'
import { CodeBit } from './codebit'

// A single generator/builder stage. Stage has the power to move codebits around,
// transform them, swap them, and organize them
export class Stage {
    constructor(projectDir, level) {
        this.codebits = {}      // set of codebits belonging to this stage
        this.stageArea = path.join(projectDir, `stage ${level}`)
    }

    // initializes the stage and returns a promise that resolves once initialization
    // is complete
    init() {
        return new Promise((resolve, reject) => {
            readDir(this.stageArea).then(list => {
                Promise.all(list.map(file => {
                    return fs.readFile(file, "utf8").then(content => {
                        let basename = file.replace(this.stageArea + '/', '')
                        return this.codebits[basename] = new CodeBit(content)
                    })
                })).then(() => resolve())
            })
        })
    }

    // returns a codebit by name
    get(codebit) {
        return this.codebits[codebit]
    }
}

