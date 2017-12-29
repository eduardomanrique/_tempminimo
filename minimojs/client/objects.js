const esprima = require('./esprima');

const node = (parsed, child) => {
    const val = {};
    let finalNode = true;
    if (parsed.type == "ThisExpression") {
        val.path = 'this';
    } else if (parsed.type == "Identifier") {
        val.path = parsed.name;
    } else {
        finalNode = false;
        val.computed = parsed.computed;
        val.name = parsed.property.type == "Literal" ? parsed.property.raw : parsed.property.name;
        val.path = parsed.computed ? `[${val.name}]` : val.name;
    }
    val.next = child;
    if (!finalNode) {
        return node(parsed.object, val);
    }
    _updateChild(val.path, val.next);
    return val;
}

const _updateChild = (prePath, child) => {
    if (child) {
        child.path = prePath + (child.computed ? '' : '.') + child.path;
        _updateChild(child.path, child.next);
    }
}

class Objects {
    constructor(bind, ctx, getValue) {
        let parsed;
        try {
            parsed = esprima.parse(bind).body[0];
        } catch (e) {
            console.trace(e);
            throw new Error(`Error creating Objects instance: invalid bind ${bind}`);
        }
        if (parsed.type != 'ExpressionStatement') {
            throw new Error(`Invalid bind value ${bind}`);
        }
        this._ctx = ctx;
        try {
            this._variableStructure = node(parsed.expression);
        } catch (e) {
            throw new Error(`Invalid bind expression ${bind}.`);
        }
        this._getValue = getValue;
    }
    updateVariable() {
        let val = this._getValue();
        if (this._arrayFn) {
            let current = this._ctx.eval(this.getOrCreateVariable().path) || [];
            if (!val) {
                let nonNullVal = this._arrayFn();
                let ind = current.indexOf(nonNullVal);
                if (ind >= 0) {
                    current.splice(ind, 1);
                }
            } else {
                if (current.indexOf(val) < 0) {
                    current.push(val);
                }
            }
            val = current;
        }
        this._ctx.evalSet(this.getOrCreateVariable().path, val);

    }
    getOrCreateVariable() {
        let val = this._variableStructure;
        do {
            if (!val.next) {
                return val;
            } else {
                let obj;
                try {
                    obj = this._ctx.eval(val.path);
                } catch (e) {}
                if (!obj) {
                    let isArray = false;
                    if (val.next && val.next.computed) {
                        const dynName = this._ctx.eval(val.next.name);
                        if (typeof (dynName) == "number") {
                            isArray = true;
                        }
                    }
                    this._ctx.evalSet(val.path, isArray ? [] : {});
                }
            }
        } while (val = val.next);
    }
    useArray(fn) {
        this._arrayFn = fn;
    }
}

module.exports = Objects;