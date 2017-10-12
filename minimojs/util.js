const logging = require('./logging');
const fs = require('fs');

const readModuleFile = (path) => new Promise((resolve, reject) => {
    try {
        const filename = require.resolve(path);
        fs.readFile(filename, 'utf8', (err, data) => {
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        });
    } catch (e) {
        reject(e);
    }
});

class Option {
    constructor(val){
        this._val = val;
    }
    ifPresent(fn) {
        if(this._val){
            fn(this._val);
        }
    }
    get value() {
        return this._val;
    }
    orElseValue(another) {
        return this._val || another;
    }
    isPresent() {
        return this._val != null;
    }
}

module.exports = {
    optionOf: (val) => val ? new Option(val) : (() => {throw new Error('Value cannot be null')})(),
    nullableOption: (val) => new Option(val),
    emptyOption: () => new Option(null),
    readModuleFile: readModuleFile
}
