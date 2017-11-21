class ContextManager {
    constructor() {
        this._countCtx = 1;
        this._ctxMap = {};
        this._ctxVarMap = {};
        this._evaluatorCtxVarMap = {};
    }
    add(ctx) {
        if (ctx._id) {
            throw new Error(`Added ctx ${ctx._id} twice`);
        }
        ctx._id = this._countCtx++;
        this._ctxMap[ctx._id] = ctx;
    }
    remove(ctx) {
        const id = ctx._id;
        if (this._ctxMap[ctx._id]) {
            delete ctx._id;
            delete this._ctxMap[ctx._id];
        }
    }
    listen(ctx, varName, vdom) {
        this._ctxVarMap[ctx._id] = this._ctxVarMap[ctx._id] || {}
        this._ctxVarMap[ctx._id][varName] = this._ctxVarMap[ctx._id][varName] || [];
        this._ctxVarMap[ctx._id][varName].push(vdom);
        this._evaluatorCtxVarMap[vdom._id] = this._evaluatorCtxVarMap[vdom._id] || [];
        this._evaluatorCtxVarMap[vdom._id].push(ctx);
    }
    varChanged(ctx, varName) {
        ((this._ctxVarMap[ctx._id] || {})[varName] || []).forEach(vdom => vdom.update());
    }
    vdomRemoved(vdom) {
        const list = this._evaluatorCtxVarMap[vdom._id];
        delete this._evaluatorCtxVarMap[vdom._id];
        for (let i = 0; i < list.length; i++) {
            const vars = this._ctxVarMap[list[i]._id];
            for (let k in vars) {
                const array = vars[k];
                const ind = array.indexOf(vdom);
                if (ind >= 0) {
                    array.splice(ind, 1);
                }
            }
        }
    }
}

module.exports = ContextManager;