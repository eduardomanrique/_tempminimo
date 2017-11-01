const _ = require('underscore');

minimoEvents.onNewPage(() => {
    destroy floating modal instances  
})

let isShowingLoading = false;
const setBlurryBackground = (toggleOn, idPopup, zIndex) => {
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

const highestZIndex = () => {
    const zindexes = [];
    document.getElementsByTagName('*').forEach(e => {
        if(e.style.position && e.style.zIndex) {
            zindexes.push(parseInt(e.style.zIndex));
        };
    });
    return Math.max(...zindexes) + 1;
}

const showLoading = () => {
    if(!isShowingLoading){
        isShowingLoading = true;
        const zIndex = highestZIndex();
        setBlurryBackground(true, 'loading', zIndex);
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

const closeLoading = (before, after) => {
    if(isShowingLoading){
        setTimeout(function(){
            if(before){
                before();
            }
            var dv = _byId("_loading_modal_");
            if(dv){
                dv.parentNode.removeChild(dv);
            }
            setBlurryBackground(false, 'loading');
            isShowingLoading = false;
            if(after){
                after();
            }
        }, 200);
    }
};

const closeInitLoad = function(){
    var tempLoadDiv = _byId("_xtemploaddiv_");
    tempLoadDiv.remove();
}

const _modalProperties = {};
const _currentModalResource;

const setModalResource = (res) => _currentModalResource = res;

const setModalInfo = (json) => {
    _modalProperties[_currentModalResource] = {};
    _.values(json.a).forEach(att => 
        _modalProperties[_currentModalResource][k] = att.map(a => a.v).join(''));
}

module.exports = {
    showLoading: showLoading,
    closeLoading: closeLoading,
    closeInitLoad: closeInitLoad,
    setModalResource: setModalResource,
    setModalInfo: setModalInfo
}