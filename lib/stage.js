import * as fs from 'fs-extra'
import * as path from 'path'
import { CodeBit } from './codebit'

// A single generator/builder stage. Stage has the power to move codebits around,
// transform them, swap them, and organize them
export class Stage {
    constructor(rootDir, level) {
        this.codebits = {}      // set of codebits belonging to this stage

        let stageArea = path.join(rootDir, `stage ${level}`)
        fs.readdir(stageArea).then(list => {
            // exclude hidden files
            list = list.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item))
            list.forEach(entry => {
                let entryPath = path.join(stageArea, entry)
                fs.stat(entryPath).then(stats => {
                    if (stats.isDirectory()) {
                        // we have to go a level deeper
                        return "dir"
                    } else {
                        // we grab this file
                        return fs.readFile(entryPath, "utf8")
                    }
                }).then(text => {
                    console.log('file', entry,  text)
                    this.codebits[entry] = new CodeBit(text)
                })
            })
        })
    }

    // returns a codebit by name
    get(codebit) {
        return this.codebits[codebit]
    }
}

// Helper functions

// Recursive directory reader
function readRecursive(dir) {
    let results = [];
    return fs.readdir(dir).then(files => {
        files.forEach(file => {
            let entryPath = path.resolve(dir, file)
            fs.stat(entryPath).then(stat => {
                if (stat && stat.isDirectory()) {
                    // directory, recurse into new level
                    readRecursive(entryPath).then(subdir => {
                        results = results.concat(subdir)
                    })
                } else {
                    // single file
                    results.push(entryFile);
                }
            })
        })
    })
}
