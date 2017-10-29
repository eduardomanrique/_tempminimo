//all functions to be called on screen is ready
var execWhenReady = [];
var calledReady = false;
//this method is written on server
function _addExecuteWhenReady(fn){
	if(fn){
		execWhenReady.push(fn);		
	}
}

function setModal(){
    thisM._loaded = true;
}

//private method executed on screen is ready
function ready() {
	if(calledReady){
		return;
	}
	thisM.debug("xstartup", "READY function");
	calledReady = true;
	thisM._loaded = true;
	xdefaultservices.init();
	var isRemote = %is_remote%;
	if(!isRemote){
		thisM.debug("xstartup", "COMPONENTS Init..");
		thisM.debug("xstartup", "Default Services Init..");
		xutil.each(execWhenReady, function(item){
			thisM.debug("xstartup", "Exec execWhenReady " + item);
			item();
		});
	}
	if(!M$._startedMutationObserver){
	    M$._startedMutationObserver = true;
	    M$._startMutationObserver();
	}
	thisM.debug("xstartup", "READY done");
}

//onunload event
function onUnloadCall(){
	var onExit;
	try{
		onExit = thisM.eval('onExit');	
	}catch(e){}
	if(onExit){
		return onExit();
	}
}

//method called when m instantiation is finished
function onStart(){
	thisM.debug("xstartup", "onStart");
	if ( document.addEventListener ) {
		document.addEventListener( "DOMContentLoaded", function(){
			document.removeEventListener( "DOMContentLoaded", arguments.callee, false );
			ready();
		}, false );
	} else if ( document.attachEvent ) {
		document.attachEvent("onreadystatechange", function(){
			if ( document.readyState === "complete" ) {
				document.detachEvent( "onreadystatechange", arguments.callee );
				ready();
			}
		});
		if ( document.documentElement.doScroll && window == window.top ) (function(){
			try {
				document.documentElement.doScroll("left");
			} catch( error ) {
				setTimeout( arguments.callee, 0 );
				return;
			}
			ready();
		})();
	}
	if ( window.addEventListener ) {
		window.addEventListener( "load", function(){
			ready();
		}, false );
	} else if ( window.attachEvent ) {
		window.attachEvent("onload", function(){
			ready();
		});
	}
	window.onbeforeunload = onUnloadCall;
	thisM.debug("xstartup", "onStart done");
}

_expose(onStart);
_external(_addExecuteWhenReady);
_expose(setModal);