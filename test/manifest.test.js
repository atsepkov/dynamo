// this file is only here to work around node + jest still failing to respect imports in 2019
const esmImport = require('esm')(module);
const codebit = esmImport('./codebit')
