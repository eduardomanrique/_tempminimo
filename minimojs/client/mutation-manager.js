let newNodes = [];
//check if the added nodes already have parent
const _checkAddedNodes = () => {
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

let _scheduledRefreshNodes = false;
const _scheduleRefreshNodes = () => {
    if(!_scheduledRefreshNodes){
        _scheduledRefreshNodes = true;
        setTimeout(() => {
            _checkAddedNodes();
            _scheduledRefreshNodes = false;
            if(newNodes.length){
                scheduleRefreshNodes();
            }
        },100);
    }
}

const startMutationObserver = function(){
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
                findMinimoInstanceForElement(mutation.target)._fireEvent('mutate', mutation.target, {
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

module.exports = {
    startMutationObserver: startMutationObserver
};