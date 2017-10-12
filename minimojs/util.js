const logging = require('./logging');

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
    emptyOption: () => new Option(null)
}
