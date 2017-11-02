const util = require('./util.js');
const mutation = require('./mutation-manager.js');
const modals = require('./modals.js');
const minimoEvents = require('./minimo-events.js');
const instances = require('./instances-manager.js');

window.Mimimo$ = window.Mimimo$ || (function(){
	//fazer aqui a chamada para obter o recurso js remoto
	this.startMainInstance = instances.startMainInstance;
	this.startSpaInstance = (...param) => instances.startSpaInstance(...param)
		.then(() => instances.allReady())
		.then(startMutationObserver);
})();

window.applicationCache.addEventListener('updateready', function(){
    location.reload();
}, false);