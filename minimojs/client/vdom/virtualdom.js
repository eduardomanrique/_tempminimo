const util = require('../util.js');
const EvaluatorManager = require('./evaluator');
const dom = require('../dom');
const ContextManager = require('./context-manager');
//const modals = require('./modal.js');

const VirtualDomManager = function (mimimoInstance, dom, buildComponentBuilderFunction) {
    const ctxManager = new ContextManager();
    const evaluatorManager = new EvaluatorManager(mimimoInstance, ctxManager);
    const componentBuilderFunction = buildComponentBuilderFunction(mimimoInstance);

    const _buildVirtualDom = (json, parentVDom) => {
        let vdom;
        if (json.cn) {
            vdom = new ComponentContainer(json);
        } else if (json.xc) {
            vdom = new IfContainer(json);
        } else if (json.xl) {
            vdom = new ListIteratorContainer(json);
        } else if (json.n) {
            vdom = new Element(json);
        } else if (json.x) {
            vdom = new DynText(json);
        } else {
            vdom = new Text(json);
        }
        vdom._postBuild();
        parentVDom.appendChild(vdom);
        return vdom
    }

    const _build = (json, parent) => {
        const vdom = _buildVirtualDom(json, parent);
        if (vdom.struct.c) {
            for (let i = 0; i < vdom.struct.c.length; i++) {
                _build(vdom.struct.c[i], vdom);
            }
        }
        return vdom;
    }

    this.build = (json, insertPoint) => {
        const topElement = new GenericBrowserElement();
        topElement.element = insertPoint;
        return new Promise(r => r(_build(json, topElement)));
    }


    class VirtualDom {
        constructor(htmlStruct, parent) {
            this._struct = htmlStruct;
            this._nodeList = [];
            this._childList = [];
        }
        set parent(p) {
            this._parent = p;
        }
        get parent() {
            return this._parent;
        }
        set ctx(c) {
            this._ctx = c;
        }
        get ctx() {
            return this._ctx;
        }
        get struct() {
            return this._struct;
        }
        get nodeList() {
            return this._nodeList;
        }
        get childList() {
            return this._childList;
        }
        get firstNode() {
            this.nodeList[0];
        }
        get lastNode() {
            this.nodeList[this.nodeList.length - 1];
        }
        get nodeListAsDom() {
            return util.flatten(this.nodeList.map(n => {
                if (n instanceof VirtualDom) {
                    return n.nodeListAsDom;
                } else {
                    return n;
                }
            }));
        }
        eval(s) {
            return this.ctx.eval(s);
        }
        removeChild(c) {
            const indNode = this.nodeList.indexOf(c);
            const indChild = this.childList.indexOf(c);
            if (indNode >= 0) {
                this.nodeList.splice(indNode, 1);
                this.childList.splice(indChild, 1);
                c._onRemove();
            }
        }
        appendChild(c) {
            this.insertBefore(c, null);
        }
        insertBefore(child, vdom) {
            const indNode = this.nodeList.indexOf(vdom);
            const indChild = this.childList.indexOf(vdom);
            if (indNode >= 0) {
                this.nodeList.splice(indNode, 0, child);
                this.childList.splice(indChild, 0, vdom);
            } else {
                this.nodeList.push(vdom);
                this.childList.push(vdom);
            }
            child.parent = this;
            this._insertBefore(child, vdom);
        }
        updateDom() {}
        _onRemove() {}
        _insertBefore(child, vdom) {}
    }
    class BrowserElement extends VirtualDom {
        _postBuild() {
            this._e = this._createBrowserElement();
            this.nodeList.push(this._e);
        }
        _insertBefore(child, vdom) {
            const before = vdom ? vdom.first : null;
            const nodeList = child.nodeListAsDom;
            for (let i = 0; i < nodeList.length; i++) {
                this._e.appendChild(nodeList[i]);
            }
        }
        _onRemove() {
            this._e.remove();
        }
        _createBrowserElement() {}
    }
    class GenericBrowserElement extends BrowserElement {
        _createBrowserElement() {
            return this.element;
        }
        set element(e) {
            this._e = e;
        }
        get element() {
            return this._e;
        }
    }
    class Element extends BrowserElement {
        _createBrowserElement() {
            this.ctx = evaluatorManager.build(this);
            let e = dom.createElement(this.struct.n);
            this._dynAtt = {};
            for (let k in this.struct.a) {
                let a = this.struct.a[k];
                if (a instanceof Array) {
                    this._dynAtt[k] = a;
                } else {
                    dom.setAttribute(e, k, a);
                }
            }
            return e;
        }
        updateDom() {
            for (let k in this._dynAtt) {
                const values = this._dynAtt[k];
                const buffer = [];
                for (let i = 0; i < values.length; i++) {
                    if (typeof (values[i]) == "string") {
                        buffer.push(this.eval(values[i]));
                    } else {
                        buffer.push(values[i]);
                    }
                }
                dom.setAttribute(this._e, k, buffer.join(''));
            }
        }
    }
    class Text extends BrowserElement {
        _createBrowserElement() {
            return createTextNode(this.struct);
        }
    }
    class DynText extends Text {
        updateDom() {
            this.ctx = evaluatorManager.build(this);
            this._e.nodeValue = this.eval(this.struct);
        }
    }
    class Container extends VirtualDom {
        _postBuild() {
            this._startNode = dom.createTextNode("");
            this.nodeList.push(this._startNode);
            this._endNode = dom.createTextNode("");
            this.nodeList.push(this._endNode);
            _postBuildContainer();
        }
        _onRemove() {
            var nodeList = this.nodeListAsDom;
            for (var i = 0; i < nodeList.length; i++) {
                const n = nodeList[i];
                n.remove();
            }
        }
        updateDom() {
            this.nodeList
                .filter(e => e instanceof VirtualDom)
                .forEach(e => e.updateDom());
        }
        _insertBefore(child, vdom) {
            this.parent._insertBefore(child, vdom);
        }
        _postBuildContainer() {}
    }
    class ComponentContainer extends Container {
        _postBuildContainer() {
            this._componentName = this.struct.cn;
            this._instanceProperties = this.struct.ip;
            this._componentContext = componentBuilderFunction(this._componentName, this._instanceProperties);
            this.ctx = evaluatorManager.buildWith(this, this._componentContext);
            this._parametersDefinition = this._componentContext.__defineAttributes();
        }
    }
    class IfContainer extends Container {
        _postBuildContainer() {
            this.ctx = evaluatorManager.build(this);
            this._condition = this.struct.xc;
            this._last = null;
        }
        updateDom() {
            const val = this.eval(this._condition);
            if (val != this._last) {
                this._last = val;
                if (val) {
                    _buildChildren(this, this.struct);
                } else {
                    this.removeChild();
                }
            }
        }
    }
    class ListIteratorContainer extends Container {
        _postBuildContainer() {
            this._listName = this.struct.xl;
            this._lastList = [];
        }
        updateDom() {
            let list = this.eval(this._listName);
            //remove from html the removed
            const currList = [];
            for (let i = 0; i < this._lastList.length; i++) {
                let item = this._lastList[i];
                const pos = list.indexOf(item);
                if (pos < 0) {
                    this.removeChild(this.childList[i]);
                } else {
                    currList.push(item);
                }
            }
            for (let i = 0; i < list.length; i++) {
                let item = list[i];
                const pos = currList.indexOf(item);
                let child;
                if (pos >= 0 && pos != i) {
                    child = this.childList[pos];
                    this.removeChild(child);
                    const afterVDom = i >= this.childList.length ? null : this.childList[i];
                    this.insertBefore(child, afterVDom);
                    currList.splice(pos, 1);
                    currList.splice(pos, 0, item);
                } else if (pos < 0) {
                    child = new ItemIteratorContainer(this.struct, this);
                    child.item = item;
                }
                child.index = i;
                this._lastList = [].concat(list);
            }
        }
    }
    class ItemIteratorContainer extends Container {
        _postBuildContainer() {
            this._itemVarName = this.struct.xv;
            this._indexVarName = this.struct.xi;
            this._iteratorContext = eval(`new function(){
                var ${this._itemName};
                var ${this._indexName};
                this.eval = function(x){
                    return eval(s);
                }
                this.__set_item = function(i){
                    ${this._itemName} = i;
                }
                this.__set_index = function(i){
                    ${this._indexName} = i;
                }
            }`);
            this.ctx = evaluatorManager.buildWith(this, this._iteratorContext);
        }
        set item(i) {
            this._iteratorContext.__set_item(i);
        }
        set index(i) {
            this._iteratorContext.__set_index(i);
        }
    }
}

module.exports = {
    VirtualDomManager: VirtualDomManager
}