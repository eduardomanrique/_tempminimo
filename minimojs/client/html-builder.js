const util = require('./util.js');

class HmtlBuilder {
    constructor(minimoInstance, dom, components) {
        this._m = minimoInstance;
        this._dom = dom;
        this._comp = components;

        const _findChildInStruct = (json, name, remove) => {
            const lcName = name.toLowerCase();
            for (let i = 0; i < json.c.length; i++) {
                const c = json.c[i];
                if (c.n && c.n.toLowerCase() == lcName) {
                    if (remove) {
                        json.c.splice(i, 1);
                    }
                    return c;
                }
            }
        }
        //check if ctx for component is already created
        const _checkCompId = (e) => components.prepareComponentContext(e, minimoInstance, "");
        //set jquery to wait for document ready
        const _checkHoldJQuery = () => {
            if ($ && $.holdReady) {
                $.holdReady(true);
            }
        }
        const _getAttributeFromStruct = (html, attname) => html.a ? html.a[attname] : null;

        const _createMScriptNode = (child) => {
            const e = dom.createElement('mscript');
            dom.setAttribute(e, "data-mscript", child.x);
            _setHiddenAttributesOnElement(e, child);
            _checkCompId(e);
        }
        //set hidden attributes on element.
        const _setHiddenAttributesOnElement = (e, json) => {
            for (var k in (json.h || {})) {
                e[k] = json.h[k];
            }
        }
        const _isIterator = (html) => html.xv && html.xl;

        const _prepareIterator = (html, e) => {
            html.h = html.h || {};
            html.h.status = "none";
            if (html.c) {
                for (var i = 0; i < html.c.length; i++) {
                    var child = html.c[i];
                    if (_isIterator(child)) {
                        _prepareIterator(child);
                    }
                }
            }
            html.e = e;
        }
        //set attributes from htmlStruct and register the dynamic ones
        const _setAttributesOnElement = (e, child) => {
            if (child.a) {
                const dynAttrs = {};
                let hasDynAttrs = false;
                for (var attName in child.a) {
                    const att = child.a[attName];
                    const val = [];
                    let isDynAttr = false;
                    for (var i = 0; i < att.length; i++) {
                        var item = att[i];
                        if (!item.s) {
                            val.push(item);
                        } else {
                            isDynAttr = true;
                            break;
                        }
                    }
                    if (attName == 'id' && val.length) {
                        val[0] = val[0].replace('#modal:', `${m.CTX}:`);
                    }
                    dom.setAttribute(e, attName, isDynAttr ? '' : val[0]);
                    if (isDynAttr) {
                        hasDynAttrs = true;
                        dynAttrs[attName] = att;
                    }
                }
                if (hasDynAttrs) {
                    e.d = dynAttrs;
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
                            e = createElement("link");
                            dom.setAttribute(e, "rel", "stylesheet", "type", "text/css", "href", "/res/" + rq);
                            e.onload = () => closure(util.tail(list));
                        } else {
                            //js
                            e = createElement("script");
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
        this._createHTML = (htmlStruct, insertPoint) => new Promise((resolve, reject) => {
            const closure = (json) => {
                for (let i = 0; json.c && i < json.c.length; i++) {
                    var child = json.c[i];
                    if (child.n == 'modal-info') {
                        M$.setModalInfo(child);
                    } else if (child.t) {
                        //text
                        dom.createTextNode(insertPoint, child, json.n.toUpperCase() == 'SCRIPT');
                    } else if (child.x) {
                        //mscript
                        _createMScriptNode(insertPoint, child);
                        insertPoint.appendChild(e);
                    } else if (child.n == 'style') {
                        const e = dom.createElement("style");
                        dom.setAttribute(e, "scoped", true);
                        e.innerHTML = "@import url(/res/" + rq + ");";
                        insertPoint.appendChild(e);
                    } else {
                        const isIterator = _isIterator(child);
                        const e = isIterator ? document.createTextNode('') : createElement(child.n);
                        _setHiddenAttributesOnElement(e, child);
                        _checkCompId(e);
                        insertPoint.appendChild(e);
                        if (isIterator) {
                            e.iteratorOpenNode = true;
                            _prepareIterator(child, e);
                            const closeNode = document.createTextNode('');
                            e._closeNodeRef = closeNode;
                            closeNode._openNodeRef = e;
                            closeNode.iteratorCloseNode = true;
                            insertPoint.appendChild(closeNode);
                        } else {
                            closure(child, e);
                        }
                    }
                }
            }
            closure(htmlStruct, insertPoint);
            resolve();
        });
        function _registerDynAtt(dynId, att) {
            dynamicAttributes[dynId] = att;
        }

        function _registerObjects(jsonDynAtt, jsonHiddenAtt, jsonIterators, jsonComp, components) {
            xcomponents.registerAll(components);

            for (var dynId in jsonDynAtt) {
                _registerDynAtt(dynId, jsonDynAtt[dynId]);
            }
            for (var dynId in jsonHiddenAtt) {
                var e = getElementsByAttribute('data-xdynid', dynId, false, true)[0];
                if (e) {
                    for (var n in jsonHiddenAtt[dynId]) {
                        e[n] = jsonHiddenAtt[dynId][n];
                    }
                }
            }
            xcomponents.register(jsonComp);
            for (var i = 0; i < jsonIterators.length; i++) {
                var iter = jsonIterators[i];
                var temp;
                eval('temp=' + iter[4]);
                xvisual.__registerIterator(iter[0], {
                    v: iter[1]
                }, {
                    v: iter[2]
                }, {
                    v: iter[3]
                }, temp, !iter[5]);
            }
            //create hidden iterators
            var array = [];
            _findChildren({
                children: [_rootElement()]
            }, false, array, function (e) {
                return e.getAttribute("data-hxiter");
            });
            for (var i = 0; i < array.length; i++) {
                var e = array[i];
                var hiddenIter = e.getAttribute("data-hxiter");
                if (e.nodeName == 'TABLE' && e.firstChild && e.firstChild.nodeName == 'TBODY') {
                    e = e.firstChild;
                }
                var split = hiddenIter.split("|");
                for (var j = 0; j < split.length; j++) {
                    if (split[j].trim() == '') {
                        continue;
                    }
                    var iter = split[j].split(',');
                    var index = parseInt(iter[1]) + j;
                    var sibling = null;
                    var openNode = document.createTextNode('');
                    var dynId = xutil.generateId();
                    openNode.dynId = dynId;
                    openNode.xiterId = iter[0];
                    openNode._iteratorOpenNode = true;
                    openNode.xiteratorElement = true;
                    openNode._iteratorStatus = 'none';

                    var closeNode = document.createTextNode('');
                    openNode._closeNodeRef = closeNode;
                    closeNode._openNodeRef = openNode;
                    closeNode.dynId = dynId;
                    closeNode.xiteratorCloseNode = true;

                    if (index < e.childNodes.length) {
                        sibling = e.childNodes[index];
                    }
                    e.insertBefore(openNode, sibling);
                    e.insertBefore(closeNode, sibling);
                }
            }
        }

        function findNodesByProperty(property, value, like, stopWhenFound) {
            var array = [];
            _findNodesByProperty(property, value, _rootElement(), like, stopWhenFound, array);
            return array;
        }

        function removeNode(node) {
            if (node._iteratorOpenNode) {
                var closeNode = node._closeNodeRef;
                //child of a hidden iterator
                var child = node;
                while (true) {
                    var sibling = child.nextSibling;
                    child.remove();
                    child = sibling;
                    if (closeNode == child) {
                        child.remove();
                        break;
                    }
                }
            } else {
                node.remove();
            }
        }

    }
    createElements(json, components, insertPoint, index) {
        components.registerAll(components);
        var required = _findChildInStruct(json, 'xrs', true);
        return this._createRequiredSources(required, insertPoint)
            .then(this._createHTML(json, insertPoint))
    }
}