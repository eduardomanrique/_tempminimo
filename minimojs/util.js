const logging = require('./logging');
const fs = require('fs');
const _ = require('underscore');

const readModuleFile = (path) => new Promise((resolve, reject) => {
    try {
        const filename = require.resolve(path);
        fs.readFile(filename, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    } catch (e) {
        reject(e);
    }
});

class Option {
    constructor(val) {
        this._val = val;
    }
    ifPresent(fn) {
        this.map(fn);
    }
    map(fn, defaultValue) {
        if (this._val) {
            return fn(this._val);
        }
        return defaultValue || defaultValue == "" ? defaultValue : null;
    }
    optionMap(fn) {
        if (this._val) {
            return nullableOption(fn(this._val));
        }
        return emptyOption();
    }
    get value() {
        return this._val;
    }
    orElseGet(fn) {
        return this._val || fn();
    }
    orElseValue(another) {
        return this._val || another;
    }
    isPresent() {
        return this._val != null;
    }
}

const optionOf = (val) => val ? new Option(val) : (() => {
    throw new Error('Value cannot be null')
})();
const nullableOption = (val) => new Option(val);
const emptyOption = () => new Option(null);
const firstOption = (array) => nullableOption(_.first(array));

Array.prototype.toPromise = Array.prototype.toPromise || function () {
    return Promise.all(this);
}

const toPromise = (fn, args) => new Promise((resolve, reject) => {
    const parameters = args instanceof Array ? args : [args];
    parameters.push((err, result) => {
        if(err){
            reject(err);
        }else{
            resolve(result);
        }
    });
    fn(...parameters);
})

module.exports = {
    optionOf: optionOf,
    nullableOption: nullableOption,
    emptyOption: emptyOption,
    readModuleFile: readModuleFile,
    firstOption: firstOption,
    toPromise: toPromise
}