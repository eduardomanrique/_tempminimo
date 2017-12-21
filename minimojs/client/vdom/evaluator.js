const esprima = require('../esprima');

const _findIdentifiersOnScript = (e, a) => {
    switch (e.type) {
        case "BinaryExpression":
        case "LogicalExpression":
            _findIdentifiersOnScript(e.left, a);
            _findIdentifiersOnScript(e.right, a);
            break;
        case "Identifier":
            if (e.name != 'eval') {
                a.push(e.name);
            }
            break;
        case "MemberExpression":
            _findIdentifiersOnScript(e.object, a);
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
        for(let i = 0; i < e._ctxList.length; i++){
            let ctx = e._ctxList[i];
            if(ctx._aliases){
                for(let k in ctx._aliases){
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
                const exp = left + '=window.__temp_val__';
                let varName = left.trim().split('.')[0];
                let found = false;
                for (let j = 0; j < this._ctxList.length; j++) {
                    const ctx = this._ctxList[j];
                    try {
                        ctx.eval(varName);
                        found = true;
                        ctx.eval(exp);
                        break;
                    } catch (e) {}
                }
                if (!found) {
                    this._ctxList[this._ctxList.length - 1].eval(exp);
                }
            } finally {
                delete minimoInstance.__temp_val__;
            }
        }
        eval(exp) {
            const cache = this.getVariables(exp);
            const variables = [];
            for (let i = 0; i < cache.variables.length; i++) {
                const varName = cache.variables[i];
                for (let j = 0; j < this._ctxList.length; j++) {
                    const ctx = this._ctxList[j];
                    let aliases = [varName];
                    if (ctx._aliases && ctx._aliases[varName]) {
                        aliases = ctx._aliases[varName].concat(aliases);
                    }
                    var obj;
                    var found = false;
                    for (let n = 0; n < aliases.length; n++) {
                        try {
                            obj = ctx.eval(aliases[n]);
                            found = true;
                            break;
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
            }
            const wrapper = new(Function.prototype.bind.apply(cache.fn, [null].concat(variables)));
            return wrapper.eval.bind(this._ctxList[0])(exp);
        }
        getVariables(exp) {
            var cached = _cache[exp];
            if (!cached) {
                var parsed = esprima.parse(exp);
                if (parsed.body[0].type != "ExpressionStatement") {
                    throw new Error(`Invalid expression ${exp}`);
                }
                var expression = parsed.body[0].expression;
                var cached = {
                    variables: []
                };
                try {
                    _findIdentifiersOnScript(expression, cached.variables);
                } catch (e) {
                    throw new Error(`Invalid expression ${exp}`);
                }
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