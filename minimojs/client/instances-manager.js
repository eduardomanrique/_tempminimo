const util = require('./util.js');
const mobj = require('./mobj.js');
const modals = require('./modals.js');
const component = require('./components.js');
const dom = require('./dom.js');
const inputs = require('./inputs.js');
const visual = require('./visual.js');
const minimoEvents = require('./minimo-events.js');
const cached = require('./cached-resources.js');
const _ = require('underscore');
const _ATTCTX = "data-mroot-ctx";
let _instanceCounter = 0;
let _mainInstance;
let _spaInstance;
let _contentNode;
let _instances = [];

minimoEvents.onNewPage(() => {
    destroyInstance(_spaInstance);
});

const findMinimoInstanceForElement = (e) => {
    var attRoot = e.getAttribute(_attCtx);
    if (attRoot) {
        return _instances.find(i => i.id == attRoot);
    }
    return findMinimoInstanceForElement(e.parentElement);
};
//TODO
//dom.setRootElement ver isso
//set class on insertion point = root-idinstance

class Minimo {
    constructor(ctxId, scriptOnly, parent) {
        this._instanceId = ctxId;
        this.parent = parent;
        parent.addChild(this);
        this._scriptOnly = scriptOnly;
        window.m = window.m || this;
        this._isDevMode = "%devmode%";
        this._afterCheck = [];
        this._childInstances = [];
        this._dom = new dom.DOM(this);
        this._mobj = new mobj.Instance(this);
        this._inputs = new inputs.Instance(this);
        this._visual = new visual.Instance(this);
        this._intervals = [];
        this._timeouts = [];
        const self = this;
        this._interval = function (f, t) {
            const i = window.setInterval(function () {
                f();
                _updateAll();
            }, t);
            self._intervals.push(i);
            return i;
        };
        this._clearInterval = function (i) {
            window.clearInterval(i);
            self._intervals.splice(self._intervals.indexOf(i), 1);
        };
        this._timeout = function (f, t) {
            var i = window.setTimeout(function () {
                f();
                _updateAll();
            }, t);
            self._timeouts.push(i);
            return i;
        };
        this._clearTimeout = function (i) {
            window.clearTimeout(i);
            self._timeouts.splice(self._timeouts.indexOf(i), 1);
        };
    }
    get id() {
        return this._instanceId;
    }
    get scriptOnly(){
        return this._scriptOnly;
    }
    get devmode() {
        return this._isDevMode;
    }
    //controller context interval functions
    get interval() {
        return this._interval;
    }
    get clearInterval() {
        return this._clearInterval;
    }
    get timeout() {
        return this._timeout;
    }
    get _clearTimeout() {
        return this._clearTimeout;
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
    configEvents() {
        this._inputs.configEvents();
    }
    _loadObjects() {
        this._mobj.updateAllObjects(m);
        this._mobj.updateMScripts(m);
    }
    addAfterCheck(f) {
        this._afterCheck.push(f);
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
            return this._eval(fn);
        } catch (e) {
            throw new Error('Error on script: ' + fn + '. Cause: ' + e.message);
        }
    }
    _update (){
        if (!this._ready || this._updating || minimoEvents.changingState) {
            return;
        }
        this._updating = true;
        this._visual.updateIterators();
        this._mobj.clearObjects();
        this._mobj.updateInputs();
        this._dom.updateElementsAttributeValue();
        this._inputs.configEvents();
        this._mobj.updateMScripts();
        this._updating = false
    }
    addChild (childInstance) {
        this._childInstances.push(childInstance);
    }
}
const startMainInstance = (htmlStruct) => {
    document.body.setAttribute('data-m-ctx', 'true');
    return registerInstance(htmlStruct, resourceName, _contentNode, null, new function () {
        this.__eval__ = function (f) {
            return eval(f);
        };
    }).then(instance => {
        _mainInstance = instance;
        _contentNode = util._byName('mContent')[0];
        _contentNode._setModal = function (child) {
            this.pushChild(child);
        }
        return instance;
    });
}
const registerInstance = (htmlStruct, resourceName, insertionPoint, parentInstance, fnController) => {
    const instance = new _Minimo(_instanceCounter++, htmlStruct != null, parentInstance);
    insertionPoint.setAttribute(_ATTCTX, instance.instanceId);
    _instances.push(instance);
    const controller = new fnController(instance);
    instance._eval = controller.__eval__;
    components.init(m);
    minimoEvents.onStart(this);
    components.startInstances();

    if (!instance.scriptOnly) {
        instance.configEvents();
    }
    var onInitFn = null;
    try {
        var fn = instance.eval('onInit');
        onInitFn = (resolve, reject) => {
            if (instance.id == 'main' && !instance.scriptOnly) {
                var query = xutil.getQueryParams();
                var param = query._xjp ? JSON.parse(atob(decodeURIComponent(query._xjp))) : {};
                _.keys(query).filter(k => k != '_xjp' && k != '_xref')
                    .forEach(k => param[k] = query[k]);
                instance._loadObjects();
                return fn(param);
            } else {
                return fn(param.callback, (cached.get('modal_parameters', resourceName.split(".")) || {}).parameter);
            }
        };
    } catch (e) {
        onInitFn = () => {}
    }
    return dom.createElements(htmlStruct, insertionPoint)
        .then(Promise.all(instance.eval('__binds__')))
        .then(onInitFn)
        .then(_updateAll)
        .then(() => instance);
}
const startSpaInstance = (htmlStruct, resourceName, fnController) => 
    registerInstance(htmlStruct, resourceName, _contentNode, null, fnController)
        .then(i => (_spaInstance = i));
    
const destroyInstance = (instance) => {
    instance._clear();
    _instances = _instances.filter(i => i != instance);
    instance._childInstances.forEach(destroyInstance);
}

const startJsInstance = (fnController, resName, parentInstance) => 
    registerInstance(null, resourceName, null, parentInstance, fnController);

const startInstance = (htmlStruct, resourceName, insertionPoint, parentInstance, fnController) => 
    registerInstance(htmlStruct, resourceName, insertionPoint, parentInstance, fnController);

let _firstUpdate = true;
const _updateAll = () => {
    if (!minimoEvents.changingState) {
        let cleared = _instances.filter(i => i._ready).map(i => i._clear());
        if(cleared.length && _firstUpdate){
            _firstUpdate = false;
            modals.closeInitLoad();
        }
    }
}

const allReady = () => !_instances.find(i => !i._ready);

module.exports = {
    startMainInstance: startMainInstance,
    startSpaInstance: startSpaInstance,
    findMinimoInstanceForElement: findMinimoInstanceForElement,
    allReady: allReady,
    destroyInstance: destroyInstance
};