this.findFirstIteratorWithNoneStatus = () => 
_findNodesByProperty(_root, 'xiteratorStatus', v => 'none')[0];
//finds the parent iterator (nested) if any
function findParentIterator(el){
    return _findParentIteratorAux(el, el.xiterId)
}

function _findParentIteratorAux(el, xiterId){
    if(el == document || !el){
        return null;
    }
    var prevSib = el;
    while(prevSib = prevSib.previousSibling){
        if(prevSib._iteratorOpenNode){
            return prevSib;
        }else if(prevSib.xiteratorCloseNode){
            prevSib = prevSib._openNodeRef;
        }
    }
    if(el.parentElement && el.parentElement.xiterId && el.parentElement.xiterId != xiterId){
        return el.parentElement;
    }else{
        return _findParentIteratorAux(el.parentElement, xiterId);
    }
}

//find the element with the iteration instructions
function findIteratorElement(el){
    if(el == document || !el){
        return null;
    }else if(el.xiteratorElement){
        return el;
    }
    var prevSib = el;
    while(prevSib = prevSib.previousSibling){
        if(prevSib.xiteratorElement){
            return prevSib;
        }else if(prevSib.xiteratorCloseNode){
            prevSib = prevSib._openNodeRef;
        }
    }
    if(el.parentElement && el.parentElement.xiteratorElement){
        return el.parentElement;
    }else{
        return findIteratorElement(el.parentElement);
    }
}



function _createInsertPoint(element){
    var parent = element.parentElement;
    return {
        appendChild: function(el){
            parent.insertBefore(el, element);
        }
    };
}

function _findChildInStruct(json, name, remove){
    var lcName = name.toLowerCase();
    for(var i = 0; i < json.c.length; i++){
        if(json.c[i].n && json.c[i].n.toLowerCase() == lcName){
            var result = json.c[i];
            if(remove){
                json.c.splice(i, 1);
            }
            return result;
        }
    }
}

var dynamicAttributes = {};
var dynamicOutAttributes = {};

//update dynamic attributes
function updateElementsAttributeValue(){
    if(m.isImport){
        return;
    }
    var rootEl = _rootElement();
    for (var id in dynamicAttributes) {
        var e = getElementsByAttribute("data-xdynid", id, false, true);
        if(!e || e.length == 0){
            continue;
        }
        e = e[0];
        var atts = dynamicAttributes[id];
        for (var attName in atts){
            var att = atts[attName];
            try{
                var val = [];
                for(var i = 0; i < att.length; i++){
                    var item = att[i];
                    if(item.v){
                        val.push(item.v);
                    }else{
                        val.push(xinputs.execInCorrectContext(e, item.s));
                    }
                }
                val = val.join('');
                if(attName == 'checked'){
                    e.checked = val.toUpperCase() == 'TRUE';
                }else if(attName == 'disabled'){
                    e.disabled = val.toUpperCase() == 'TRUE';
                }else{
                    setAtt(e, attName, val);
                }
            }catch(ex){
                console.error("Error updating attribute " + attName + " of " + (e.getAttribute("id") || e) + ".", ex);
            }
        }
    }
}

//check if ctx for component is already created
function _checkCompId(e, compCtxSuffix){
    xcomponents.prepareComponentContext(e, compCtxSuffix, thisM, "");
}

