const util = require('../util.js');
const EvaluatorManager = require('./evaluator');
const Objects = require('../objects');
const inputs = require('./inputs');
const events = require('../minimo-events');
const createModal = require('../modals').createModal;
const ContextManager = require('./context-manager');
const buildComponentBuilder = require('../components').buildComponentBuilderFunction;

const VirtualDom = function (structArray, insertPoint, anchorStart, anchorEnd, minimoInstance, waitForScriptsToLoad = true, buildComponentBuilderFunction = buildComponentBuilder) {
    const dom = minimoInstance._dom;
    const selfVDom = this;
    const ctxManager = new ContextManager();
    const evaluatorManager = new EvaluatorManager(minimoInstance, ctxManager);
    const componentBuilderFunction = buildComponentBuilderFunction(minimoInstance);
    this._defaultUpdateDelay = 100;
    const _radioGroups = {};

    const _setRadioGroup = (e) => {
        _radioGroups[e._bind] = _radioGroups[e._bind] || new function () {
            const elements = new Set();
            this.add = (e) => {
                elements.add(e);
                e._radioGroup = this;
            }
            this.remove = (e) => {
                element.delete(e);
                delete e._radioGroup;
            }
            this.getValue = () => {
                const checked = Array.from(elements).filter(e => e._e.checked)[0];
                return checked ? (checked._getValue ? checked._getValue() : checked._e.value) : null;
            }
        };
        _radioGroups[e._bind].add(e);
    }
    const _buildVirtualDom = (json, parentVDom) => {
        let vdom;
        if (json.cn) {
            vdom = new ComponentContainer(json);
        } else if (json.xc) {
            vdom = new IfContainer(json);
        } else if (json.xl) {
            vdom = new ListIteratorContainer(json);
        } else if (json.n) {
            if (json.n == 'script' && json.a && json.a.src) {
                return null;
            }
            if (json.n == 'modal') {
                vdom = new ModalElement(json);
            } else if (json.n == 'modalcontent') {
                vdom = new ModalContent(json);
            } else if (json.n == 'a') {
                vdom = new Link(json);
            } else {
                vdom = new Element(json);
            }
        } else if (json.x) {
            vdom = new DynContent(json);
        } else {
            vdom = new Text(json);
        }
        _postCreation(vdom, parentVDom);
        return vdom
    }

    const _postCreation = (vdom, parentVDom) => {
        vdom._parent = parentVDom;
        vdom._onBuild();
        parentVDom.appendChild(vdom);
        vdom._postBuild();
    }

    const _getAllScripts = (json, array) => {
        if (json && json.n == 'script' && (json.a || {}).src) {
            array.push(json);
        } else if (json && json.c) {
            json.c.forEach(child => {
                _getAllScripts(child, array);
            });
        }
    }
    let _hidden = false;
    let updatePromise;
    this.update = (delay) => {
        if (updatePromise) {
            return updatePromise;
        } else {
            updatePromise = new Promise((resolve, reject) => {
                if (_hidden) {
                    updatePromise = null;
                    resolve();
                } else {
                    setTimeout(() => {
                        try {
                            rootVDom.update();
                        } catch (e) {
                            console.error('Error updating dom ' + e.message);
                        }
                        updatePromise = null;
                        resolve();
                    }, delay || this._defaultUpdateDelay);
                }
            });
            return updatePromise;
        }
    }

    this.build = () => {
        const scriptsArray = [];
        structArray.forEach(json => _getAllScripts(json, scriptsArray));

        return new Promise((resolve, reject) => {
            let index = 0;
            const _loadNextScript = () => {
                if (index >= scriptsArray.length) {
                    resolve();
                    return;
                }
                let scriptJson = scriptsArray[index++];
                if (waitForScriptsToLoad) {
                    let element;
                    if (scriptJson.a.src.endsWith('.css')) {
                        element = document.createElement('link');
                        element.setAttribute("rel", "stylesheet");
                        element.setAttribute("media", "all");
                        element.setAttribute("href", scriptJson.a.src);
                    } else {
                        element = document.createElement('script');
                        element.setAttribute("src", scriptJson.a.src);
                    }
                    element.onload = function () {
                        _loadNextScript();
                    };
                    document.body.appendChild(element);
                } else {
                    _loadNextScript();
                }
            }
            _loadNextScript();
        }).then(() => {
            structArray.forEach(json => _buildVirtualDom(json, rootVDom));
        });
    }


    class VirtualDomElement {
        constructor(htmlStruct) {
            this._struct = htmlStruct;
            this._childList = [];
        }
        set ctx(c) {
            this._ctx = c;
        }
        _getCtx() {
            if (!this._ctx && this._parent) {
                return this._parent._getCtx();
            }
            return this._ctx;
        }
        get ctx() {
            return this._getCtx() || minimoInstance;
        }
        get isComponentInternal() {
            return (this._struct.h || {}).componentInternal == true;
        }
        _buildChildren() {
            if (this._struct.c) {
                for (let i = 0; i < this._struct.c.length; i++) {
                    _buildVirtualDom(this._struct.c[i], this);
                }
            }
        }
        eval(s) {
            return this.ctx.eval(s);
        }
        unsafeEval(s) {
            return this.ctx.unsafeEval(s);
        }
        removeChild(c) {
            const indChild = this._childList.indexOf(c);
            if (indChild >= 0) {
                this._childList.splice(indChild, 1);
                c._onRemove();
            }
        }
        removeChildren() {
            while (this._childList.length > 0) {
                this.removeChild(this._childList[0]);
            }
        }
        appendChild(child) {
            this.insertBefore(child, null);
        }
        insertBefore(child, vdom) {
            let nodeList = child.getNodeList();
            if (this._childList.length == 0) {
                this._childList.push(child);
                this._addFirst(nodeList);
            } else if (vdom) {
                const ind = this._childList.indexOf(vdom);
                this._childList[ind]._addBefore(nodeList);
                this._childList.splice(ind, 0, child);
            } else {
                this._childList[this._childList.length - 1]._addAfter(nodeList);
                this._childList.push(child);
            }
        }
        update() {
            this._updateDom();
            for (let i = 0; i < this._childList.length; i++) {
                this._childList[i].update();
            }
        }
        _updateDom() {}
        _onRemove() {}
        _postBuild() {}
    }
    class BrowserElement extends VirtualDomElement {
        _onBuild() {
            this._onCreateBrowserElement();
            this._e.be = this._struct.n;
            this._e._vdom = this;
            this._e.onload = this._onload;
            this._e.onerror = this._onload;
        }
        getNodeList() {
            return [this._e];
        }
        _addBefore(nodeList) {
            nodeList.forEach(n => this._e.parentNode.insertBefore(n, this._e));
        }
        _addAfter(nodeList) {
            let beforeNode = this._e.nextSibling;
            nodeList.forEach(n => this._e.parentNode.insertBefore(n, beforeNode));
        }
        _addFirst(nodeList) {
            nodeList.forEach(n => this._e.appendChild(n));
        }
        _onRemove() {
            if (this._radioGroup) {
                this._radioGroup.remove(this);
            }
            this.removeChildren();
            this._e.remove();
        }
        _setAttribute(n, v) {
            if (n.startsWith('on')) {
                this._addedEventListeners = this._addedEventListeners || [];
                let propertyName = `_eventListener_${n}`;
                if (!v || !v.trim()) {
                    this[propertyName] = () => {};
                } else {
                    if (this._addedEventListeners.indexOf(n) < 0) {
                        this._addedEventListeners.push(n);
                        this._e.addEventListener(n.substring(2), (e) => {
                            minimoInstance.currentEvent = e;
                            this[propertyName]();
                        });
                    }
                    this[propertyName] = () => Promise.all([this.ctx.eval(v)]).then(() => _updateAll(1));
                }
            } else {
                dom.setAttribute(this._e, n, v);
            }
        }
        _onCreateBrowserElement() {}
    }
    class Element extends BrowserElement {
        _onCreateBrowserElement() {
            this.ctx = evaluatorManager.build(this);
            this._e = dom.createElement(this._struct.n);
            this._e._vdom = this;
            this._dom = dom;
            this._dynAtt = {};
            let skipValue = false;
            if (this._struct.a && this._struct.a.value && this._struct.a.value instanceof Array) { //read only value
                if (this._struct.a.value.length > 1) {
                    throw new Error('Element value can have only one script block');
                }
                this._setAttribute("value", this._struct.a.value[0].s);
                this._setAttribute("bind-type", inputs.types.OBJECT);
                skipValue = true;
            }
            for (let k in this._struct.a) {
                if (k == 'value' && skipValue) {
                    continue;
                }
                let a = this._struct.a[k];
                if (k == 'bind' || k == 'data-bind') {
                    let val = a;
                    if (val instanceof Array) {
                        val = val.map(v => util.safeToString(v)).join('');
                    }
                    this._bind = val;
                    const type = (this._struct.a.type || "").toLowerCase();
                    
                    const _getValue = () => this._getValueFromElement();
                    this._objects = new Objects(val, this.ctx, _getValue);
                    if (type == 'radio') {
                        _setRadioGroup(this);
                        this._getValueFromElement = () => this._radioGroup.getValue();
                    } else {
                        if (type == "checkbox") {
                            if (this._e.getAttribute("value")) {
                                this._objects.useArray(() => this._getNonNullValue());
                            }
                            minimoInstance.root.ready(() => {
                                if (this.ctx.unsafeEval(this._bind) == null) {
                                    this._objects.updateVariable();
                                    _updateAll(global._updateDelay || 100);
                                }
                            });
                        }
                        const valuePropName = type == "checkbox" || type == "radio" ? "checked" : "value";
                        this._getValueFromElement = () => this._getValue ? this._getValue() : this._e[valuePropName];
                    }
                    
                    const onChange = () => {
                        this._objects.updateVariable();
                        _updateAll(global._updateDelay || 50);
                    }
                    this._e.addEventListener('change', onChange);
                    if (this._e.nodeName != 'SELECT') {
                        this._e.addEventListener('keyup', onChange);
                        this._e.addEventListener('click', onChange);
                        this._e.addEventListener('focus', () => this._focused = true);
                        this._e.addEventListener('blur', () => this._focused = false);
                    }
                } else if (a instanceof Array) {
                    this._dynAtt[k] = a;
                } else {
                    this._setAttribute(k, a);
                }
            }
            if (this._objects) {
                inputs.prepareInputElement(this);
                this._objects.getOrCreateVariable();
            }
        }
        _updateValue() {
            if (!this._focused && this._bind) {
                this._setValue(this._ctx.unsafeEval(this._bind));
            }
        }
        _postBuild() {
            this._buildChildren();
        }
        _updateDom() {
            this._updateValue();
            for (let k in this._dynAtt) {
                const values = this._dynAtt[k];
                const buffer = [];
                for (let i = 0; i < values.length; i++) {
                    if (values[i].s) {
                        buffer.push(this.eval(values[i].s));
                    } else {
                        buffer.push(util.safeToString(values[i]));
                    }
                }
                this._setAttribute(k, buffer.join(''));
            }
        }
    }
    class Link extends Element {
        _setAttribute(n, v) {
            if (n == 'href' && v.indexOf('javascript:') == 0) {
                this._e.href = 'javascript:;';
                super._setAttribute('onclick', v.substring('javascript:'.length));
            } else {
                super._setAttribute(n, v);
            }
        }

    }
    class Text extends BrowserElement {
        _onCreateBrowserElement() {
            this._e = dom.createTextNode(typeof (this._struct) == 'string' ? this._struct : this._struct.t);
        }
    }
    class Container extends VirtualDomElement {
        _onBuild() {
            this._startNode = dom.createTextNode("");
            let className = this.constructor.name;
            this._endNode = dom.createTextNode("");
            this._startNode.sn = true;
            this._startNode._cid = parseInt(Math.random() * 99) + '_' + className;
            this._endNode.en = true;
            this._endNode._cid = this._startNode._cid;
            this._onBuildContainer();
        }
        _onRemove() {
            this.removeChildren();
            this._startNode.remove();
            this._endNode.remove();
        }
        getNodeList() {
            return [this._startNode, this._endNode];
        }
        _addBefore(nodeList) {
            nodeList.forEach(n => this._startNode.parentNode.insertBefore(n, this._startNode));
        }
        _addAfter(nodeList) {
            let beforeNode = this._endNode.nextSibling;
            nodeList.forEach(n => this._endNode.parentNode.insertBefore(n, beforeNode));
        }
        _addFirst(nodeList) {
            nodeList.forEach(n => this._startNode.parentNode.insertBefore(n, this._endNode));
        }
        _onBuildContainer() {}
    }

    class DynContent extends Container {
        _onBuildContainer() {
            this.ctx = evaluatorManager.build(this);
        }
        update() {
            try {
                const val = this.unsafeEval(this._struct.x);
                if (this._isHtmlContent || (val && val.__htmlContent)) {
                    if (!this._isHtmlContent) {
                        this._isHtmlContent = true;
                        for (let i = 0; i < val.value.length; i++) {
                            _buildVirtualDom(val.value[i], this);
                        }
                    }
                    for (let i = 0; i < this._childList.length; i++) {
                        this._childList[i].update();
                    }
                } else {
                    if (this._childList.length == 0) {
                        _buildVirtualDom("", this);
                    }
                    this._childList[0]._e.nodeValue = val;
                }
            } catch (e) {
                console.error(e);
            }
        }
    }
    class ComponentContainer extends Container {
        _onBuildContainer() {
            this._componentName = this._struct.cn;
            this._instanceProperties = this._struct.ip;
            this._internalContext = componentBuilderFunction(this._componentName, this._instanceProperties);
            this.ctx = evaluatorManager.build(this);
            this._componenCtx = evaluatorManager.buildWith(this, this._internalContext);
            this._parametersDefinition = this._internalContext.__defineAttributes();
            this._componenCtx._aliases = this._internalContext._aliases;
        }
        _postBuild() {
            this._buildChildren();
        }
    }

    class ModalElement extends BrowserElement {
        _onCreateBrowserElement() {
            this._e = dom.createElement('div');
            this._buildChildren();
        }
        _updateDom() {}
    }
    class ModalContent extends Container {
        _onBuildContainer() {
            const getModalElement = (e) => e._parent instanceof ModalElement ? e._parent : getModalElement(e._parent);
            this._modalElement = getModalElement(this);
            const path = this._modalElement._struct.a.path;
            const bindTo = this._modalElement._struct.a.bindto;
            this._modalObj = createModal(path, m, this._startNode, this._endNode);
            if (bindTo) {
                this._modalElement._parent.ctx.evalSet(bindTo, this._modalObj);
            }
            if ((this._modalElement._struct.a.visible || '').toLowerCase() == 'true') {
                minimoInstance.addToBinds(this._modalObj.show());
            }
        }
        _updateDom() {
            this._modalObj.update();
        }
    }
    class ScriptContainer extends Container {}
    class IfContainer extends ScriptContainer {
        _onBuildContainer() {
            this.ctx = evaluatorManager.build(this);
            this._condition = this._struct.xc;
            this._last = null;
        }
        _updateDom() {
            try {
                const val = this.eval(this._condition);
                if (val != this._last) {
                    this._last = val;
                    if (val) {
                        this._buildChildren();
                    } else {
                        this.removeChildren();
                    }
                }
            } catch (e) {
                console.error(e)
            }
        }
    }
    class ListIteratorContainer extends ScriptContainer {
        _onBuildContainer() {
            this._listName = this._struct.xl;
            this._lastList = [];
        }
        update() {
            let list = this.unsafeEval(this._listName) || [];
            //remove from html the removed
            const currList = [];
            const toRemove = [];
            const listCopy = [].concat(list);
            for (let i = 0; i < this._lastList.length; i++) {
                let item = this._lastList[i];
                const pos = typeof (item) == "object" ? listCopy.indexOf(item) : typeof (item) == typeof (listCopy[i]) ? i : -1;
                if (pos < 0) {
                    toRemove.push(this._childList[i]);
                } else {
                    listCopy[pos] = NaN;
                    currList.push(item);
                }
            }
            toRemove.forEach(c => this.removeChild(c));
            for (let i = 0; i < list.length; i++) {
                let item = list[i];
                const pos = typeof (item) == "object" ? currList.indexOf(item) : typeof (item) == typeof (currList[i]) ? i : -1;
                let child;
                if (pos < 0) {
                    child = new ItemIteratorContainer(this._struct);
                    child._parent = this;
                    child._onBuild();
                    this.insertBefore(child, i == this._childList.length ? null : this._childList[i]);
                    child._postBuild();
                } else {
                    currList[pos] = NaN;
                    child = this._childList[i];
                    if (pos >= 0 && pos != i) {
                        this._childList.splice(i, 1);
                        const afterVDom = i >= this._childList.length ? null : this._childList[i];
                        this.insertBefore(child, afterVDom);
                        currList.splice(pos, 1);
                        currList.splice(pos, 0, item);
                    }
                }
                child.item = item;
                child.index = i;
                child.update();
            }
            this._lastList = [].concat(list);
        }
    }
    class ItemIteratorContainer extends Container {
        _onBuildContainer() {
            this._itemVarName = this._struct.xv;
            this._indexVarName = this._struct.xi;
            this._iteratorContext = eval(`new function(){
                var ${this._itemVarName};
                var ${this._indexVarName};
                this.eval = function(s){
                    return eval(s);
                }
                this.__set_item = function(__m_param__){
                    ${this._itemVarName} = __m_param__;
                }
                this.__set_index = function(__m_param__){
                    ${this._indexVarName} = __m_param__;
                }
            }`);
            this.ctx = evaluatorManager.buildWith(this, this._iteratorContext);
        }
        _postBuild() {
            this._buildChildren();
        }
        set item(i) {
            this._item = i;
            this._iteratorContext.__set_item(i);
        }
        set index(i) {
            this._index = i;
            this._iteratorContext.__set_index(i);
        }
    }
    if (!anchorStart) {
        anchorStart = dom.createTextNode("");
        insertPoint.appendChild(anchorStart);
        anchorEnd = dom.createTextNode("");
        insertPoint.appendChild(anchorEnd);
    }

    const rootVDom = new BrowserElement({});

    this.hide = () => {
        _hidden = true;
        this.remove();
    }
    let _removed;
    this.remove = () => {
        _removed = [];
        let node = anchorStart.nextSibling;
        while (node != anchorEnd) {
            _removed.push(node);
            node.remove();
            node = anchorStart.nextSibling;
        }
    }
    this.show = () => {
        if (_hidden) {
            _hidden = false;
            _removed.forEach(node => insertPoint.insertBefore(node, anchorEnd));
            _removed = [];
            this.update();
        }
    }
    rootVDom._addFirst = (nodeList) => nodeList.forEach(n => {
        insertPoint.insertBefore(n, anchorEnd);
    });
    rootVDom._e = insertPoint;
}

module.exports = {
    VirtualDom: VirtualDom
}