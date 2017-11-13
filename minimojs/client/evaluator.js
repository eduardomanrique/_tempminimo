const esprima = require('esprima');

function Evaluator() {
    this._cache = {};

    function getIdentifiers(e, a){
        switch(e.type){
            case "BinaryExpression": 
            case "LogicalExpression":
                getIdentifiers(e.left, a);
                getIdentifiers(e.right, a);
                break;
            case "Identifier": 
                a.push(e.name);
                break;
            case "MemberExpression": 
                getIdentifiers(e.object, a);
                break;
            case "ConditionalExpression":
                getIdentifiers(e.test, a);
                getIdentifiers(e.consequent, a);
                getIdentifiers(e.alternate, a);
        }
    }
    
    this.eval = function (exp, ctxList) {
        var cache = this._getVariables(exp);
        var variables = [];
        for(var i = 0; i < cache.variables.length; i++){
            for(var j = 0; j < ctxList.length; j++){
                try{
                    var obj = ctxList[j].eval(cache.variables[i]);
                    variables.push(obj);
                    break;
                }catch(e){
                    console.log(e);
                }
            }
        }
        var wrapperCtx = new (Function.prototype.bind.apply(cache.fn, [null].concat(variables)));
        return wrapperCtx.eval.bind(ctxList[0])(exp);
    }
    this._getVariables = function (exp) {
        var cached = this._cache[exp];
        if (!cached) {
            var parsed = esprima.parse(exp);
            if (parsed.body[0].type != "ExpressionStatement") {
                throw new Error("Invalid expression " + exp);
            }
            var expression = parsed.body[0].expression;
            var cached = {
                variables: []
            };
            getIdentifiers(expression, cached.variables);
            cached.fn = eval(`function _evaluator(${cached.variables.join(',')}){
                return {
                    eval: function(s){
                        return eval(s);
                    }
                }
            };_evaluator`);
            this._cache[exp] = cached;
        }
        return cached;
    }
}

module.exports = {
    Evaluator: Evaluator
}