function _createHTML(json, insertPoint, index, onFinish, compCtxSuffix){
    if(insertPoint == document){
        var body;
        var required = _findChildInStruct(json, 'xrs', true);
        if(json.n.toUpperCase() == 'DOCUMENT'){
            json = _findChildInStruct(json, 'html', false);
        }else if(json.n.toUpperCase() != 'HTML'){
            throw new Error('Invalid html. Json is not html structure');
        }
        var head = _findChildInStruct(json, 'head', false) || {name: 'head'};
        var body = _findChildInStruct(json, 'body', false) || {name: 'body'};
        _setAttributesOnElement(document.body, body, null, true);
        required.inHead = true;
        head.requiredSources = required;
        _createHTML(head, document.head, 0, function(){
            _createHTML(body, document.body, 0, function(){
                xlog.debug("html_creation", "html creation finished");
                onFinish();
            }, compCtxSuffix);
        });
        return;
    }else if(!json.processedRequired && json.n.toUpperCase() == 'DOCUMENT'){
        var required = _findChildInStruct(json, 'xrs', true);
        json.requiredSources = required;
        json.processedRequired = true;
    }
    if(json.requiredSources){
        //create required sources
        var processedRequired = false;
        while(json.requiredSources.c && index < json.requiredSources.c.length){
            var rq = _getAttributeFromStruct(json.requiredSources.c[index], 'src')[0].v;
            if(rq[0] == '/'){
                rq = rq.substring(1);
            }
            var ext = rq.substring(rq.length-4).toLowerCase()
            if(M$.alreadyRequired(rq) && ext != '.css'){
                index++;
                continue;
            }
            processedRequired = true
            var e;
            if(ext == '.css'){
                var scoped = !json.requiredSources.inHead;
                if(scoped){
                    e = createElement("style");
                    setAtt(e, "scoped", true);
                    e.innerHTML = "@import url(/res/" + rq + ");";
                    insertPoint.appendChild(e);
                    _createHTML(json, insertPoint, index+1, onFinish, compCtxSuffix);
                    return;
                }else{
                    e = createElement("link");
                    setAtt(e, "rel", "stylesheet");
                    setAtt(e, "type", "text/css");
                    setAtt(e, "href",  "/res/" + rq);
                    e.onload = function(){
                        _createHTML(json, insertPoint, index+1, onFinish, compCtxSuffix);
                    }
                }
            }else{
                //js
                e = createElement("script");
                setAtt(e, "src", "/res/" + rq);
                e.onload = function(){
                    _checkHoldJQuery();
                    _createHTML(json, insertPoint, index+1, onFinish, compCtxSuffix);
                }
            }
            document.body.appendChild(e);
            break;
        }
        if(!processedRequired){
            index = 0;
            json.requiredSources = false;
        }
    }
    if(!json.requiredSources){
        if(json.c && index < json.c.length){
            //iterate over children
            var child = json.c[index];
            if(child.n == 'modal-info'){
                M$.setModalInfo(child);
                child = json.c[++index];
            }
            if(child.t){
                //text
                _createTextNode(insertPoint, child, json.n.toUpperCase() == 'SCRIPT');
                _createHTML(json, insertPoint, index+1, onFinish, compCtxSuffix);
            }else if(child.x){
                //xscript
                _createXScriptNode(insertPoint, child, compCtxSuffix);
                _createHTML(json, insertPoint, index+1, onFinish, compCtxSuffix);
            }else{
                //element
                var e;
                var dynId = xutil.generateId();
                var isIterator = _isIterator(child);
                var hiddenIterator = false;
                if(child.n.toLowerCase() == 'xiterator'){//invisible iterator
                    hiddenIterator = true;
                    e = document.createTextNode('');
                    e.dynId = dynId;
                    e._iteratorOpenNode = true;
                }else{
                    e = createElement(child.n);
                    _setAttributesOnElement(e, child, dynId, true);
                    _checkDynOutAttributesOnElement(e, child, dynId);
                }
                _setHiddenAttributesOnElement(e, child);
                _checkCompId(e, compCtxSuffix);
                insertPoint.appendChild(e);
                if(isIterator){
                    e.xiteratorElement = true;
                    e.xiterId = _prepareIterator(child);			
                    if(hiddenIterator){
                        var ce = document.createTextNode('');
                        e._closeNodeRef = ce;
                        ce._openNodeRef = e;
                        ce.dynId = dynId;
                        ce.xiteratorCloseNode = true;
                        insertPoint.appendChild(ce);
                    }
                    e.xiteratorStatus = 'none';
                    _createHTML(json, insertPoint, index+1, onFinish, compCtxSuffix);
                }else{
                    _createHTML(child, e, 0, function(){
                        _createHTML(json, insertPoint, index+1, onFinish, compCtxSuffix);
                    }, compCtxSuffix);
                }
            }
        }else{
            onFinish();
        }
    }
}

