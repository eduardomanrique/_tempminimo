function ComponentType(typeName, validator, mandatory, defaultValue) {
    this.defaultValue = function (val) {
        if (validator && !validator.validate(val)) {
            throw new Error('Invalid value ' + val + ' for ' + typeName);
        }
        return new ComponentType(typeName, validator, mandatory, val);
    };
    this.hasDefaultValue = function(){
        return defaultValue != null;
    };
    this.getDefaultValue = function(){
        return defaultValue;
    };
    this.getTypeName = function(){
        return typeName;
    };
    this.equivalent = function(type){
        return typeName == type.getTypeName();
    };
    this.isMandatory = function(){
        return mandatory == true;
    };
    this.convert = function(v){
        if (validator && !validator.validate(v)) {
            throw new Error('Invalid value ' + v + ' for ' + typeName);
        }
        return validator && validator.convert ? validator.convert(v) : v;
    };
    this.toString = function(){
        return name;
    }
}
var _numeric = {
    validate: function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },
    convert: function(v){
        return parseFloat(v);
    }
}
var _string = {
    validate: function(s) {
        return typeof(s) == 'string';
    }
}
var _boundVariable = {
    validate: function (v){
        if(v != null && v.trim() != ''){
            return v.split('.').every(e => {
                var exec = /[a-zA-Z\$_][a-zA-Z0-9\$_]*/.exec(e);
                return exec && exec[0] == e;
            });
        }
        return false;
    }
}
var _bind = _boundVariable;
var _bool = {
    validate: function(v){
        return v.toLowerCase() == 'true' || v.toLowerCase() == 'false';
    },
    convert: function(v){
        return v.toLowerCase() == 'true';
    }
}

module.exports = {
    isComponentType: function(v){
        return v instanceof ComponentType;
    },
    types: {
        string: new ComponentType("string", _string, false),
        number: new ComponentType("number", _numeric, false),
        bool: new ComponentType("bool", _bool, false),
        boundVariable: new ComponentType("boundVariable", _boundVariable, false),
        html: new ComponentType("html", _string, false),
        bind: new ComponentType("bind", _bind, false),
        any: new ComponentType("any", null, false),
        mandatory: {
            string: new ComponentType("string", _string, true),
            number: new ComponentType("number", _numeric, true),
            bool: new ComponentType("bool", _bool, true),
            boundVariable: new ComponentType("boundVariable", _boundVariable, true),
            html: new ComponentType("html", _string, true),
            bind: new ComponentType("bind", _bind, true),
            any: new ComponentType("any", null, true)
        }
    }
};