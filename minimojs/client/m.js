const util = require('./util.js');
const mutation = require('./mutation-manager.js');
const modals = require('./modals.js');
const minimoEvents = require('./minimo-events.js');
const instances = require('./instances-manager.js');

window.Mimimo$ = window.Mimimo$ || (function(){
	alreadyRequired implementar para checar se um required source ja foi requerido
	//fazer aqui a chamada para obter o recurso js remoto
	this.startMainInstance = instances.startMainInstance;
	this.startSpaInstance = (...param) => instances.startSpaInstance(...param)
		.then(() => instances.allReady())
		.then(startMutationObserver);
})();

/*
dom.addlisterner
	onCreateScript //nada por enquanto
	onCreateText //nada por enquanto

	onCreateInput
	xobj.addInput(el);
	
	onCreateMScript
	xobj.addMScript(el);
	
	onCreateLink
	xobj.addA(el);

	onCreateElement //nada por enquanto
*/
/*
htmlbuilder add listener
	onNewEvent
	xinputs.configureEvent(attName.substring(2), el);

	onNewBind
	xobj.addBind(el);
*/
/*
$.holdReady(false);
*/
/*

 _createHTML(json, insertPoint, index, function () {
                onFinish();
                try {
                    xobj.updateInputs();
                    xobj.updateAllObjects();
                } catch (e) {
                    console.error("xstartup", "XObj starting objects");
                    throw e;
                }
			});
			*/
window.applicationCache.addEventListener('updateready', function(){
    location.reload();
}, false);