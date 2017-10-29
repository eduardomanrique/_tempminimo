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
    ifNotPresent(fn) {
        if (!this._val) {
            return fn();
        }
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
    orElse(another) {
        return this._val || another;
    }
    isPresent() {
        return this._val != null;
    }
}

const outdent = (s, ...val) => {
    let currVal = 0;
    let qtdSpaces = 0;
    let foundFirst = false;
    return s.map(v => v + (currVal < val.length ? val[currVal++] : '')).join('').split('\n')
      .map(line => {
        let result = line;
        if(!foundFirst){
          if(line.trim()){
            foundFirst = true;
            while(line[qtdSpaces] == ' ') qtdSpaces++;
          }else{
            return '';
          }
        }
        let countSpaces = qtdSpaces;
        while(result.startsWith(' ') && countSpaces > 0){
          countSpaces--;
          result = result.substring(1);
        }
        return result;
      }).join('\n').trim();
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

const toPromise = (p1, p2) => new Promise((resolve, reject) => {
    if(typeof p1 == "function"){
        const fn = p1;
        const parameters = p2 instanceof Array ? p2 : [p2];
        parameters.push((err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
        fn(...parameters);
    }else{
        resolve(p1);
    }
});


module.exports = {
    optionOf: optionOf,
    nullableOption: nullableOption,
    emptyOption: emptyOption,
    readModuleFile: readModuleFile,
    firstOption: firstOption,
    toPromise: toPromise,
    outdent: outdent
}