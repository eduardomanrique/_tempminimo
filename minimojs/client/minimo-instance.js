const util = require('./util.js');
const remote = require('./remote.js');
const dom = require('./dom.js');
const importableResources = require('./importable-resources');
const minimoEvents = require('./minimo-events.js');
const cached = require('./cached-resources.js');
const virtualDom = require('./vdom/virtualdom.js');
const pubsub = require('./pubsub');

let _instanceCounter = 0;
let _templateInstance;
let _currentInstance;
let _instances = [];
let _mainInsertPointStart;
let _mainInsertPointEnd;
let _lastUrl;
let _loading;

let _window = util.getWindow();

const _setLastUrl = () => _lastUrl = _window.location.pathname + _window.location.search;

const destroyInstance = (instance) => {
    instance._clear();
    _instances = _instances.filter(i => i != instance);
    instance._childInstances.forEach(destroyInstance);
}

class ScreenEvent {
    constructor(name, param, callbacks) {
        this._name = name;
        this._param = param;
        this.callbacks = callbacks;
    }
    get type (){
        return pubsub.SCREEN_EVENT_TYPE;
    }
    get name() {
        return this._name;
    }
    get parameter() {
        return this._param;
    }
    static builder() {
        const builder = util.createBuilder('name', 'param')
            .onBuild((builder) => {
                const event = new ScreenEvent(builder.name, builder.param, builder._callbacks);
                event
                return event;
            });
        builder._callbacks = {};
        builder.addCallback = (name, fn) => builder._callbacks[name] = fn;
        return builder;
    }
}

class Minimo {
    get root() {
        return _window.m;
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
            const i = _window.setInterval(() => {
                f();
                _updateAll(500);
            }, t);
            this._intervals.push(i);
            return i;
        };
    }
    get clearInterval() {
        return (i) => {
            _window.clearInterval(i);
            this._intervals.splice(this._intervals.indexOf(i), 1);
        };
    }
    get setTimeout() {
        return (f, t) => {
            var i = _window.setTimeout(() => {
                f();
                _updateAll(500);
            }, t);
            this._timeouts.push(i);
            return i;
        };
    }
    get clearTimeout() {
        return (i) => {
            _window.clearTimeout(i);
            this._timeouts.splice(this._timeouts.indexOf(i), 1);
        };
    }
    set currentEvent(e) {
        this.root._event = e;
    }
    get event() {
        return this.root._event;
    }
    get referrer() {
        return _lastUrl || document.referrer;
    }
    get controller() {
        return this._controller;
    }
    get isGlobalScriptImport() {
        return this._isGlobalScriptImport;
    }
    addToBinds(promise) {
        this.getBinds().push(promise);
    }
    getBinds() {
        return this.eval('__binds__');
    }
    start(parameters) {
        return this.build()
            .then(() => Promise.all(this.getBinds()))
            .then(() => _fireOnInit(this, parameters))
            .then(() => this.update(1))
            .then(() => this);
    }
    byId(id) {
        this._dom.getElementById(id);
    }
    _clear() {
        this._intervals.forEach(() => this.clearInterval());
        this._timeouts.forEach(() => this.clearTimeout());
    }
    evalSet(v, val) {
        window.__temp_var__ = val;
        this.eval(v + '=window.__temp_var__');
        delete window.__temp_var__;
    }
    eval(fn) {
        try {
            return this._controller.__eval__(fn);
        } catch (e) {
            throw new Error('Error on script: ' + fn + '. Cause: ' + e.message);
        }
    }
    unsafeEval(fn) {
        try {
            return this._controller.__eval__(fn);
        } catch (e) {
            return null;
        }
    }
    _vdomPromise(fn) {
        return new Promise(r => {
            if (this._vdom) {
                r(fn());
            } else {
                r();
            }
        });
    }
    update(delay) {
        return this._vdomPromise(() => this._vdom.update(delay));
    }
    addChild(childInstance) {
        this._childInstances.push(childInstance);
    }
    build() {
        return this._vdomPromise(() => this._vdom.build());
    }
    remove() {
        if (this._vdom) {
            this._vdom.remove();
        }
    }
    import (path) {
        return remote.js(path)
            .then(js => {
                return eval(js.substring(0, js.lastIndexOf('(false)')))(true)
            });
    }
    go(url, parameters) {
        setTimeout(() => {
            if (parameters) {
                url += (url.indexOf('?') >= 0 ? '&' : '?') + '_mjp=' + encodeURIComponent(btoa(JSON.stringify(parameters)));
            }
            _pushState(url);
        }, 10);
    }
    get issue() {
        return new Proxy({}, {
            get: (_, eventName) => {
                const builder = ScreenEvent.builder().withName(eventName);
                return (param) => {
                    const opt = new Proxy({}, {
                        get: (_, answerName) => {
                            if (answerName === 'publish') {
                                return () => pubsub.emit(builder.withParam(param).build());
                            } else {
                                return (fn) => {
                                    builder.addCallback(answerName, fn);
                                    return opt;
                                }
                            }
                        }
                    });
                    return opt;
                }
            }
        });
    }
    static builder() {
        return util.createBuilder('insertPoint', 'anchorStart', 'anchorEnd', 'parent', 'controller', 'htmlStruct', 'modal', 'localJs')
            .onBuild((builder) => {
                const m = new Minimo()
                m._instanceId = _instanceCounter++;
                m._modal = builder.modal;
                if (builder.insertPoint) {
                    m._dom = new dom.DOM(m, builder.insertPoint, document);
                    m._vdom = new virtualDom.VirtualDom(builder.htmlStruct && builder.htmlStruct.c ? builder.htmlStruct.c : [], builder.insertPoint, builder.anchorStart, builder.anchorEnd, m, true);
                }
                m.parent = builder.parent;
                if (builder.parent) {
                    builder.parent.addChild(m);
                }
                m._scriptOnly = builder.htmlStruct == null;
                m._isDevMode = "%devmode%";
                m._isGlobalScriptImport = m._scriptOnly && !builder.localJs;
                m._childInstances = [];
                m._intervals = [];
                m._timeouts = [];
                m._controller = new builder.controller(m);
                return m;
            });
    }
}
const _fireOnInit = (instance, parameters) => {
    _instances.push(instance);
    let onInitFn;
    try {
        var fn = instance.eval('onInit');
        onInitFn = () => {
            if (instance._modal) {
                return fn(parameters);
            } else {
                var query = util.getQueryParams();
                var param = query._mjp ? JSON.parse(atob(decodeURIComponent(query._mjp))) : {};
                util.keyValues(query).filter(([k, v]) => k != '_mjp' && k != '_xref')
                    .forEach(([k, v]) => param[k] = v);
                return fn(param);
            }
        };
    } catch (e) {
        onInitFn = () => {}
    }
    return onInitFn();
}

