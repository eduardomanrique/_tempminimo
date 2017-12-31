const esprima = require('../esprima');

const _isNode = (o) =>
    typeof Node === "object" ? o instanceof Node :
    o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName === "string";

const _isElement = (o) =>
    typeof HTMLElement === "object" ? o instanceof HTMLElement :
    o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string";

const _findIdentifiersOnScript = (e, a) => {
    switch (e.type) {
        case "BinaryExpression":
        case "LogicalExpression":
            _findIdentifiersOnScript(e.left, a);
            _findIdentifiersOnScript(e.right, a);
            break;
        case "Identifier":
            if (e.name != 'eval') {
                a.add(e.name);
            }
            break;
        case "MemberExpression":
            _findIdentifiersOnScript(e.object, a);
            if (e.computed) {
                _findIdentifiersOnScript(e.property, a);
            }
            break;
        case "ConditionalExpression":
            _findIdentifiersOnScript(e.test, a);
            _findIdentifiersOnScript(e.consequent, a);
            _findIdentifiersOnScript(e.alternate, a);
            break;
        case "CallExpression":
            _findIdentifiersOnScript(e.callee, a);
            if (e.arguments) {
                for (let i = 0; i < e.arguments.length; i++) {
                    _findIdentifiersOnScript(e.arguments[i], a);
                }
            }
            break;
        case "ObjectExpression":
            for (let i = 0; i < e.properties.length; i++) {
                _findIdentifiersOnScript(e.properties[i].value, a);
            }
            break;
        case "ArrayExpression":
            for (let i = 0; i < e.elements.length; i++) {
                _findIdentifiersOnScript(e.elements[i], a);
            }
            break;
        case "UpdateExpression":
        case "UnaryExpression":
            _findIdentifiersOnScript(e.argument, a);
            break;
        case "ThisExpression":
        case "Literal":
            break;
        default:
            throw new Error("Invalid Expression");
    }
}

const EvaluatorManager = function (minimoInstance, ctxManager) {
    const _cache = {};
    this.build = (virtualDom) => {
        const _findCtxList = (vDom) => {
            let _c = vDom;
            do {
                if (virtualDom.isComponentInternal && _c._componenCtx) {
                    return [].concat(_c.ctx._ctxList).concat([_c._componenCtx]);
                }
                if (_c.ctx && _c.ctx instanceof Evaluator) {
                    return [].concat(_c.ctx._ctxList);
                }
                _c = _c.parent;
            } while (_c);
            return [minimoInstance];
        }
        const e = new Evaluator();
        e._virtualDom = virtualDom;
        e._ctxList = _findCtxList(virtualDom);
        virtualDom.ctx = e;
        return e;
    }
    this.buildWith = (virtualDom, newCtx) => {
        const e = this.build(virtualDom);
        let aliases = {};
        for (let i = 0; i < e._ctxList.length; i++) {
            let ctx = e._ctxList[i];
            if (ctx._aliases) {
                for (let k in ctx._aliases) {
                    aliases[k] = (aliases[k] || []).concat(ctx._aliases[k]);
                }
            }
        }
        newCtx._aliases = aliases;
        e._ctxList = [newCtx].concat(e._ctxList);
        return e;
    }
    class Evaluator {
        constructor() {
            this._listening = {};
        }
        evalSet(left, value) {
            window.__temp_val__ = value;
            try {
                let exp = left + '=window.__temp_val__';
                if (left.indexOf('.') < 0 && left.indexOf('[') < 0) { //single var
                    let found = false;
                    for (let j = 0; j < this._ctxList.length; j++) {
                        const ctx = this._ctxList[j];
                        try {
                            ctx.eval(left);
                            found = true;
                            ctx.eval(exp);
                            break;
                        } catch (e) {}
                    }
                    if (!found) {
                        this._ctxList[this._ctxList.length - 1].eval(exp);
                    }
                } else {
                    this._eval(left, 'window.__temp_val__')(exp);
                }
            } finally {
                delete minimoInstance.__temp_val__;
            }
        }
        _eval(exp) {
            const cache = this.getVariables(exp);
            const variables = [];
            for (let i = 0; i < cache.variables.length; i++) {
                const varName = cache.variables[i];
                var found = false;
                var foundElement;
                for (let j = 0; j < this._ctxList.length; j++) {
                    const ctx = this._ctxList[j];
                    let aliases = [varName];
                    if (ctx._aliases && ctx._aliases[varName]) {
                        aliases = ctx._aliases[varName].concat(aliases);
                    }
                    var obj;
                    for (let n = 0; n < aliases.length; n++) {
                        try {
                            obj = ctx.eval(aliases[n]);
                            if (!_isNode(obj) && !_isElement(obj)) {
                                found = true;
                                break;
                            }else{
                                foundElement = obj;
                            }
                        } catch (e) {}
                    }
                    if (!found) {
                        continue;
                    }
                    variables.push(obj);
                    if (!this._listening[exp]) {
                        this._listening[exp] = true;
                        ctxManager.listen(ctx, varName, this._virtualDom);
                    }
                    break;
                }
                if(!found && foundElement){
                    variables.push(foundElement);
                }
            }
            const wrapper = new(Function.prototype.bind.apply(cache.fn, [null].concat(variables)));
            return (exp) => wrapper.eval.bind(this._ctxList[0])(exp);
        }
        eval(exp) {
            try {
                return this._eval(exp)(exp);
            } catch (e) {
                console.trace(e);
                throw new Error(`Error evaluating js expression '${exp}': ${e.message}`);
            }
        }
        unsafeEval(exp) {
            try {
                return this._eval(exp)(exp);
            } catch (e) {
                return null;
            }
        }
        getVariables(exp) {
            var cached = _cache[exp];
            if (!cached) {
                var parsed;
                try {
                    parsed = esprima.parse(exp);
                } catch (e) {
                    throw new Error(`Invalid js expression '${exp}': ${e.message}`);
                }
                if (parsed.body[0].type != "ExpressionStatement") {
                    throw new Error(`${exp} is not and js expression`);
                }
                var expression = parsed.body[0].expression;
                var variables = new Set();
                try {
                    _findIdentifiersOnScript(expression, variables);
                } catch (e) {
                    throw new Error(`Invalid expression ${exp}`);
                }
                var cached = {
                    variables: Array.from(variables)
                };
                cached.fn = eval(`function _evaluator(${cached.variables.join(',')}){
                    return {
                        eval: function(s){
                            return eval(s);
                        }
                    }
                };_evaluator`);
                _cache[exp] = cached;
            }
            return cached;
        }
    }
}

module.exports = EvaluatorManager;