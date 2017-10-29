console.log("INIT Minimo..");

const _byId = (id, _doc) => (_doc || document).getElementById(id);

const _flatten = (a) => {
	let r = [];
	a.forEach(i => {
		if(i instanceof Array){
			r = r.concat(_flatten(i));
		}else{
			r.push(i);
		}
	});
	return r;
}

const _nodeListToArray = (nl) => {
	const a = [];
	for(let i = 0; i < nl.length; i++){
		a.push(nl[i]);
	}
	return a;
}

const _byClass = (classes, _doc) => _flatten(classes.split(' ')
	.map(c => _nodeListToArray((_doc || document).getElementsByClassName(c))));

let M$ = M$ || new function(){
	const _iterable = function*(a) {
		let index = 0;
		while(a.length > index) yield a[index++];
	}
	const _oneline = (s, ...args) => {
		const iter = _iterable(args);
		return s.map(v => v.split('\n').concat(iter.next().value).map(v => `${v || ''}`.trim()).join('')).join('').trim();
	}
	const _requiredUsed = [];
	this._firstUpdate = true;
	this._containsRequired = (src) => {
		if(_requiredUsed.indexOf(src) < 0){
			_requiredUsed.push(src);
			return false;
		}
		return true;
	}
	let newNodes = [];
	//check if the added nodes already have parent
	const checkAddedNodes = () => {
		console.log("checking changed nodes " + newNodes.length);
		const nodes = newNodes;
		newNodes = [];
	    nodes.filter(el => !el._xcreated).forEach(el => {
            const _instance = instances.find(i => i.isInThisContext(el));
            if(_instance){
				var nodeName = el.nodeName.toLowerCase();
				if(!el._xsetAttribute){
					el._minimo_instance = _instance;
					el._xsetAttribute = el.setAttribute;
					el.setAttribute = function(n, v){
						this._xsetAttribute(n, v);
						if(n.startsWith('on')){
							this._minimo_instance.configureEvent(n.substring(2), this);
						} else if(n == 'data-xbind'){
							this._minimo_instance.addXBind(this);
						}
					}
				}
				if(['input', 'button', 'select', 'textarea'].indexOf(nodeName) >= 0){
					_instance.addInput(el);
					_instance.configureAutocomplete(el);
				} else if(nodeName == 'mscr'){
					_instance.addXScript(el);
				} else if(nodeName == 'a'){
					_instance.configureHref(a);
					_instance.addA(el);
				}
			}
		});
		
	}

    let newPageListeners = [];
    this.onNewPage = (fn) => {
        newPageListeners.push(fn);
    }

    this._newPage = () => {
		const listeners = newPageListeners;
		newPageListeners = [];
        listeners.forEach(listener => {
            try{
                newPageListeners[i]();
            }catch(e){
                console.log("Error on new page listener" + e.message);
            }
        });
    }

	let isShowingLoading = false;
    this._setBlurryBackground = (toggleOn, idPopup, zIndex) => {
		const id = `__m_bb_${idPopup}__`;
    	if(toggleOn){
    		const div = document.createElement('div');
			div.setAttribute("id", id);
			const blurryCss = ` position: fixed;
								top: 0px;
								left: 0px; 
								width: 100%; 
								height: 100%;
								opacity: 0.5;
								background-color:white;
								z-index: ${zIndex};`;
    	    div.setAttribute("style", blurryCss);
    		document.body.appendChild(div);
    	}else{
    		var div = _byId(id);
    		if(div){
    	        div.remove();
    		}
    	}
    }

    this._highestZIndex = () => {
        const zindexes = [];
        document.getElementsByTagName('*').forEach(e => {
			if(e.style.position && e.style.zIndex) {
				zindexes.push(parseInt(e.style.zIndex));
			};
		});
		return Math.max(...zindexes) + 1;
    }

    this._showLoading = () => {
    	if(!isShowingLoading){
			isShowingLoading = true;
			const zIndex = M$._highestZIndex();
    		this._setBlurryBackground(true, 'loading', zIndex);
    		const dv = document.createElement("div");
			dv.setAttribute("style", _oneline`
							background:white;
							width: 100%;
							margin: 0;
							position: fixed;
							height: 100%;
							left: 0;
							top: 0;
							border: 0;
							-webkit-border-radius: 0;
							-moz-border-radius: 0;
							-o-border-radius: 0;
							border-radius: 0;
							z-index: ${zIndex + 1};`);
    		dv.setAttribute('id', '_loading_modal_');
    		const size = 40;
    		const left = parseInt((window.innerWidth - size) / 2);
    		const top = parseInt((window.innerHeight - size) / 2);
    		dv.innerHTML = _oneline`
					<img style="position: relative;
								width: ${size}px; 
								height: ${size}px; 
								left: ${left}px; 
						  		top: ${top}px;" src="/x/loader.gif"/>`;
    		document.body.appendChild(dv);
    	}
    }

    this._closeLoading = (before, after) => {
    	if(isShowingLoading){
    		setTimeout(function(){
    			if(before){
    			    before();
    			}
    			var dv = _byId("_loading_modal_");
    			if(dv){
    				dv.parentNode.removeChild(dv);
    			}
    			this._setBlurryBackground(false, 'loading');
    			isShowingLoading = false;
    			if(after){
    				after();
    			}
    		}, 200);
    	}
    };

	let _scheduledRefreshNodes = false;
	const _scheduleRefreshNodes = () => {
		if(!_scheduledRefreshNodes){
			_scheduledRefreshNodes = true;
			setTimeout(() => {
				checkAddedNodes();
				_scheduledRefreshNodes = false;
				if(newNodes.length){
					scheduleRefreshNodes();
				}
			},100);
		}
	}
	const _findInstanceForElement = (e) => {
	    var attRoot = e.getAttribute("data-xroot-ctx");
	    if(attRoot){
	        return instances.find(i => i.CTX == attRoot);
	    }
	    return _findInstanceForElement(e.parentElement);
	}
	this._startMutationObserver = function(){
        // cria uma nova instância de observador
        var observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach(n => newNodex.push(n));
                mutation.removedNodes.forEach(n => {
                    const index = newNodes.indexOf(mutation.removedNodes[i]);
                    if(index >= 0){
                        newNodes.splice(index, 1);
                        //TODO depois fazer com que remova tambem dos arrays principais
                    }
                });
                if(mutation.target.getAttribute("data-xonmutate")){
                    _findInstanceForElement(mutation.target)._fireEvent('mutate', mutation.target, {
                        mutationRecord: mutation
                    });
                }
			});
			scheduleRefreshNodes();
        });

        // configuração do observador:
        var config = { childList: true, subtree: true, attributeOldValue: true, attributes: true };

        // passar o nó alvo, bem como as opções de observação
        observer.observe(document.body, config);
    };

	this.copyArray = (a) => a.map(i => i);
	
	this.canCloseInitLoad = function(){
		var tempLoadDiv = _byId("_xtemploaddiv_");
		if(!tempLoadDiv){
			return false;
		}
		return true;
	}

	let _instanceCounter = 0;
	this._genInstanceId = (function*(){
		while(true){
			yield _instanceCounter++;
		}
	})();

	this.getJsCallbacks = {};
	this.register = function(struct, components, resourceName, fncontroller, instance){
		var array = this.getJsCallbacks[resourceName];
		if(!array && resourceName.endsWith("/index.js")){
            resourceName = resourceName.replace(/\/index\.js$/, ".js");
            array = this.getJsCallbacks[resourceName];
        }
		delete this.getJsCallbacks[resourceName];
		for (var i = 0; i < array.length; i++) {
			var cb = array[i];
			//clear timeoutcheck (when login is not valid anymore)
			clearTimeout(array[i]);
			cb(struct, fncontroller, components);
		}
	};
	this._clearInstances = function(){
	    this._changingState = true;
	    //clear all instances except the main (for spa)
	    for(var i = 1 ; i < instances.length; i++){
	        var instance = instances[i];
	        instance._clear();
	    }
	    instances.length = 1;
	};
	//callback when scripts comes from server
	//when it is global insertPoint, resName are empty
    this._onScript = function(struct, fncontroller, components, thisM, callback, insertPoint, resName){
        var controller = new fncontroller(thisM);
        //prepare context
        thisM.isImport = false;
        if(!document.body.getAttribute("data-x_ctx") || thisM.isSpa){
            //main controller
            thisM.isMain = true;
            if(thisM.isSpa){
                thisM.CTX = '_x_mainSpa';
            }else{
                thisM.setAtt(document.body, "data-x_ctx", thisM.CTX);
            }
            thisM.setAtt(document.body, "data-xroot-ctx", thisM.CTX);
        }else if(controller.isModal){
            thisM.CTX = "ctx_" + thisM.generateId();
            thisM.setAtt(insertPoint, "data-xroot-ctx", thisM.CTX);
            insertPoint.className += thisM.CTX;
            thisM.setRoot(insertPoint);
        }else{
            thisM.isImport = true;
        }
        thisM._setEvalFn(controller._x_eval);
        if(struct){
            if(!thisM.isAuthorized(resName)){
                //this is just to help developer, not to protect source. The data is the one that must be protected
                window.location = '/x/unauthorized';
            }else{
                M$.setModalResource(resName);
                thisM._createElements(struct, components, insertPoint, 0, function(){
                    thisM.setController(controller, callback);
                });
            }
        }else{
            thisM.setController(controller, callback);
        }
    };
	var instances = [];
	this._addInstance = function(x){
		instances.push(x);
	};
	this._instances = instances;
	var readyEvents = [];
	this.ready = function(fn){
		if(ready){
			fn();
		}else{
			readyEvents.push(fn);			
		}
	};
	var ready = false;
	this._checkReadyInterval = setInterval(function(){
		if(M$._ifAllReady() && !ready){
			clearInterval(M$._checkReadyInterval);
			ready = true;
			M$._update();
			for (var i = 0; i < readyEvents.length; i++) {
				M$._ifAllReady(readyEvents[i]());
			}
			try{
				$.holdReady(false);
			}catch(e){};
		}
	},50);
	this.isReady = function(){
		return ready;
	};
	this._ifAllReady = function(){
		for (var i = 0; i < instances.length; i++) {
			if(!instances[i]._ready){
				return false;
			}
		}
		%parameters_loaded%
		return M$.canCloseInitLoad();
	};
	this._update = function(){
		//check first if all instances are ready
		if(ready && !this._changingState){
			//all ready
			var updated = false;
			for (var i = 0; i < instances.length; i++) {
				if(instances[i]._controllerSet){
					instances[i]._update();
					updated = true
				}
			}
			if(M$._firstUpdate && updated){
				M$._firstUpdate = false;
				var tempLoadDiv = _byId("_xtemploaddiv_");
				tempLoadDiv.remove();
			}
		}
	};
	this.setDebugFlagOn = function(flag){
		if(ready){
			for (var i = 0; i < instances.length; i++) {
				instances[i].setDebugFlagOn(flag);
			}
		}
	};
	this._modalProperties = {};
	var currentModalResource;
	this.setModalResource = function(res){
		currentModalResource = res.split(".")[0];
	};
	this.setModalInfo = function(json){
		this._modalProperties[currentModalResource] = {};
		for(var k in json.a){
			var att = json.a[k];
			var val = [];
			for(var j = 0; j < att.length; j++){
				val.push(att[j].v);
			}
			this._modalProperties[currentModalResource][k] = val.join('');
		}
	};
}