//set jquery to wait for document ready
function _checkHoldJQuery(){
    try{
        if($ && $.holdReady && !m._holdingReady){
            m._holdingReady = true;
            $.holdReady(true);
        }		
    }catch(e){};
}

function _prepareIterator(html){
    //important: it is html.h.xiterId with uppercase I
    html.xiterid = html.xiterid || html.h.xiterId || xutil.generateId();
    html.h = html.h || {};
    html.h.status = "none";
    var listOrTimes = _getAttributeFromStruct(html, "data-xiterator-list") || _getAttributeFromStruct(html, "list");
    var isTimes = !listOrTimes;
    if(isTimes){
        listOrTimes = _getAttributeFromStruct(html, "data-xiterator-count") || _getAttributeFromStruct(html, "count");
    }
    var variable = _getAttributeFromStruct(html, "data-xiterator-var") || _getAttributeFromStruct(html, "var");
    var varindex = _getAttributeFromStruct(html, "data-xiterator-indexvar") || _getAttributeFromStruct(html, "indexvar");
    xvisual.__registerIterator(html.xiterid, listOrTimes[0], variable ? variable[0] : null, varindex ? varindex[0] : null, html, !isTimes)
    if(html.c){
        for(var i = 0; i < html.c.length;i++){
            var child = html.c[i];
            if(_isIterator(child)){
                _prepareIterator(child);
            }
        }		
    }
    return html.xiterid;
}

function _getAttributeFromStruct(html, attname){
    if(!html.a){
        return;
    }
    return html.a[attname];
}

function _isIterator(html){
    if(html.n && html.n.toLowerCase() == 'xiterator'){
        return true;
    }
    if(!html.a){
        return;
    }
    for(var attName in html.a){
        if(attName.indexOf("data-xiterator-") == 0){
            return true;
        }			
    }
}

function _createTextNode(insertPoint, child, isScript){
    if(isScript){
        insertPoint.innerHTML = child.t;
    }else{
        e = document.createTextNode(child.t);
        insertPoint.appendChild(e);	
    }
}

function createElement(name){
    var el = document.createElement(name);
    el._byminimo = true;
    var lName = name.toLowerCase();
    if(['input', 'button', 'select', 'textarea'].indexOf(lName) >= 0){
        xobj.addInput(el);
    } else if(lName == 'xscript'){
        xobj.addXScript(el);
    } else if(lName == 'a'){
        xobj.addA(el);
    }
    return el;
}

function _createXScriptNode(insertPoint, child, compCtxSuffix){
    e = createElement('xscript');
    setAtt(e, "data-xscript", child.x);
    _setHiddenAttributesOnElement(e, child);
    _checkCompId(e, compCtxSuffix);
    insertPoint.appendChild(e);			
}

//check if exists and register dynamic out attributes
function _checkDynOutAttributesOnElement(e, child, dynId){
    if(!child.o){
        return;
    }
    var dynOutAttrs = [];
    var hasDynOutAttrs = false;
    for(var z = 0; z < child.o.length; z++){
        var att = child.o[z];
        hasDynOutAttrs = true;
        dynOutAttrs.push(att);
    }
    if(hasDynOutAttrs){
        setAtt(e, "data-xdynid", dynId);
        dynamicOutAttributes[dynId] = dynOutAttrs;
    }
}

//set hidden attributes on element.
function _setHiddenAttributesOnElement(e, json){
    if(!json.h){
        return;
    }
    for(var k in json.h){
        e[k] = json.h[k];
    }
}


