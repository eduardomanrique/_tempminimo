const esprima = require('esprima');

const _findIdentifiersOnScript = (e, a) => {
    switch (e.type) {
        case "BinaryExpression":
        case "LogicalExpression":
            _findIdentifiersOnScript(e.left, a);
            _findIdentifiersOnScript(e.right, a);
            break;
        case "Identifier":
            a.push(e.name);
            break;
        case "MemberExpression":
            _findIdentifiersOnScript(e.object, a);
            break;
        case "ConditionalExpression":
            _findIdentifiersOnScript(e.test, a);
            _findIdentifiersOnScript(e.consequent, a);
            _findIdentifiersOnScript(e.alternate, a);
    }
}

const EvaluatorManager = function (root, ctxManager) {
    const _cache = {};
    const _findCtxList = (vDom) => {
        let _c = vDom;
        do{
            if(_c.ctx && _c.ctx instanceof Evaluator){
                return [].concat(_c.ctx._ctxList);
            }
            _c = _c.parent;
        }while(_c);
        return [root];
    }
    this.build = (virtualDom) => {
        const e = new Evaluator();
        e._virtualDom = virtualDom;
        e._ctxList = _findCtxList(virtualDom);
        virtualDom.ctx = e;
        return e;
    }
    this.buildWith = (virtualDom, newCtx) => {
        const e = this.build(virtualDom);
        e._ctxList = [newCtx].concat(e._ctxList);
        return e;
    }
    class Evaluator {
        constructor(){
            this._listening = {};
        }
        eval(exp) {
            const cache = this.getVariables(exp);
            const variables = [];
            for (let i = 0; i < cache.variables.length; i++) {
                const varName = cache.variables[i];
                for (let j = 0; j < this._ctxList.length; j++) {
                    const ctx = this._ctxList[i];
                    try {
                        var obj = ctx.eval(varName);
                        variables.push(obj);
                        if(!this._listening[exp]){
                            this._listening[exp] = true;
                            ctxManager.listen(ctx, varName, this._container);
                        }
                        break;
                    } catch (e) {}
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
                    throw new Error("Invalid expression " + exp);
                }
                var expression = parsed.body[0].expression;
                var cached = {
                    variables: []
                };
                _findIdentifiersOnScript(expression, cached.variables);
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