const startMainInstance = (htmlStruct) => {
    const m = Minimo.builder().withInsertPoint(document.body).withHtmlStruct(htmlStruct).withController(function () {
        this.__eval__ = (f) => {
            return eval(f);
        };
    }).build();
    _window._mainInstance = m;

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
        .then(() => m.update())
        .then(() => _pushState(_window.location.pathname + _window.location.search))
        .then(() => {
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

const _pushState = (url) => {
    _loading.show();
    minimoEvents.startPageChange();
    var current = _parseUrl(_lastUrl);
    var goto = _parseUrl(url);
    if (current && (!goto.tpl || !current.tpl || goto.tpl != current.tpl)) {
        //incompatible window (not the same tamplate, or no template at all)
        _window.location = `${goto.path}.html${goto.query}`;
    } else {
        _setLastUrl();
        return remote.htmlPage(goto.path).then(js => {
            if (_currentInstance) {
                _currentInstance.remove();
            }
            history.pushState(null, null, url);
            const [htmlStruct, controller] = eval(js);
            return Minimo.builder()
                .withInsertPoint(_mainInsertPointStart.parentNode)
                .withAnchorStart(_mainInsertPointStart)
                .withAnchorEnd(_mainInsertPointEnd)
                .withHtmlStruct(htmlStruct)
                .withController(controller)
                .withParent(m)
                .build();
        }).then((instance) => instance.start().then(() => {
            const _oldInstance = _currentInstance;
            _currentInstance = instance;
            minimoEvents.pageChanged();
            _window._minimo_href_current_location = url;
            if (_oldInstance) {
                destroyInstance(_oldInstance);
            }
            _loading.hide()
            _window.m._readyListeners.forEach(fn => fn());
        }));
    }
}

if (!_window._minimo_href_current_location) {
    _window._minimo_href_current_location = _window.location.toString();
    _window.addEventListener('click', function (e) {
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
    _window.addEventListener('popstate', function (event) {
        var url = _window.location.toString().split("#")[0]
        if (url != _window._minimo_href_current_location) {
            _pushState(_window.location.pathname + _window.location.search);
        }
    });
    if (_window.applicationCache) {
        _window.applicationCache.addEventListener('updateready', () => _window.location.reload(), false);
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
        if (_templateInstance) {
            _templateInstance.update(delay).then(() =>
                _instances.forEach(instance => instance.update(delay)));
        }
    }
}

global.Minimo = Minimo;
global.startMainInstance = startMainInstance;
global._updateAll = _updateAll;

const mwrapper = {
    _readyListeners: [],
    ready: (fn) => _window.m._readyListeners.push(fn)
};
_window.m = new Proxy(mwrapper, {
    get: (target, name) => {
        if (name in mwrapper) {
            return mwrapper[name];
        } else if (_window._mainInstance) {
            return _window._mainInstance[name];
        }
    }
});

module.exports = {
    Minimo: Minimo,
    startMainInstance: startMainInstance,
    _updateAll: _updateAll
}