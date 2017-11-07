var dynamicAttributes = {};
var dynamicOutAttributes = {};

//update dynamic attributes
function updateElementsAttributeValue(){
    if(m.isImport){
        return;
    }
    var rootEl = _rootElement();
    for (var id in dynamicAttributes) {
        var e = getElementsByAttribute("data-xdynid", id, false, true);
        if(!e || e.length == 0){
            continue;
        }
        e = e[0];
        var atts = dynamicAttributes[id];
        for (var attName in atts){
            var att = atts[attName];
            try{
                var val = [];
                for(var i = 0; i < att.length; i++){
                    var item = att[i];
                    if(item.v){
                        val.push(item.v);
                    }else{
                        val.push(xinputs.execInCorrectContext(e, item.s));
                    }
                }
                val = val.join('');
                if(attName == 'checked'){
                    e.checked = val.toUpperCase() == 'TRUE';
                }else if(attName == 'disabled'){
                    e.disabled = val.toUpperCase() == 'TRUE';
                }else{
                    setAtt(e, attName, val);
                }
            }catch(ex){
                console.error("Error updating attribute " + attName + " of " + (e.getAttribute("id") || e) + ".", ex);
            }
        }
    }
}
