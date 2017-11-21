
const util = require('./util.js');
const Evaluator = require('./evaluator.js').Evaluator;
const buildComponentBuilderFunction = require('.components.js').buildComponentBuilderFunction;
//const modals = require('./modal.js');

const VirtualDomManager = function (mimimoInstance) {
        const _dom = new dom.Dom(mimimoInstance);
        const evaluatorManager = new EvaluatorManager();
        const ctxManager = new ContextManager();
        const componentBuilderFunction = buildComponentBuilderFunction(mimimoInstance);

        const _buildVirtualDom = (json, ctx) => {
            if (json.cn) {
                return new ComponentContainer(json);
            } else if (json.xc) {
                return new IfContainer(json, ctx);
            } else if (json.xl) {
                return new ListIteratorContainer(json, ctx);
            } else if (json.n) {
                return new Element(json, ctx);
            } else if (json.x) {
                return new DynText(json, ctx);
            } else {
                return new Text(json);
            }
        };
        class VirtualDom {
            constructor(htmlStruct, parentCtx) {
                this._htmlStruct = htmlStruct;
                this._children = [];
                this._ctx = parentCtx;
                _onConstruct();
                for (let i = 0; i < htmlStruct.c.length; i++) {
                    let c = htmlStruct.c[i];
                    this.appendChild(_buildVirtualDom(c, this.ctx));
                }
            }
            get ctx() {
                return this._ctx;
            }
            update() {
                this._updateDom();
                this.forEachChild(c => c.update());
            }
            remove() {
                this._parent._removeChild(this);
                this._removeItselfDom();
            }
            _removeChild(c) {
                this._children.splice(this._children.indexOf(c), 1);
            }
            removeChild(c) {
                c.remove();
            }
            removeAllChildren() {
                this.forEachChild(c => c.remove());
            }
            appendChild(c) {
                this._children.push(c);
                c.parent = this;
                this._appendDom(c);
            }
            forEachChild(fn) {
                this._children.forEach(fn);
            }
            _onConstruct() {}
            _removeItselfDom() {}
            _updateDom() {}
            _appendDom(c) {}
            _getDomElements() {}
        }

        class BrowserElement extends VirtualDom {
            _getDomElements() {
                return [this._e];
            }
        }
        class Element extends BrowserElement {
            _onConstruct() {
                let e = dom.createElement(h.n);
                this._e = e;
                this._dynAtt = {};
                for (let k in h.a) {
                    let a = h.a[k];
                    if (a instanceof Array) {
                        this._dynAtt[k] = a;
                    } else {
                        dom.setAttribute(e, k, a);
                    }
                }

            }
            _appendDom(c) {
                this._e.appendChild(c);
            }
            _updateDom() {
                for (let k in this._dynAtt) {
                    const values = this._dynAtt[k];
                    const buffer = [];
                    for (let i = 0; i < values.length; i++) {
                        if (typeof (values[i]) == "string") {
                            buffer.push(this.ctx.eval(values[i]));
                        } else {
                            buffer.push(values[i]);
                        }
                    }
                    dom.setAttribute(this._e, k, buffer.join(''));
                }
            }
        }
        class Text extends BrowserElement {
            _onConstruct() {
                this._e = createTextNode(this._htmlStruct);
            }
        }
        class DynText extends Text {
            _updateDom() {
                this._e.nodeValue = this.ctx.eval(this._htmlStruct);
            }
        }
        class Container extends VirtualDom {
            _getDomElements() {
                return util.flatten(this._children.map(c => c._getDomElements()));
            }
            _removeItselfDom() {
                this.forEachChild(c => c._removeItselfDom(c));
            }
            _appendDom(c) {
                this.parent._appendDom(c);
            }
        }
        class ComponentContainer extends VirtualDom {
            constructor(struct) {
                super(struct, componentBuilderFunction(struct.cn, struct.ip));
                this._componentName = struct.cn;
                this._instanceProperties = struct.ip;
                this._parametersDefinition = this._ctx.__defineAttributes();
                this._evaluator = evaluatorManager.build(this);
            }
            get ctx(){
                return this._evaluator;
            }
        }
        class IfContainer extends VirtualDom {
            _onConstruct() {
                this._condition = struct.xc;
                this._last = null;
            }
            _updateDom() {
                const val = this.ctx.eval(this._condition);
                if (val != this._last) {
                    this._last = val;
                    if (val) {
                        buildChildren(this, this.ctx);
                    } else {
                        this.removeChild();
                    }
                }
            }
            _removeItselfDom() {}
            _updateDom() {}
            _appendDom(c) {}
        }
        class ListIteratorContainer extends EvaluatorContainer {
            _onConstruct() {
                super(struct, ctx);
                this._listName = struct.xl;
                this._lastList = [];
                this._groups = [];
            }
            update() {
                let list = this._evaluator.eval(listName);
                //remove from html the removed
                const newPos = [];
                for (let i = 0; i < this._lastList.length; i++) {
                    let item = this._lastList[i];
                    const pos = list.indexOf(item);
                    if (pos < 0) {
                        this._groups[i].forEach(e => e.remove());
                    } else {
                        newPos[i] = pos;
                    }
                }

                for (let i = 0; i < list.length; i++) {
                    let item = list[i];
                    const pos = this._lastList.indexOf(item);
                    if (pos < 0) {
                        create elementos com ctx
                        add na pos
                    }
                    if (pos != i) {
                        mover elementos para a pos
                    }

                    setUpFromEvaluator
                    make a diff between list and _lastList
                    if add, add to child in the same pos
                    if removed remove the child from the same pos
                    if is the same check the modifications but dont change the browser dom
                    this._lastList = [].concat(list);
                }
            }


        }



        const buildChildren = (container, ctx) => container._htmlStruct.c
            .map(child => buildContainer(child, ctx))
            .forEach(child => container.addChild(child));




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