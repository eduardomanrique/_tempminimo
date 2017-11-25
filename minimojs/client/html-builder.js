


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