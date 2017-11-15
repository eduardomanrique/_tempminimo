import { posix } from 'path';

const util = require('./util.js');
const Evaluator = require('./evaluator.js').Evaluator;
const esprima = require('esprima');
//const modals = require('./modal.js');

const VirtualDomManager = function(mimimoInstance){
    const _dom = new dom.Dom(mimimoInstance);
    const _cache = {};
    let _countCtx = 0;
    const _ctxMap = {};
    const _ctxVarMap = {};
    const _evaluatorCtxVarMap = {};
    const ContextManager = {
        add: (ctx) => {
            if(ctx._id){
                throw new Error(`Added ctx ${ctx._id} twice`);
            }
            ctx._id = _countCtx++;
            _ctxMap[ctx._id] = ctx;
        },
        remove: (ctx) => {
            delete _ctxMap[ctx._id];
        },
        listen: (ctx, varName, container) => {
            _ctxVarMap[ctx._id] = _ctxVarMap[ctx._id] || {}
            _ctxVarMap[ctx._id][varName] = _ctxVarMap[ctx._id][varName] || [];
            _ctxVarMap[ctx._id][varName].push(container);
            _evaluatorCtxVarMap[container._id] = _evaluatorCtxVarMap[container._id] || [];
            _evaluatorCtxVarMap[container._id].push(ctx);
        },
        containerRemoved: (container) => {
            const list = _evaluatorCtxVarMap[container._id];
            delete _evaluatorCtxVarMap[container._id];
            for(let i = 0; i < list.length; i++){
                delete _ctxVarMap[list[i]._id];
            }
        }
    }
    const _findIdentifiersOnScript = (e, a) => {
        switch(e.type){
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
    const _findCtxList = (container) => {
        const list = [];
        const find = (_c) => {
            if(_c instanceof ComponentContainer){
                list.push(_c.getLocalContext());
            }
            if(_c.parent){
                find(_c.parent);
            }
        }
        find(container);
        list.push(mimimoInstance);
        return list;
    }
    class Evaluator{
        constructor(container){
            this._container = container;
            this._ctxList = _findCtxList(container);
        }
        eval (exp) {
            if(!this._wrapperCtx){
                const cache = this.getVariables(exp);
                const variables = [];
                for(let i = 0; i < cache.variables.length; i++){
                    const varName = cache.variables[i];
                    for(let j = 0; j < this._ctxList.length; j++){
                        const ctx = this._ctxList[i];
                        try{
                            var obj = ctx.eval(varName);
                            variables.push(obj);
                            ContextManager.listen(ctx, varName, this._container);
                            break;
                        }catch(e){
                        }
                    }
                }
                this._wrapperCtx = new (Function.prototype.bind.apply(cache.fn, [null].concat(variables)));
            }
            return wrapperCtx.eval.bind(this._ctxList[0])(exp);
        }
        getVariables(exp) {
            var cached = EvaluatorManager._cache[exp];
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
                EvaluatorManager._cache[exp] = cached;
            }
            return cached;
        }
    }

    class Container {
        constructor(struct){
            this._htmlStruct = htmlStruct;
            this._child = [];
        }
        addChild(child) {
            this._child.push(child);
            child._parent = this;
        }
        remove() {
            this.removeChild();
            ContextManager.containerRemoved(this);
        }
        removeChild(){
            this._child.forEach(c => c.remove());
        }
        forEachChild(fn){
            this._child.forEach(fn);
        }
        update(){}
    }
    class ContextContainer extends Container {
        constructor(struct, ctx){
            super(struct, ctx);
            ContextManager.add(ctx);
            this._ctx = ctx;
        }
    }
    class ComponentContainer extends ContextContainer {
        constructor(struct, ctx){
            super(struct, ctx);
            parametersDefinition = ctx.__defineAttributes();
            render once the comp is created
                create virtualdom from htmlstruct
        }
    }
    class EvaluatorContainer extends EvaluatorContainer {
        constructor(struct, ctx){
            super(struct, ctx);
            this._evaluator = new Evaluator(this);
        }
    }
    class IfContainer extends EvaluatorContainer {
        constructor(struct, ctx, conditionScript){
            super(struct, ctx);
            this._condition = conditionScript; 
            this._last = null;
        }
        update(){
            const val = this._evaluator.eval(this._condition);
            if(val != this._last){
                this._last = val;
                if(val){
                    create virtualdom from htmlstruct
                }else{
                    this.removeChild();
                }
            }
        }
    }
    class ListIteratorContainer extends EvaluatorContainer {
        constructor(struct, ctx, listName){
            super(struct, ctx);
            this._listName = listName;
            this._lastList = [];
        }
        update(){
            let list = this._evaluator.eval(listName);
            make a diff between list and _lastList   
                if add, add to child in the same pos
                if removed remove the child from the same pos
                if is the same check the modifications but dont change the browser dom
            this._lastList = [].concat(list);
        }
    }

    class ElementContainer extends EvaluatorContainer {
        constructor(struct, ctx){
            super(struct, ctx);
            this._dynAtt = get form struct...
            this._e = dom.createElement ...
            trigger create element
            set defineAttributes
            intercept if atrivute was added
            hold de events
                trigger create event
                all the events will pass here
                after triggered: miminoInstance.update()
        }
        update(){
            update dynAtt
        }
        appendToDomElement(element){
            element.appendChild(this._e);
            this.forEachChild((c) => c.appendToDomElement(this._e));
        }
    insideComponent - set once
        true if it is a html comp type ou mbody and there is a parent comp
        if true then partOfComponet=false
        if false then partOfComponet = false or true
    partOfComponet - set once
        true if it is part of htmlstruct of a comp
        if true then insideComponent=false
        if false then insideComponent = false or true
    getComponent - set once - check just if insideComponent or partOfComponet
        finds in parent chain till find component
    getEvaluator - create just the first exec
        if insideComponent get the chain of component + minimo.
        if partOfComponet get just the parentcomponent.getLocalContext
        if not insideComponent and not partOfComponet get mimimo
    parent
    dynAttribs
        on update minimo
            getEvaluator().eval(script)
                if changed from last time e.setAttribute
    child
    remove
        remove itself and its child
        must call remove on child first
        trigger remove event
    }
}

const _findChildInStruct = (json, name, remove) => {
    const lcName = name.toLowerCase();
    for (let i = 0; json.c && i < json.c.length; i++) {
        const c = json.c[i];
        if (c.n && c.n.toLowerCase() == lcName) {
            if (remove) {
                json.c.splice(i, 1);
            }
            return c;
        }
    }
}
//set jquery to wait for document ready
const _checkHoldJQuery = () => {
    if ($ && $.holdReady) {
        $.holdReady(true);
    }
}
const _getAttributeFromStruct = (html, attname) => html.a ? html.a[attname] : null;
class HtmlBuilder {
    constructor(minimoInstance, dom, createComponentCtx) {
        this._m = minimoInstance;
        this._dom = dom;
        this._dynAttribs = {};
        this._iterators = {};
        this._mscripts = {}

        //set hidden attributes on element.
        this._setHiddenAttributesOnElement = (e, json) => {
            for (var k in (json.h || {})) {
                e[k] = json.h[k];
            }
        }
        const _isIterator = (html) => html.xv && html.xl;

        //set attributes from htmlStruct and register the dynamic ones
        this._setAttributesOnElement = (e, child) => {
            if (child.a) {
                const dynAttrs = {};
                for (var attName in child.a) {
                    let att = child.a[attName];
                    if (att instanceof Array) {
                        const id = util.generateId();
                        child._id = id;
                        this._dynAttribs[id] = {
                            e: e,
                            j: child,
                            n: attName,
                            a: att
                        }
                    } else {
                        if (attName == 'id' && att.length) {
                            att = att.replace('#modal:', `${minimoInstance.CTX}:`);
                        }
                        dom.setAttribute(e, attName, att);
                    }
                }
            }
        }
        this._createRequiredSources = (requiredSources, insertPoint) => new Promise((resolve, reject) => {
            const closure = (list) => {
                const item = util.first(list);
                if (item) {
                    var rq = _getAttributeFromStruct(item, 'src')[0].v;
                    if (rq[0] == '/') {
                        rq = rq.substring(1);
                    }
                    var ext = rq.substring(rq.length - 4).toLowerCase();
                    if (!M$.alreadyRequired(rq) && ext != '.css') {
                        let e;
                        if (ext == '.css') {
                            e = dom.createElement("link");
                            dom.setAttribute(e, "rel", "stylesheet", "type", "text/css", "href", "/res/" + rq);
                            e.onload = () => closure(util.tail(list));
                        } else {
                            //js
                            e = dom.createElement("script");
                            dom.setAttribute(e, "src", "/res/" + rq);
                            e.onload = () => {
                                _checkHoldJQuery();
                                closure(util.tail(list));
                            }
                        }
                        document.body.appendChild(e);
                    }
                } else {
                    resolve();
                }
            }
            closure(requiredSources);
        });
        this._createHTML = (htmlStruct, rootInsertPoint, defaultContext = minimoInstance) => new Promise((resolve, reject) => {
            const closure = (json, insertPoint, ctx) => {
                if (json.ci) { //component
                    json.ctx = createComponentCtx(json, ctx);
                } else {
                    json.ctx = ctx;
                }
                for (let i = 0; json.c && i < json.c.length; i++) {
                    var child = json.c[i];
                    child._p = json; //set parent
                    if (child.n == 'modal-info') {
                        //modals.setModalInfo(child);
                    } else if (child.t) {
                        //text
                        dom.createTextNode(insertPoint, child.t, json.n.toUpperCase() == 'SCRIPT')
                            .ifPresent(node => child._n = node);
                    } else if (child.x) {
                        //mscript
                        const t = dom.createTextNode(insertPoint, '', false).value;
                        const id = util.generateId();
                        this._mscripts[id] = child;
                        child._id = id;
                        child._n = t;
                    } else if (child.n == 'style') {
                        const e = dom.createElement("style");
                        dom.setAttribute(e, "scoped", true);
                        e.innerHTML = "@import url(/res/" + rq + ");";
                        insertPoint.appendChild(e);
                        child._n = e;
                    } else {
                        const isIterator = _isIterator(child);
                        if (child.ci) {
                            closure(child, insertPoint, json.ctx);
                        } else {
                            const e = isIterator ? document.createTextNode('') : dom.createElement(child.n);
                            this._setHiddenAttributesOnElement(e, child);
                            insertPoint.appendChild(e);
                            if (isIterator) {
                                child._n = e;
                                const id = util.generateId();
                                child._id = id;
                                this._iterators[id] = child;
                            } else {
                                this._setAttributesOnElement(e, child);
                                closure(child, e, json.ctx);
                            }
                        }

                    }
                }
            }
            closure(htmlStruct, rootInsertPoint, defaultContext);
            resolve();
        });
    }
    createElements(json, insertPoint) {
        var required = _findChildInStruct(json, 'xrs', true);
        var root = {
            ctx: json._m,
            c: [json]
        };
        return this._createRequiredSources(required, insertPoint)
            .then(this._createHTML(root, insertPoint))
            .then(() => new HtmlUpdater(this));
    }
}
class HtmlUpdater {
    constructor(htmlBuilder) {
        this._builder = htmlBuilder;
        this._getEvaluator = (value) => {
            if (!value._evaluator) {
                value._evaluator = [];
                let cVal = value.j || value;
                do {
                    if (cVal.ctx) {
                        value._evaluator.push(cVal.ctx);
                    }
                    cVal = cVal._p;
                } while (cVal);
            }
            return new Evaluator(value._evaluator);
        }
    }
    //update dynamic attributes
    updateAttributes() {
        if (!this._builder._m.isImport) {
            util.values(this._builder._dynAttribs).forEach(value => {
                const att = value.a;
                try {
                    const val = att.map(item => item.s ? this._getEvaluator(value).eval(item.s) : item).join('');
                    const attName = value.n;
                    const e = value.e;
                    if (attName == 'checked') {
                        e.checked = val.toUpperCase() == 'TRUE';
                    } else if (attName == 'disabled') {
                        e.disabled = val.toUpperCase() == 'TRUE';
                    } else {
                        this._builder._dom.setAttribute(e, attName, val);
                    }
                } catch (ex) {
                    console.error(`Error updating attribute ${value.n}.`, ex);
                }
            });
        }
    }
    updateMScripts() {
        if (!this._builder._m.isImport) {
            util.values(this._builder._mscripts).forEach(value => {
                try {
                    const evaluated = this._getEvaluator(value).eval(value.x);
                    value._n.nodeValue = evaluated;
                } catch (ex) {
                    console.error(`Error updating script expression ${value.x}.`, ex);
                }
            });
        }
    }
}

module.exports = {
    HtmlBuilder: HtmlBuilder,
    EvaluatorManager: EvaluatorManager
}