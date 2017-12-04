const util = require('./util.js');
const mutation = require('./mutation-manager.js');
const modals = require('./modals.js');
const minimoEvents = require('./minimo-events.js');
const instances = require('./instances-manager.js');

window.Mimimo$ = window.Mimimo$ || (function(){
	alreadyRequired implementar para checar se um required source ja foi requerido
	//fazer aqui a chamada para obter o recurso js remoto

	const _pushState = (url, skipUpdateState = false) => {
        events.startPageChange();
        var current = _parseUrl(lastUrl);
        var goto = _parseUrl(url);
        if(!goto.tpl || !current.tpl || goto.tpl != current.tpl){
            //incompatible window (not the same tamplate, or no template at all)
            window.location = goto.path + goto.query;
        }else{
            var tempNode = document.createElement('div');
            if(!skipUpdateState){
                var newPath = goto.path + goto.query;
                window._minimo_last_url = window._minimo_href_current_location;
                window._minimo_href_current_location = window.location.toString();
            }
            var obj = {url: goto.path, toggle: true, el: tempNode, isSpa: true};

            modal(obj).then(() => {
                while (spaNode.firstChild) {
                    spaNode.removeChild(spaNode.firstChild);
                }
                while (tempNode.childNodes.length > 0) {
                    spaNode.appendChild(tempNode.childNodes[0]);
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