const util = require('./util.js');
const remote = require('./remote.js');
const dom = require('./dom.js');
const importableResources = require('./importable-resources');
const minimoEvents = require('./minimo-events.js');
const cached = require('./cached-resources.js');
const virtualDom = require('./vdom/virtualdom.js');

let _instanceCounter = 0;
let _templateInstance;
let _currentInstance;
let _instances = [];
let _mainInsertPointStart;
let _mainInsertPointEnd;
let _lastUrl;
let _loading;
const _setLastUrl = () => _lastUrl = window ? window.location.pathname + window.location.search : "";

const destroyInstance = (instance) => {
    instance._clear();
    _instances = _instances.filter(i => i != instance);
    instance._childInstances.forEach(destroyInstance);
}

class Minimo {
    constructor(rootElement, anchorStart, anchorEnd, htmlStruct, parent, controller) {
        this._instanceId = _instanceCounter++;

        if (rootElement) {
            this._dom = new dom.DOM(this, rootElement, document);
            this._vdom = new virtualDom.VirtualDom(htmlStruct && htmlStruct.c ? htmlStruct.c : [], rootElement, anchorStart, anchorEnd, this, true);
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
        return _lastUrl || document.referrer;
    }
    byId(id) {
        this._dom.getElementById(id);
    }
    _clear() {
        this._intervals.forEach(() => this.clearInterval());
        this._timeouts.forEach(() => this.clearTimeout());
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
    remove() {
        this._vdom.remove();
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
                util.keyValues(query).filter((k, v) => k != '_mjp' && k != '_xref')
                    .forEach((k, v) => param[k] = v);
                return fn(param);
            }
        };
    } catch (e) {
        onInitFn = () => {}
    }
    return onInitFn();
}
const startScript = (controller) => startInstance(null, null, null, null, controller, false);
const startInstance = (insertPoint, anchorStart, anchorEnd, htmlStruct, controller, modal) => {
    const m = new Minimo(insertPoint, anchorStart, anchorEnd, htmlStruct, null, controller);
    let binds = [];
    try {
        binds = m.eval('__binds__');
    } catch (e) {}

    return m.build()
        .then(Promise.all(binds))
        .then(() => _configInit(m, modal))
        .then(() => m.update())
        .then(() => m);
}
const startMainInstance = (htmlStruct) => {
    const m = new Minimo(document.body, null, null, htmlStruct, null, function () {
        this.eval = (f) => {
            return eval(f);
        };
    });
    if (window) {
        window.m = m;
    }
    _templateInstance = m;
    createLoadingVDom(m).then(() =>
        m.build()
        .then(() => {
            let mcontent = document.getElementsByTagName('mcontent')[0];
            _mainInsertPointStart = m._dom.createTextNode('');
            _mainInsertPointEnd = m._dom.createTextNode('');
            mcontent.parentElement.insertBefore(_mainInsertPointStart, mcontent);
            mcontent.parentElement.insertBefore(_mainInsertPointEnd, mcontent);
            mcontent.remove();
        })
        .then(() => minimoEvents.onStart(this))
        .then(() => _pushState(window.location.pathname + window.location.search))
        .then(() => {
            //setTimeout(()=>_loading.hide(), 3000);
            console.log('Minimo started (spa)')
        }));
}

const createLoadingVDom = () => {
    const m = {
        _dom: new dom.DOM({}, document.body)
    };
    _loading = new virtualDom.VirtualDom([{
        n: 'div',
        a: {
            style: "position:absolute;top:0px;left:0px;height: 100%;width:100%;z-index: 99999;background-color: white;"
        },
        c: [{
            n: 'img',
            a: {
                style: "position:absolute;top:0;left:0;right:0;bottom:0;margin:auto;",
                height: "42",
                width: "42",
                src: '"%loader.gif%"'
            }
        }]
    }], document.body, null, null, m);
    return _loading.build();
}

const _parseUrl = (url) => {
    if (url) {
        const qmIndex = url.indexOf('?');
        const path = (qmIndex >= 0 ? url.substring(0, qmIndex) : url).replace(/\.html$/, '');
        return {
            path: path,
            query: qmIndex >= 0 ? url.substring(qmIndex) : '',
            tpl: importableResources.getTemplateInfo(path)
        }
    }
}

let firstPush = true;
const _pushState = (url) => {
    _loading.show();
    minimoEvents.startPageChange();
    var current = _parseUrl(_lastUrl);
    var goto = _parseUrl(url);
    if (current && (!goto.tpl || !current.tpl || goto.tpl != current.tpl)) {
        //incompatible window (not the same tamplate, or no template at all)
        window.location = goto.path + goto.query;
    } else {
        _setLastUrl();
        const _oldInstance = _currentInstance;
        remote.htmlPage(goto.path).then(js => {
            if (_currentInstance) {
                _currentInstance.remove();
            }
            return eval(js)(_mainInsertPointStart.parentNode, _mainInsertPointStart, _mainInsertPointEnd, false);
        }).then((instance) => {
            _currentInstance = instance;
            history.pushState(null, null, url);
            minimoEvents.pageChanged();
            window._minimo_href_current_location = url;
            if (firstPush) {
                firstPush = false;
                minimoEvents.onPageChanged(() => destroyInstance(_oldInstance));
            }
            _loading.hide();
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
            _pushState(window.location.pathname + window.location.search);
        }
    });
    if (window.applicationCache) {
        window.applicationCache.addEventListener('updateready', () => window.location.reload(), false);
    }
}

let _firstUpdate = true;

const _updateAll = (delay) => {
    if (!minimoEvents.changingState) {
        let ready = _instances.filter(i => i._ready);
        if (ready.length && _firstUpdate) {
            _firstUpdate = false;
            //.closeInitLoad();
        }
        _templateInstance.update(delay).then(() =>
            _instances.forEach(instance => instance.update(delay)));
    }
}

global.startInstance = startInstance;
global.startMainInstance = startMainInstance;
global._updateAll = _updateAll;

module.exports = {
    startInstance: startInstance,
    startMainInstance: startMainInstance,
    _updateAll: _updateAll
}