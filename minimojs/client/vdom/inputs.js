const STRING = "string",
    OBJECT = "object",
    INTEGER = "integer",
    FLOAT = "float",
    DATE = "date",
    BOOLEAN = "boolean",
    DATETIME = "datetime",
    TIME = "time",
    ANY = "any";

const prepareInputElement = (vdom) => {
    const e = vdom._e;
    const f = _buildFunctions(e, vdom.ctx);

    e.addEventListener('keypress', function (event) {
        var c = String.fromCharCode(event.keyCode);
        var futureValue = e.value.substring(0, e.selectionStart) + c + e.value.substring(e.selectionEnd);
        if (!f.partialValidate(c, futureValue)) {
            event.preventDefault();
        }
    });
    e.addEventListener('change', function () {
        if (!f.validate(this.value)) {
            this.value = "";
        }
    });
    vdom._getValue = () => f.extract();
    vdom._setValue = (v) => f.update(v);
}

const _getOptionElementValue = (e, ctx) => {
    if (!e._extractorFunction) {
        e._extractorFunction = _buildFunctions(e, ctx).extract;
        e._type = _getAttribute(e, 'm-type');
        if (e._type) {
            e._type = e._type.split("(")[0];
        }
    }
    return e._extractorFunction();
}

const _compareOptionValue = (option, comp, ctx) => {
    let val = _getOptionElementValue(option, ctx);
    if (option._type == DATE) {
        return val instanceof Date && comp instanceof Date &&
            val.getFullYear() == comp.getFullYear() &&
            val.getMonth() == comp.getMonth() &&
            val.getDate() == comp.getDate();
    } else if (option._type == DATETIME) {
        return val instanceof Date && comp instanceof Date &&
            val.getFullYear() == comp.getFullYear() &&
            val.getMonth() == comp.getMonth() &&
            val.getDate() == comp.getDate() &&
            val.getHours() == comp.getHours() &&
            val.getMinutes() == comp.getMinutes();
    } else if (option._type == TIME) {
        return val instanceof Date && comp instanceof Date &&
            val.getHours() == comp.getHours() &&
            val.getMinutes() == comp.getMinutes();
    } else {
        return val === comp;
    }
}

