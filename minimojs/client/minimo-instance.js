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
            .then(Promise.all(this.getBinds()))
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
    eval(fn) {
        try {
            return this._controller.__eval__(fn);
        } catch (e) {
            throw new Error('Error on script: ' + fn + '. Cause: ' + e.message);
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
    static builder() {
        const builder = {
            insertPoint: (p) => {
                builder._insertPoint = p;
                return builder;
            },
            anchorStart: (p) => {
                builder._startAnchor = p;
                return builder;
            },
            anchorEnd: (p) => {
                builder._endAnchor = p;
                return builder;
            },
            parent: (p) => {
                builder._parent = p;
                return builder;
            },
            controller: (p) => {
                builder._controller = p;
                return builder;
            },
            htmlStruct: (p) => {
                builder._htmlStruct = p;
                return builder;
            },
            modal: (p) => {
                builder._modal = p;
                return builder;
            },
            localJs: (p) => {
                builder._localJs = p;
                return builder;
            },
            build: () => {
                const m = new Minimo()
                m._instanceId = _instanceCounter++;
                m._modal = builder._modal;
                if (builder._insertPoint) {
                    m._dom = new dom.DOM(m, builder._insertPoint, document);
                    m._vdom = new virtualDom.VirtualDom(builder._htmlStruct && builder._htmlStruct.c ? builder._htmlStruct.c : [], builder._insertPoint, builder._startAnchor, builder._endAnchor, m, true);
                }
                m.parent = builder._parent;
                if (builder._parent) {
                    builder._parent.addChild(m);
                }
                m._scriptOnly = builder._htmlStruct == null;
                m._isDevMode = "%devmode%";
                m._isGlobalScriptImport = m._scriptOnly && !builder._localJs;
                m._childInstances = [];
                m._intervals = [];
                m._timeouts = [];
                m._controller = new builder._controller(m);
                return m;
            }
        };
        return builder;
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
    const m = Minimo.builder().insertPoint(document.body).htmlStruct(htmlStruct).controller(function () {
        this.__eval__ = (f) => {
            return eval(f);
        };
    }).build();
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
        .then(() => m.update())
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

const _pushState = (url) => {
    _loading.show();
    minimoEvents.startPageChange();
    var current = _parseUrl(_lastUrl);
    var goto = _parseUrl(url);
    if (current && (!goto.tpl || !current.tpl || goto.tpl != current.tpl)) {
        //incompatible window (not the same tamplate, or no template at all)
        window.location = `${goto.path}.html${goto.query}`;
    } else {
        _setLastUrl();
        remote.htmlPage(goto.path).then(js => {
            if (_currentInstance) {
                _currentInstance.remove();
            }
            history.pushState(null, null, url);
            const [htmlStruct, controller] = eval(js);
            return Minimo.builder()
                .insertPoint(_mainInsertPointStart.parentNode)
                .anchorStart(_mainInsertPointStart)
                .anchorEnd(_mainInsertPointEnd)
                .htmlStruct(htmlStruct)
                .controller(controller)
                .parent(m)
                .build();
        }).then((instance) => {
            instance.start().then(() => {
                const _oldInstance = _currentInstance;
                _currentInstance = instance;
                minimoEvents.pageChanged();
                window._minimo_href_current_location = url;
                if (_oldInstance) {
                    destroyInstance(_oldInstance);
                }
                _loading.hide();
            });
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

global.Minimo = Minimo;
global.startMainInstance = startMainInstance;
global._updateAll = _updateAll;

module.exports = {
    Minimo: Minimo,
    startMainInstance: startMainInstance,
    _updateAll: _updateAll
}