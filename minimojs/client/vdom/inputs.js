const STRING = "string",
    OBJECT = "object",
    INTEGER = "integer",
    FLOAT = "float",
    DATE = "date",
    BOOLEAN = "boolean",
    DATETIME = "datetime",
    TIME = "time",
    OBJECT = "object",
    ANY = "any";

const prepareInputElement = (vdom) => {
    const e = vdom._e;
    const [type, mask, jsValue] = _getMaskAndType(e);
    const validateValue = _createValidateFunction(mask);
    e.addEventListener('keypress', function (e) {
        var c = String.fromCharCode(e.keyCode);
        var futureValue = e.value.substring(0, e.selectionStart) + c + e.value.substring(e.selectionEnd);
        if (!validateValue(futureValue)) {
            e.preventDefault();
        }
    });
    vdom._getValue = () =>  {
        if (jsValue) {
            return vdom.ctx.eval(jsValue);
        }
        let value;
        if (e.nodeName == 'INPUT' || e.nodeName == 'TEXTAREA') {
            if(type == BOOLEAN){
                value = e.type == 'checkbox' ? e.checked : e.value != "";
            }else{
                value = _convert(e.value, type, mask);
            }
        } else if (e.nodeName == 'SELECT') {
            if (e.getAttribute('multiple') == null) {
                value = _convert(_getOptionValue(e.options[e.selectedIndex]), type, mask);
            }else{
                value = [];
                for(let i = 0; i < e.options.length; i++){
                    if(e.options[i].selected){
                        value.push(_convert(_getOptionValue(e.options[i]), type, mask));
                    }
                }
            }
        }
    }
}

const _convert = (value, type, mask) => {
    if(type == ANY){
        return value;
    }else if(type == STRING){
        return value + "";
    }else if(type == INTEGER){
        return parseInt(value);
    }else if(type == FLOAT){
        return parseFloat(value);
    }else if(type == DATE){
        if(!mask){
            let dateComponents = _getFromDateTime(value) || _getFromDate(value) || 
                _getFromMonth(value);

                parei aqui
        }
    }
}

const _getFromDateTime = (value) => {
    var exec = /(\d\d\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(value);
    if(exec){
        return [exec[1], exec[2], exec[3], exec[4], exec[5]];
    }
}

const _getFromDate = (value) => {
    var exec = /(\d\d\d\d)-(\d\d)-(\d\d)/.exec(value);
    if(exec){
        return [exec[1], exec[2], exec[3], null, null];
    }
}

const _getFromTime = (value) => {
    var exec = /(\d\d):(\d\d)/.exec(value);
    if(exec){
        return [null, null, null, exec[1], exec[2]];
    }
}

const _getFromMonth = (value) => {
    var exec = /(\d\d\d\d)-(\d\d)/.exec(value);
    if(exec){
        return [exec[1], exec[2], null, null, null];
    }
}

const _getFromWeek = (value) => {
    var exec = /(\d\d\d\d)-W(\d\d)/.exec(value);
    if(exec){
        return [exec[1], exec[2], null, null, null];
    }
}

const _getOptionValue = (option) => {
    const mValue = _getAttribute(option, "m-value");
    if(mValue){
        return option._vdom.ctx.eval(mValue);
    }
    return option.value || option.text;
}

const _createValidateFunction = (mask) => {
    if (mask && mask.trim()) {
        const regex = new RegExp(mask);
        return (v) => regex.test(v);
    } else {
        return () => true;
    }
}

const _getMask = (e, type) => {
    const isInput = e.nodeName == "INPUT";
    const inputType = (isInput ? e.getAttribute("type") : e.nodeName).toLowerCase();
    let mType = _getAttribute(e, "m-type");
    let mMask = _getAttribute(e, "m-mask");
    let jsValue = _getAttribute(e, "m-value");
    if (mMask && !mType) {
        return [STRING, mMask, jsValue];
    }
    if (!mType) {
        if (inputType == "select" || inputType == "radio") {
            mType = ANY;
        } else if (inputType == "checkbox") {
            mType = BOOLEAN;
        } else if (inputType == "time") {
            mType = TIME;
        } else if (inputType == "datetime-local") {
            mType = DATETIME;
        } else if (inputType == "date" || inputType == "month" || inputType == "week") {
            mType = DATE;
        } else if (inputType == "number") {
            mType = FLOAT;
        } else if (inputType == "range") {
            mType = INTEGER;
        } else if (inputType == "number") {
            mType = FLOAT;
        } else {
            mType = STRING;
        }
    }
    const indexOfMask = mType.indexOf('(');
    if (indexOfMask >= 0) {
        mMask = mType.substring(indexOfMask + 1, mType.length - 1);
        mType = mType.substring(0, indexOfMask);
    }
    return [mType, mMask, jsValue];
}

const _getAttribute = (e, attrib) => e.getAttribute(attrib) || e.getAttribute("data-" + attrib);
/*
any and objects:
  select, multiselect (array), radio
string: 
  text, password, color, date, datetime-local, month, number, range, tel, time, 
  week, textarea
integer: 
  text(with mask), number, range
float: 
  text(with mask), number
date: 
  text(with mask), date(new date(y,m,d)), datetime-local(new date(...)), 
  month (new date(y,m,.)), time(new Date(....h,m,s)), week()
datetime: 
  text(with mask), datetime-local(new date(...))
time:
  text(with mask), time
boolean:
  checkbox
mask: 
  string
*/