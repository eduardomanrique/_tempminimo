var comps;
var components;
function _setComponents(c){
	components = c;
}

//called on initialization of X
function init(){
	try{
		thisM.debug("xstartup", "XComponents INIT");
		"%components%"
		comps = _comps
		thisM.debug("xstartup", "XComponents _setComponents");
		_setComponents(components);
		thisM.debug("xstartup", "XComponents initComponent");
		initComponents();
		thisM.debug("xstartup", "XComponents buildComponent");
		createComponentConstructors();
	}catch(e){
		var msg = "Error loading custom components: " + e.message;
		console.error(msg, e);
		throw new Error(msg);
	}
	thisM.debug("xstartup", "XComponents INIT done");
}

//constructor of components
function _buildCreateFunction(compName){
	return function(comp){
		var result = {
			_x_comp: thisM.comp[compName]
		};
		for(var k in comp){
			result[k] = comp[k];
		}
		return result;
	}
}

//Initialization method called when the component is dymanic created
function _startComp(_html, comp, fnInsert){
	var _div = xdom.createElement('div');
	_div.innerHTML = _html;
	var xid = comp.xid;
	var len = _div.childNodes.length;
	xutil.range(0, len, function(j){
		if(xid){
			if(j == 0){
				xdom.setAtt(_div.childNodes[0], "_s_xid_", xid);
			}
			if(j == len -1){
				xdom.setAtt(_div.childNodes[0], "_e_xid_", xid);
			}					
		}
		fnInsert(_div.childNodes[0]);	
	});
}

//private auxiliary method to dynamically insert components 
function _insertComp(handle, xid, beforeInsideAfter){
	var _html = handle._x_comp.getHtml(handle);
	if(handle.innerHTML){
		_html = _html.replace('{mcontent}', handle.innerHTML);
	}
	_startComp(_html, handle, function(node){
		if(beforeInsideAfter == -1){
			var el = xdom.getElementsByAttribute("_s_xid_", xid)[0] || document.getElementById(xid);
			el.parentNode.insertBefore(node, el);
		}else if(beforeInsideAfter == 0){
			var el = document.getElementById(xid);
			el.appendChild(node);
		}else{
			var el = xdom.getElementsByAttribute("_e_xid_", xid)[0] || document.getElementById(xid);
			el.parentNode.insertBefore(node, el.nextSibling);
		}
		_postCreateComp(handle, xid);
		_configComps();
	});
}

//private
function _postCreateComp(ctx){
	if(ctx.onReady){
		ctx.onReady();
	};
}

//start component's methods
function initComponents(){
	thisM.comp = components;
	thisM.comp.insertBefore = function(handle, xid){
		_insertComp(handle, xid, -1);
	};
	thisM.comp.insertAfter = function(handle, xid){
		_insertComp(handle, xid, 1);
	};
	thisM.comp.append = function(handle, xid){
		_insertComp(handle, xid, 0);
	};
	thisM.comp.updateValue = function(comp){
		xobj.updateObject(comp);
	}
};

//create component's constructors
function createComponentConstructors(){
	xutil.each(comps, function(comp){
		var compName = comp[0];
		components['new' + compName[0].toUpperCase() + compName.substring(1)] = _buildCreateFunction(compName);
	});
}

var _handles = {};
function registerAll(compMap){
	for (var k in compMap) {
		_handles[k] = {};
		var list = compMap[k];
		for (var i = 0; i < list.length; i++) {
			var comp = list[i];
			var id = comp.xcompId;
			delete comp.xcompId;
			_handles[k][id] = comp;
		}
	}
}

function prepareComponentContext(e, compCtxSuffix, ctx, postScript){
	if(e.xcompId && (m.comp[e.xcompName].context || m.comp[e.xcompName].htmxContext)){
		if(!compCtxSuffix[e.xcompId]){
		    //must recreate function from string to create it on the right context
		    var ctx;
		    if(m.comp[e.xcompName].context){
                var fn = m.comp[e.xcompName].context.toString();
                fn = fn.substring(0, fn.length-1) + ";this._xcompEval = function(f){try{return eval(f);}catch(e){throw new Error("+
                    "'Error on component script: ' + f + '. Cause: ' + e.message);}};" + postScript + "}";
                thisM._temp._xtemp_comp_struct = _handles[e.xcompName][e.xcompId];
                ctx = ctx.eval('new ' + fn + '(m._temp._xtemp_comp_struct)');
                delete thisM._temp._xtemp_comp_struct;
            }else{
                var fn = m.comp[e.xcompName].htmxContext.toString();
                ctx.eval('m._temp._fnContext = ' + fn)
                ctx = new thisM._temp._fnContext(_handles[e.xcompName][e.xcompId]);
                if(ctx.defineAttributes){
                    xcomptypes.configAttributes(ctx);
                }
                delete thisM._temp._fnContext;
            }
			e._compCtx = ctx;
			compCtxSuffix[e.xcompId] = ctx;
		}else{
			e._compCtx = compCtxSuffix[e.xcompId];
		}
	}
}

//disable input or component by data-bind
function disable(varName){
	var elements = xdom.getElementsByAttribute('data-bind', varName, true);
	xutil.each(elements, function(item){
		xdom.setAtt(item, "disabled", true);
	});
}

var componentInstances;
function register(jsonComp){
	componentInstances = jsonComp;
}
function startInstances(){
	var compCtxSuffix = {};
	for(var compId in componentInstances){
		var array = xdom.findNodesByProperty('xcompId', compId, false, false);
		for (var i = 0; i < array.length; i++) {
			var e = array[i];
			prepareComponentContext(e, compCtxSuffix, thisM, "");			
		}
	}
	componentInstances = null;
}

_expose(initComponents);
_expose(createComponentConstructors);
_expose(init);
_external(disable);
_external(registerAll);
_expose(prepareComponentContext);
_expose(register);
_expose(startInstances);