//set attributes from htmlStruct and register the dynamic ones
function _setAttributesOnElement(e, child, dynId, skipIteratorAtt){
    if(!child.a){
        return;
    }
    var dynAttrs = {};
    var hasDynAttrs = false;
    for(var attName in child.a){
        var att = child.a[attName];
        if(attName.indexOf("data-xiterator-") == 0 && skipIteratorAtt){
            continue;
        }
        var val = [];
        var isDynAttr = false;
        for(var i = 0; i < att.length; i++){
            var item = att[i];
            if(item.v){
                val.push(item.v);
            }else{
                isDynAttr = true;
            }
        }
        val = val.join('');
        if(attName == 'id'){
            val = val.replace('#modal:', m.CTX + ":");
        }
        setAtt(e, attName, val);
        if(isDynAttr){
            hasDynAttrs = true;
            dynAttrs[attName] = att;
        }
    }
    if(hasDynAttrs){
        setAtt(e, "data-xdynid", dynId);
        dynamicAttributes[dynId] = dynAttrs;
    }
}

function _registerDynAtt(dynId, att){
    dynamicAttributes[dynId] = att;
}

var creatingHtml = false;
function _createElements(json, components, insertPoint, index, onFinish){
    //temporary suffix for components to avoid diferent instances of components to have the same context
    var compCtxSuffix = {};
    creatingHtml = true;
    xcomponents.registerAll(components);
    _createHTML(json, insertPoint, index, function(){
        onFinish();
        creatingHtml = false;
        try{
            xobj.updateInputs();
            xobj.updateAllObjects();
        } catch (e) {
            console.error("xstartup", "XObj starting objects");
            throw e;
        }
    }, compCtxSuffix);
}

function isCreatingHtml(){
    return creatingHtml;
}

function _registerObjects(jsonDynAtt, jsonHiddenAtt, jsonIterators, jsonComp, components){
    xcomponents.registerAll(components);
    
    for(var dynId in jsonDynAtt){
        _registerDynAtt(dynId, jsonDynAtt[dynId]);
    }
    for(var dynId in jsonHiddenAtt){
        var e = getElementsByAttribute('data-xdynid', dynId, false, true)[0];
        if(e){
            for(var n in jsonHiddenAtt[dynId]){
                e[n] = jsonHiddenAtt[dynId][n];
            }			
        }
    }
    xcomponents.register(jsonComp);
    for (var i = 0; i < jsonIterators.length; i++) {
        var iter = jsonIterators[i];
        var temp;
        eval('temp=' + iter[4]);
        xvisual.__registerIterator(iter[0], {v:iter[1]}, {v:iter[2]}, {v:iter[3]}, temp, !iter[5]); 
    }
    //create hidden iterators
    var array = [];
    _findChildren({children:[_rootElement()]}, false, array, function(e){
        return e.getAttribute("data-hxiter");
    });
    for (var i = 0; i < array.length; i++) {
        var e = array[i];
        var hiddenIter = e.getAttribute("data-hxiter");
        if(e.nodeName == 'TABLE' && e.firstChild && e.firstChild.nodeName == 'TBODY'){
            e = e.firstChild;
        }
        var split = hiddenIter.split("|");
        for (var j = 0; j < split.length; j++) {
            if(split[j].trim() == ''){
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
            openNode.xiteratorStatus = 'none';
                
            var closeNode = document.createTextNode('');
            openNode._closeNodeRef = closeNode;
            closeNode._openNodeRef = openNode;
            closeNode.dynId = dynId;
            closeNode.xiteratorCloseNode = true;
                
            if(index < e.childNodes.length){
                sibling = e.childNodes[index];
            }
            e.insertBefore(openNode, sibling);
            e.insertBefore(closeNode, sibling);
        }
    }
}

function findNodesByProperty(property, value, like, stopWhenFound){
    var array = [];
    _findNodesByProperty(property, value, _rootElement(), like, stopWhenFound, array);
    return array;
}

function setAtt(el, attName, attValue){
    el.setAttribute(attName, attValue);
    if(attName.indexOf('on') == 0){
        xinputs.configureEvent(attName.substring(2), el);
    } else if(attName == 'data-xbind'){
        xobj.addXBind(el);
    }
}

function removeNode(node){
    if(node._iteratorOpenNode){
        var closeNode = node._closeNodeRef;
        //child of a hidden iterator
        var child = node;
        while(true){
            var sibling = child.nextSibling;
            child.remove();
            child = sibling;
            if(closeNode == child){
                child.remove();
                break;
            }
        }
    }else{
        node.remove();
    }
}