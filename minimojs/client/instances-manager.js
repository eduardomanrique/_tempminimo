const util = require('./util.js');
const dom = require('./dom.js');
const modals = require('./modals.js');
const minimoEvents = require('./minimo-events.js');
const cached = require('./cached-resources.js');
const virtualDom = require('./vdom/virtualdom.js');
const _ATTCTX = "data-mroot-ctx";
let _instanceCounter = 0;
let _mainInstance;
let _spaInstance;
let _contentNode;
let _instances = [];

minimo 
push state no main instance

start main instance for minimo template
  no controller
  new mimimo 
  insert point body
  vdom
then
  get mcontent
    set as spa node
    trigger new url (triggered also by change url)
    

new url (push state) 
loading
new promise
  get name resource from url
  check if resource uses the same template (in the first time, yes)
  if uses same
    get page with ajax
    clear mcontent
    clear minimo instances
    new minimo
    insert point body
    vdom
  else
    document.localtion = new url
    

let buildComponentBuilderFunction;

minimoEvents.onNewPage(() => {
    destroyInstance(_spaInstance);
});

class Minimo {
    constructor(insertPoint, htmlStruct, parent) {
        this._instanceId = _instanceCounter++;
        insertPoint.setAttribute(_ATTCTX, instance.instanceId);
        this.parent = parent;
        parent.addChild(this);
        this._scriptOnly = htmlStruct == null;
        this._isDevMode = "%devmode%";
        this._childInstances = [];
        this._dom = new dom.DOM(this, insertPoint, document);
        this._vdom = new virtualDom.VirtualDom(htmlStruct, insertPoint, this, buildComponentBuilderFunction, true);
        this._intervals = [];
        this._timeouts = [];
        const self = this;
    }
    get id() {
        return this._instanceId;
    }
    get dom(){
        return this._dom;
    }
    get scriptOnly(){
        return this._scriptOnly;
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
            return this._eval(fn);
        } catch (e) {
            throw new Error('Error on script: ' + fn + '. Cause: ' + e.message);
        }
    }
    update (delay) {
        return this._vdom.update(delay);
    }
    addChild (childInstance) {
        this._childInstances.push(childInstance);
    }
}
const startMainInstance = (htmlStruct) => {
    document.body.setAttribute(_ATTCTX, 'true');
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
const registerInstance = (htmlStruct, resourceName, insertPoint, parentInstance, fnController) => {
    const instance = new Minimo(insertPoint, htmlStruct, parentInstance);
    _instances.push(instance);
    const controller = new fnController(instance);
    instance._eval = controller.__eval__;
    minimoEvents.onStart(this);
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
    return dom.createElements(htmlStruct, insertPoint)
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

const _updateAll = (delay) => {
    if (!minimoEvents.changingState) {
        let ready = _instances.filter(i => i._ready);
        if(ready.length && _firstUpdate){
            _firstUpdate = false;
            modals.closeInitLoad();
        }
        ready.forEach(instance => instance.update(delay));
    }
}

const allReady = () => !_instances.find(i => !i._ready);

module.exports = {
    startMainInstance: startMainInstance,
    startSpaInstance: startSpaInstance,
    allReady: allReady,
    destroyInstance: destroyInstance,
    setBuildComponentBuilderFunction = (fn) => buildComponentBuilderFunction = fn
};