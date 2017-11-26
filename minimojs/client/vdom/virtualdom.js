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
        _postCreation(vdom, parentVDom);
        return vdom
    }

    const _postCreation = (vdom, parentVDom) => {
        vdom._parent = parentVDom;
        vdom._onBuild();
        parentVDom.appendChild(vdom);
        vdom._postBuild();
    }

    this.build = (json, insertPoint) => {
        const topElement = new GenericBrowserElement();
        topElement.element = insertPoint;
        return new Promise(r => r(_buildVirtualDom(json, topElement)));
    }


    class VirtualDom {
        constructor(htmlStruct) {
            this._struct = htmlStruct;
            this._nodeList = [];
            this._childList = [];
        }
        set ctx(c) {
            this._ctx = c;
        }
        get ctx() {
            if (!this._ctx && this._parent) {
                return this._parent.ctx;
            }
            return this._ctx;
        }
        get nodeListAsDom() {
            return util.flatten(this._nodeList.map(n => {
                if (n instanceof VirtualDom) {
                    return n.nodeListAsDom;
                } else {
                    return n;
                }
            }));
        }
        _buildChild() {
            if (this._struct.c) {
                for (let i = 0; i < this._struct.c.length; i++) {
                    _buildVirtualDom(this._struct.c[i], this);
                }
            }
        }
        eval(s) {
            return this.ctx.eval(s);
        }
        removeChild(c) {
            const indNode = this._nodeList.indexOf(c);
            const indChild = this._childList.indexOf(c);
            if (indNode >= 0) {
                this._nodeList.splice(indNode, 1);
                this._childList.splice(indChild, 1);
                c._onRemove();
            }
        }
        removeChildren() {
            for (let i = 0; i < this._childList.length; i++) {
                this.removeChild(this._childList[i]);
            }
        }
        appendChild(c) {
            this.insertBefore(c, null);
        }
        insertBefore(child, vdom) {
            let indNode = -1;
            let indChild = -1;
            if (vdom) {
                indNode = this._nodeList.indexOf(vdom);
                indChild = this._childList.indexOf(vdom);
            }
            if (indNode >= 0) {
                this._nodeList.splice(indNode, 0, child);
                this._childList.splice(indChild, 0, child);
            } else {
                this._nodeList.push(child);
                this._childList.push(child);
            }
            child._parent = this;
            this._insertBefore(child, vdom);
        }
        update() {
            this._updateDom();
            for (let i = 0; i < this._childList.length; i++) {
                this._childList[i].update();
            }
        }
        get lastNode() {}
        _updateDom() {}
        _onRemove() {}
        _insertBefore(child, vdom) {}
        _postBuild() {}
    }
    class BrowserElement extends VirtualDom {
        _onBuild() {
            this._e = this._createBrowserElement();
            this._nodeList.push(this._e);
        }
        _insertBefore(child, vdom) {
            const before = vdom ? vdom._nodeList[0] : null;
            const nodeList = child.nodeListAsDom;
            for (let i = 0; i < nodeList.length; i++) {
                this._e.insertBefore(nodeList[i], before);
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
            let e = dom.createElement(this._struct.n);
            this._dynAtt = {};
            for (let k in this._struct.a) {
                let a = this._struct.a[k];
                if (a instanceof Array) {
                    this._dynAtt[k] = a;
                } else {
                    dom.setAttribute(e, k, a);
                }
            }
            return e;
        }
        _postBuild() {
            this._buildChild();
        }
        _updateDom() {
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
                dom.setAttribute(this._e, k, buffer.join(''));
            }
        }
    }
    class Text extends BrowserElement {
        _createBrowserElement() {
            return dom.createTextNode(typeof (this._struct) == 'string' ? this._struct : this._struct.t);
        }
    }
    class DynText extends BrowserElement {
        _createBrowserElement() {
            this.ctx = evaluatorManager.build(this);
            return dom.createTextNode('');
        }
        update() {
            this._e.nodeValue = this.eval(this._struct.x);
        }
    }
    class Container extends VirtualDom {
        _onBuild() {
            this._startNode = dom.createTextNode("");
            this._nodeList.push(this._startNode);
            this._endNode = dom.createTextNode("");
            this._nodeList.push(this._endNode);
            this._onBuildContainer();
        }
        get lastNode() {
            return this._endNode;
        }
        _onRemove() {
            var nodeList = this.nodeListAsDom;
            for (var i = 0; i < nodeList.length; i++) {
                const n = nodeList[i];
                n.remove();
            }
        }
        _insertBefore(child, vdom) {
            if (!vdom) {
                const ind = this._parent._childList.indexOf(this);
                if (ind < this._parent._childList.length - 1) {
                    vdom = this._parent._childList[ind + 1];
                }
            }
            this._parent._insertBefore(child, vdom);
        }
        _onBuildContainer() {}
    }
    class ComponentContainer extends Container {
        _onBuildContainer() {
            this._componentName = this._struct.cn;
            this._instanceProperties = this._struct.ip;
            this._componentContext = componentBuilderFunction(this._componentName, this._instanceProperties);
            this.ctx = evaluatorManager.buildWith(this, this._componentContext);
            this._parametersDefinition = this._componentContext.__defineAttributes();
        }
        _postBuild() {
            this._buildChild();
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
                        this._buildChild();
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
            let list = this.eval(this._listName);
            //remove from html the removed
            const currList = [];
            for (let i = 0; i < this._lastList.length; i++) {
                let item = this._lastList[i];
                const pos = list.indexOf(item);
                if (pos < 0) {
                    this.removeChild(this._childList[i]);
                } else {
                    currList.push(item);
                }
            }
            for (let i = 0; i < list.length; i++) {
                let item = list[i];
                const pos = currList.indexOf(item);
                let child;
                if (pos < 0) {
                    child = new ItemIteratorContainer(this._struct);
                    child._parent = this;
                    child._onBuild();
                    this.insertBefore(child, i == this._childList.length ? null : this._childList[i]);
                    child._postBuild();
                    child.item = item;
                } else {
                    child = this._childList[i];
                    if (pos >= 0 && pos != i) {
                        this.removeChild(child);
                        const afterVDom = i >= this._childList.length ? null : this._childList[i];
                        this.insertBefore(child, afterVDom);
                        currList.splice(pos, 1);
                        currList.splice(pos, 0, item);
                    }
                }
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
                this.__set_item = function(i){
                    ${this._itemVarName} = i;
                }
                this.__set_index = function(i){
                    ${this._indexVarName} = i;
                }
            }`);
            this.ctx = evaluatorManager.buildWith(this, this._iteratorContext);
        }
        _postBuild() {
            this._buildChild();
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
}

module.exports = {
    VirtualDomManager: VirtualDomManager
}