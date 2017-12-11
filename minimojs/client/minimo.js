const util = require('./util.js');
const remote = require('./remote.js');
const dom = require('./dom.js');
const importableResources = require('./importable-resources');
const minimoEvents = require('./minimo-events.js');
const cached = require('./cached-resources.js');
const virtualDom = require('./vdom/virtualdom.js');

const _ATTCTX = "data-mroot-ctx";
let _instanceCounter = 0;
let _templateInstance;
let _currentInstance;
let _instances = [];
let _mainContentNode;

minimoEvents.onNewPage(() => destroyInstance(_currentInstance));

class Minimo {
    constructor(insertPoint, htmlStruct, parent, controller) {
        this._instanceId = _instanceCounter++;
        if (insertPoint) {
            insertPoint.setAttribute(_ATTCTX, instance.instanceId);
            this._dom = new dom.DOM(this, insertPoint, document);
            this._vdom = new virtualDom.VirtualDom(htmlStruct, insertPoint, this, buildComponentBuilderFunction, true);
        }
        this.parent = parent;
        if (parent) {
            parent.addChild(this);
        }
        this._scriptOnly = htmlStruct == null;
        this._isDevMode = "%devmode%";
        this._childInstances = [];
        this._intervals = [];
        this._timeouts = [];
        this._controller = new controller(this);
    }
    get id() {
        return this._instanceId;
    }
    get devmode() {
        return this._isDevMode;
    }
    //controller context interval functions
    get setInterval() {
        return (f, t) => {
            const i = window.setInterval(() => {
                f();
                _updateAll(500);
            }, t);
            this._intervals.push(i);
            return i;
        };
    }
    get clearInterval() {
        return (i) => {
            window.clearInterval(i);
            this._intervals.splice(this._intervals.indexOf(i), 1);
        };
    }
    get setTimeout() {
        return (f, t) => {
            var i = window.setTimeout(() => {
                f();
                _updateAll(500);
            }, t);
            this._timeouts.push(i);
            return i;
        };
    }
    get clearTimeout() {
        return (i) => {
            window.clearTimeout(i);
            this._timeouts.splice(this._timeouts.indexOf(i), 1);
        };
    }
    set currentEvent(e) {
        this._event = e;
    }
    get event() {
        return this._event;
    }
    get referrer() {
        return minimoEvents.lastUrl || document.referrer;
    }
    byId(id) {
        this._dom.getElementById(id);
    }
    _clear() {
        this._intervals.forEach(this._clearInterval);
        this._timeouts.forEach(this._clearTimeout);
    }
    eval(fn) {
        try {
            return this._controller.__eval__(fn);
        } catch (e) {
            throw new Error('Error on script: ' + fn + '. Cause: ' + e.message);
        }
    }
    update(delay) {
        return this._vdom.update(delay);
    }
    addChild(childInstance) {
        this._childInstances.push(childInstance);
    }
    build() {
        return this._vdom.build();
    }
    modalS(path, toggle, elementId) {}
    import (path) {}
    bindService() {}
}
const _configInit = (instance, modal) => {
    _instances.push(instance);
    let onInitFn;
    try {
        var fn = instance.eval('onInit');
        onInitFn = () => {
            if (modal) {
                var param = {};
                var parameters = window['_m_modal_parameters'];
                if (parameters) {
                    var queue = parameters[instance._controller.resourceName.split(".")[0]];
                    if (queue) {
                        param = queue.shift();
                    }
                }
                return fn(param.callback, (cached.get('modal_parameters', resourceName.split(".")) || {}).parameter);
            } else {
                var query = util.getQueryParams();
                var param = query._mjp ? JSON.parse(atob(decodeURIComponent(query._mjp))) : {};
                keyValues(query).filter((k, v) => k != '_mjp' && k != '_xref')
                    .forEach((k, v) => param[k] = v);
                return fn(param);
            }
        };
    } catch (e) {
        onInitFn = () => {}
    }
    return onInitFn;
}
const startScript = (controller) => startInstance(null, null, controller, false);
const startInstance = (insertPoint, htmlStruct, controller, modal) => {
    const m = new _Mimino(insertPoint, htmlStruct, null, controller);
    return m.build()
        .then(Promise.all(m.eval('__binds__')))
        .then(() => _configInit(m, modal))
        .then(() => m);
}
const startMainInstance = (htmlStruct) => {
    document.body.setAttribute(_ATTCTX, 'true');
    document.body.setAttribute('data-m-ctx', 'true');
    const m = new _Mimino(document.body, htmlStruct, null, new function () {
        this.eval = (f) => {
            return eval(f);
        };
    });
    if (window) {
        window.m = m;
    }
    _mainContentNode = document.getElementsByTagName('mContent')[0];
    m.build()
        .then(() => minimoEvents.onStart(this))
        .then(() => _loadPage(window.location, false))
        .then(() => console.log('Minimo started (spa)'));
}


const _parseUrl = (url) => {
    const qmIndex = url.indexOf('?');
    const path = qmIndex >= 0 ? url.substring(0, qmIndex) : url;
    return {
        path: path,
        query: qmIndex >= 0 ? url.substring(qmIndex) : '',
        tpl: importableResources.getTemplateInfo(path)
    }
}

const _pushState = (url, skipUpdateState = false) => {
    minimoEvents.startPageChange();
    var current = _parseUrl(lastUrl);
    var goto = _parseUrl(url);
    if (!goto.tpl || !current.tpl || goto.tpl != current.tpl) {
        //incompatible window (not the same tamplate, or no template at all)
        window.location = goto.path + goto.query;
    } else {
        var tempNode = document.createElement('div');
        if (!skipUpdateState) {
            var newPath = goto.path + goto.query;
            window._minimo_last_url = window._minimo_href_current_location;
            window._minimo_href_current_location = window.location.toString();
        }
        remote.htmlPage(goto.path).then(js => eval(js)(tempNode, false)).then(() => {
            while (_mainContentNode.firstChild) {
                _mainContentNode.firstChild.remove();
            }
            while (tempNode.childNodes.length > 0) {
                _mainContentNode.appendChild(tempNode.childNodes[0]);
            }
            minimoEvents.pageChanged();
        });
    }
}

if (window && !window._minimo_href_current_location) {
    window._minimo_href_current_location = window.location.toString();
    window.addEventListener('click', function (e) {
        const node = e.target;
        //set the pushState
        if (node.nodeName.toUpperCase() == 'A' && !node.href.startsWith('javascript:')) {
            //dealing with #
            var href = node.getAttribute("href");
            if (href == '#') {
                return;
            }
            var splitHref = href.split('#');
            if (splitHref[0] == '') {
                return;
            }
            if (splitHref.length > 1 &&
                (splitHref[0] == location.protocol + '//' + location.host + location.pathname ||
                    splitHref[0] == location.pathname)) {
                return;
            }
            //done with #
            if (href.indexOf('http:') != 0 && href.indexOf('https:') != 0) {
                _pushState(href);
                return e.preventDefault();
            }
        }
    }, false);
    window.addEventListener('popstate', function (event) {
        var url = window.location.toString().split("#")[0]
        if (url != window._minimo_href_current_location) {
            _pushState(window.location.pathname + window.location.search, true);
        }
    });
}