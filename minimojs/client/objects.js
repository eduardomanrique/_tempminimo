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
    if(child){
        child.path = prePath + (child.computed ? '' : '.') + child.path;
        _updateChild(child.path, child.next);
    }
}

class Objects {
    constructor(bind, ctx, getStringifiedValue) {
        const parsed = esprima.parse(bind).body[0];
        if (parsed.type != 'ExpressionStatement') {
            throw new Error(`Invalid bind value ${bind}`);
        }
        this._ctx = ctx;
        this._variableStructure = node(parsed.expression);
        this._getStringifiedValue = getStringifiedValue;
    }
    updateVariable() {
        let val = this._variableStructure;
        do {
            if (!val.next) {
                this._ctx.eval(val.path + '=' + this._getStringifiedValue());
            } else {
                let obj;
                try{
                    obj = this._ctx.eval(val.path);
                }catch(e){}
                if(!obj){
                    let isArray = false;
                    if (val.next && val.next.computed) {
                        const dynName = this._ctx.eval(val.next.name);
                        if (typeof (dynName) == "number") {
                            isArray = true;
                        }
                    }
                    this._ctx.eval(val.path + '=' + (isArray ? '[]' : '{}'));
                }
            }
        } while ((val = val.next));
    }
}

module.exports = Objects;