var _Minimo = function(parent, isSpa) {
    this.isSpa = isSpa;
	if(parent){
		this.CTX = parent.CTX;
		this.controllerCtx = parent.controllerCtx || parent;
	}else if(isSpa){
	    this.CTX = '_x_mainSpa';
	}else{
		this.CTX = 'main';
	}
	this.instanceId = M$._genInstanceId();
	var thisM = this;
	M$._addInstance(this);
	var m = this;
	if(!window.m || window.m.instanceId == undefined){
		window.m = this;
	}
	this.isDevMode = "%devmode%";
	var isDevMode = this.isDevMode;
	function externalExpose(owner, fn){
		return function(){
			return fn.apply(owner, arguments);
		}
	}
	function _exposeFunction(owner, fn, external, name){
		if(!name){
			name = fn.name;
		}
		if(owner[name]){
			throw new Error("Function " + name + " already exposed in module");
		}
		owner[name] = fn;
		if(external){
			if(thisM[name]){
				throw new Error("Function " + name + " already exposed in X");
			}
			thisM[name] = externalExpose(owner, fn);
		}
	}
	this._loadObjects = function(){
	    xobj.updateAllObjects();
        xobj.updateXScripts();
	};
	function addModule(moduleFunction){
		return new moduleFunction(thisM);
	}
	
	var _afterCheck = [];
	thisM.addAfterCheck = function(f){
		_afterCheck.push(f);
	}
	
	"%xmodulescripts%"
	xcomponents.init();
	this.temp = {};
	
	function byId(id){
		return xdom.getElementById(id);
	}

    //controller context interval functions
    var _intervals = [];
	this._interval = function(f,t){
	    var i = window.setInterval(function(){
	        f();
	        M$._update();
	    },t);
	    _intervals.push(i);
	    return i;
	};
    this._clearInterval = function(i){
        window.clearInterval(i);
        _intervals.splice(_intervals.indexOf(i), 1);
    };

    //controller context timeout functions
    var _timeouts = [];
    this._timeout = function(f,t){
        var i = window.setTimeout(function(){
            f();
            M$._update();
        },t);
        _timeouts.push(i);
        return i;
    };
    this._clearTimeout = function(i){
        window.clearTimeout(i);
        _timeouts.splice(_timeouts.indexOf(i), 1);
    };

    //clear resources
    this._clear = function(){
        for(var i = 0; i < _intervals.length; i++){
            clearInterval(_intervals[i]);
        }

        for(var i = 0; i < _timeouts.length; i++){
            clearTimeout(_timeouts[i]);
        }
    }
	
	thisM._ = _;
	thisM._temp = {};
	
	this.eval = function(fn) {
		try{
			return this._evalFn(fn);
		}catch(e){
			throw new Error('Error on script: ' + fn + '. Cause: ' + e.message);
		}
	};
	var readyEvents = [];
	var ready = false;
	this.ready = function(fn){
		if(ready){
			M$.ready(fn);
		}else{
			readyEvents.push(fn);			
		}
	};

	this._getJS = function(resName, insertPoint, callback){
	    var self = this;
	    var fnCb = function(struct, fncontroller, components){
	        M$._onScript(struct, fncontroller, components, self, callback, insertPoint, resName);
	    };
		if(!xresources.isImportable(resName)){
		    throw new Error('Invalid resouce to import ' + resName);
		}
		if(!M$.getJsCallbacks[resName]){
			M$.getJsCallbacks[resName] = [];
			var scr = xdom.createElement("script");
			xdom.setAtt(scr, "src", resName);
			document.body.appendChild(scr);
		}
		//TODO it is temporary. Will be replaced by app.cache
		M$.getJsCallbacks[resName].push(fnCb);
	}
	
	xevents.onStart();
	
	this._setEvalFn = function(e){
		var _eval;
		this.defineProperty(this, '_evalFn',
		    function() {
				return _eval;
			},
			function(v) {
				_eval = v;
			}
		);
		
		this._evalFn = e;
	}
	
	this.setController = function(controller, callback) {
		xcomponents.startInstances();
		this._controller = controller;
		if(!this.isImport){
			xinputs.configEvents();
			thisM.debug("xstartup", "XObj update all objects");
            if(controller.isModal || this.isSpa){
                xevents.setModal();
            }
        }
		thisM.debug("xstartup", "XObj showing screen");
		try {
			thisM.debug("xstartup", "XObj calling before show page");
			thisM.eval('if(m.beforeShowPage){m.beforeShowPage("' + window.location.pathname + '");}');
		} catch (e) {
			xlog.error("xstartup", "XObj error calling init");
			throw e;
		}
		
		//exec chord of imports and services and exec onInit
		try {
			thisM.debug("xstartup", "XObj calling init");
			var __temp_onInit_fn__ = null; 
			try{
				var fn = thisM.eval('onInit');
				__temp_onInit_fn__ = function(){
				    xremote.setInitMode();
					if((thisM.CTX == 'main' || thisM.CTX == '_x_mainSpa') && !thisM.isImport){
					    var query = xutil.getQueryParams();
						var param = query['_xjp'] ? JSON.parse(xutil._atob(decodeURIComponent(query['_xjp']))) : {};
						for(var k in query){
						    if(k != '_xjp' && k != '_xref'){
						        param[k] = query[k];
						    }
						}
						thisM._loadObjects();
						fn(param);
					}else{
						var param = {};
                            var parameters = window['_x_modal_parameters'];
						if(parameters){
							var queue = parameters[thisM._controller.resourceName.split(".")[0]];
							if(queue){
								param = queue.shift();								
							}
						}
						fn(param.callback, param.parameter);
					}
					xremote.unsetInitMode();
				}
			}catch(e){
				__temp_onInit_fn__ = thisM.$(function(){
					thisM._ready = true;
				});
			};
			var binds = thisM.eval('__xbinds__');
			if(binds){
				var __chord = thisM.createChord(binds.length, __temp_onInit_fn__);
				binds.__exec(__chord);
			}else{
				__temp_onInit_fn__();
			}
		} catch (e) {
			xlog.error("xstartup", "XObj error calling init");
			throw e;
		}
		this._controllerSet = true;
		callback(controller);
		ready = true;
		for (var i = 0; i < readyEvents.length; i++) {
			M$.ready(readyEvents[i]);
		}
		setTimeout(M$._update, 100);

	};
	
	var updateDisabled = false;
	//returns the function without the proxy function if any
	function stripFunction(fn){
		return fn._fn || fn;
	}
	this.$ = function(fn){
		var _f = function(){
			xlog.debug("$", "BEFORE: Intercepting " + fn);
			var r;
			try{
				r = fn.apply(this, arguments);	
			}catch(e){
				if(!e._xcatch){
					var msg = "Error calling function " + fn + ". Error: " + e.message;
					xlog.error(msg, e);
					alert(msg);
					e._xcatch = true;					
				}
				throw e;
			}
			xlog.debug("$", "AFTER: Intercepting " + fn);
			return r;
		};
		_f._fn = fn;
		return _f;
	};
	var _updating = false;
	this._update = function(){
		if(!this._ready || _updating || M$._changingState){
			return;
		}
		_updating = true;
		xvisual.updateIterators();
		xobj.clearObjects();
		xobj.updateInputs();
		xdom.updateElementsAttributeValue();
		xinputs.configEvents();
		xobj.updateXScripts();
		_updating =false
	};
	var event; 
	function xsetCurrentEvent(e){
		event = e;
	};
	this.getEvent = function(){
		return event;
	};

	this.defineProperty = function(obj, name, getter, setter){
	    Object.defineProperty(obj, name, {
            get : getter || function(){},
            set : setter || function(){}
        });
	};
	this.defineProperty(this, 'referrer',
        function() {
            return M$._lastUrl || document.referrer;
        },
        function(v) {
        }
    );
};

window.applicationCache.addEventListener('updateready', function(){
    location.reload();
}, false);