const _getRawSetterAndGetter = (e, inputType, ctx) => {
    if (inputType == 'select') {
        if (e.getAttribute('multiple') == null) {
            return {
                _get: () => _getOptionElementValue(e.options[e.selectedIndex], ctx),
                _set: (v) => {
                    for (let i = 0; i < e.options.length; i++) {
                        if (_compareOptionValue(e.options[i], v, ctx)) {
                            e.selectedIndex = i;
                            break;
                        }
                    }
                }
            };
        } else {
            return {
                _get: () => {
                    values = [];
                    for (let i = 0; i < e.options.length; i++) {
                        if (e.options[i].selected) {
                            values.push(_getOptionElementValue(e.options[i], ctx));
                        }
                    }
                    return values;
                },
                _set: (a) => {
                    for (let i = 0; i < e.options.length; i++) {
                        e.options[i].selected = false;
                        for (let j = 0; j < a.length; j++) {
                            if (_compareOptionValue(e.options[i], a[j], ctx)) {
                                e.options[i].selected = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
    } else if (inputType == 'checkbox') {
        return {
            _get: () => e.checked,
            _set: (v) => e.checked = v == 'true'
        }
    } else if (inputType == 'option') {
        return {
            _get: () => e.value || e.text,
            _set: (v) => {}
        }
    } else {
        return {
            _get: () => e.value,
            _set: (v) => e.value = v
        }
    }
}

const _getTypeAndMask = (e, inputType) => {
    let type = _getAttribute(e, "m-type");
    let mask;
    if (!type) {
        if (inputType == "select" || inputType == "radio") {
            type = ANY;
        } else if (inputType == "checkbox") {
            type = BOOLEAN;
        } else if (inputType == "time") {
            type = TIME;
        } else if (inputType == "datetime-local") {
            type = DATETIME;
        } else if (inputType == "date" || inputType == "month") { //|| inputType == "week"
            type = DATE;
        } else if (inputType == "number") {
            type = FLOAT;
        } else if (inputType == "range") {
            type = INTEGER;
        } else {
            type = STRING;
        }
    }
    if (!mask) {
        if (type == BOOLEAN) {
            mask = "true,false";
        } else if (type == TIME) {
            mask = 'HH:mm';
        } else if (type == DATETIME) {
            mask = 'yyyy-MM-ddTHH:mm';
        } else if (type == DATE) { //|| type == "week"
            mask = 'yyyy-MM-dd';
        } else if (type == FLOAT) {
            mask = '.00';
        } else {
            mask = "";
        }
    }
    const indexOfMask = type.indexOf('(');
    if (indexOfMask >= 0) {
        mask = type.substring(indexOfMask + 1, type.length - 1);
        type = type.substring(0, indexOfMask);
    }
    return [type, mask];
}

const _buildFunctions = (e, ctx) => {
    if (_getAttribute(e, "m-type") == OBJECT) { //read only
        const jsValue = _getAttribute(e, "value");
        return {
            partialValidate: () => true,
            validate: () => true,
            extract: () => ctx.eval(jsValue),
            update: () => {}
        }
    }
    const inputType = (e.nodeName == "INPUT" ? e.getAttribute("type") : e.nodeName).toLowerCase();

    let accessors = _getRawSetterAndGetter(e, inputType, ctx);
    let [type, mask] = _getTypeAndMask(e, inputType);

    if (type == TIME) {
        return _buildTimeFunctions(mask, accessors);
    } else if (type == DATE) {
        return _buildDateFunctions(mask, accessors);
    } else if (type == DATETIME) {
        return _buildDateTimeFunctions(mask, accessors);
    } else if (type == INTEGER) {
        return _buildIntegerFunction(mask, accessors);
    } else if (type == FLOAT) {
        return _buildFloatFunction(mask, accessors)
    } else if (type == BOOLEAN) {
        return _buildBooleanFunction(mask, accessors);
    } else if (type == ANY) {
        return _buildAnyFunction(mask, accessors);
    } else if (type == STRING) {
        return _buildStringFunction(mask, accessors);
    }
}

const _setGroupOrder = (mask, ...patterns) => patterns
    .map(p => [p, mask.indexOf(p)])
    .sort((a, b) => a[1] - b[1])
    .map(i => i[0]);

const _buildStringFunction = (mask, accessors) => new function () {
    let regex = new RegExp(mask);
    this.partialValidate = () => true;
    this.validate = (v) => regex.test(v);
    this.extract = () => accessors._get();
    this.update = (v) => accessors._set(v);
}

const _buildAnyFunction = (mask, accessors) => {
    return {
        partialValidate: () => true,
        validate: () => true,
        extract: () => accessors._get(),
        update: (v) => accessors._set(v)
    }
}

const _buildIntegerFunction = (mask, accessors) => new function () {
    this.validate = (v) => /^\d*$/.test(v);
    this.partialValidate = (c, value) => /\d/.test(c);
    this.extract = () => parseInt(accessors._get() || 0);
    this.update = (i) => accessors._set(i);
}

const _buildFloatFunction = (mask, accessors) => new function () {
    let decimalSep = mask[0] == '.' ? '.' : ',';
    let regex = new RegExp(`^\\d*${mask[0] == '.' ? '\\.' : ','}?\\d{0,${mask.length-1}}$`);
    let partialRegex = new RegExp(`^(\\d|${mask[0] == '.' ? '\\.' : ','})$`);
    this.validate = (v) => regex.test(v);
    this.partialValidate = (c, value) => partialRegex.test(c) && regex.test(value);
    this.extract = () => parseFloat(accessors._get().replace(decimalSep, '.') || 0);
    this.update = (i) => accessors._set((i + "").replace('.', decimalSep));
}

const _buildBooleanFunction = (mask, accessors) => new function () {
    const [t, f] = (mask || "true,false").split(',').map(v => v.trim());
    this.validate = (v) => v.trim() == t || v.trim() == f;
    this.partialValidate = (c, value) => t.startsWith(value) || f.startsWith(value);
    this.extract = () => {
        let v = accessors._get();
        return typeof (v) == "string" ? v == t : v;
    }
    this.update = (v) => accessors._set(v ? t : f);
}

const _buildTimeFunctions = (mask, accessors) => new function () {
    let order = _setGroupOrder(mask, 'HH', 'mm');
    let regexMask = mask.replace('HH', '(\\d{2})').replace('mm', '(\\d{2})');
    let unmasked = mask.replace('HH', '00').replace('mm', '00');
    let regex = new RegExp(`^${regexMask}$`);
    this.validate = (v) => regex.test(v);
    this.partialValidate = (c, value) => unmasked.startsWith(value.replace(/\d/g, '0'));
    this.extract = () => {
        let v = accessors._get();
        if (!v) {
            return unmasked;
        }
        let exec = regex.exec(v);
        let date;
        if (exec) {
            date = new Date();
            date.setHours(parseInt(exec[order.indexOf('HH') + 1]));
            date.setMinutes(parseInt(exec[order.indexOf('mm') + 1]));
        }
        return date;
    };
    this.update = () =>
        accessors._set(mask.replace('HH', _pad(d.getHours(), 2)).replace('mm', _pad(d.getMinutes(), 2)));
}

const _buildDateTimeFunctions = (mask, accessors) => new function () {
    let order = _setGroupOrder(mask, 'yyyy', 'MM', 'dd', 'HH', 'mm');
    let regexMask = mask.replace('yyyy', '(\\d{4})').replace('MM', '(\\d{2})')
        .replace('dd', '(\\d{2})').replace('HH', '(\\d{2})')
        .replace('mm', '(\\d{2})');
    let unmasked = mask.replace('yyyy', '0000').replace('MM', '00').replace('dd', '00')
        .replace('HH', '00').replace('mm', '00');
    let regex = new RegExp(`^${regexMask}$`);
    this.validate = (v) => regex.test(v);
    this.partialValidate = (c, value) => unmasked.startsWith(value.replace(/\d/g, '0'));
    this.extract = () => {
        let v = accessors._get();
        if (!v) {
            return unmasked;
        }
        let exec = regex.exec(v);
        let date;
        if (exec) {
            date = new Date();
            date.setFullYear(parseInt(exec[order.indexOf('yyyy') + 1]));
            date.setMonth(parseInt(exec[order.indexOf('MM') + 1] - 1));
            date.setDate(parseInt(exec[order.indexOf('dd') + 1]));
            date.setHours(parseInt(exec[order.indexOf('HH') + 1]));
            date.setMinutes(parseInt(exec[order.indexOf('mm') + 1]));
        }
        return date;
    };
    this.update = (d) =>
        accessors._set(mask.replace('yyyy', _pad(d.getFullYear(), 4)).replace('MM', _pad(d.getMonth() + 1, 2))
            .replace('dd', _pad(d.getDate(), 2)).replace('HH', _pad(d.getHours(), 2))
            .replace('mm', _pad(d.getMinutes(), 2)));
}

const _buildDateFunctions = (mask, accessors) => new function () {
    let order = _setGroupOrder(mask, 'yyyy', 'MM', 'dd');
    let regexMask = mask.replace('yyyy', '(\\d{4})').replace('MM', '(\\d{2})')
        .replace('dd', '(\\d{2})');
    let unmasked = mask.replace('yyyy', '0000').replace('MM', '00').replace('dd', '00');
    let regex = new RegExp(`^${regexMask}$`);
    this.validate = (v) => regex.test(v);
    this.partialValidate = (c, value) => unmasked.startsWith(value.replace(/\d/g, '0'));
    this.extract = () => {
        let v = accessors._get();
        if (!v) {
            return unmasked;
        }
        let exec = regex.exec(v);
        let date;
        if (exec) {
            date = new Date();
            date.setFullYear(parseInt(exec[order.indexOf('yyyy') + 1]));
            date.setMonth(parseInt(exec[order.indexOf('MM') + 1]) - 1);
            date.setDate(parseInt(exec[order.indexOf('dd') + 1]));
        }
        return date;
    };
    this.update = (d) =>
        accessors._set(mask.replace('yyyy', _pad(d.getFullYear(), 4)).replace('MM', _pad(d.getMonth() + 1, 2))
            .replace('dd', _pad(d.getDate(), 2)));
}

const _pad = (value, size) => {
    let v = value + "";
    while (v.length < size) {
        v = '0' + v;
    }
    return v;
}

const _getAttribute = (e, attrib) => e.getAttribute(attrib) || e.getAttribute("data-" + attrib);

module.exports = {
    prepareInputElement: prepareInputElement,
    _test: {
        _buildFunctions: _buildFunctions
    }
}