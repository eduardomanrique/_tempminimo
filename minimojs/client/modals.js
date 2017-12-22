const remote = require('./remote');

class Modal {
    constructor(path, parentMinimo, anchorStart, anchorEnd) {
        this._parentMinimo = parentMinimo;
        this._startPromise = remote.htmlPage(path)
        this._as = anchorStart;
        this._ad = anchorEnd;
    }

    show(parameters) {
        return this._startPromise
            .then(js => eval(js)())
            .then(([htmlStruct, controller]) => Minimo.builder()
                .insertPoint(this._as.parentNode)
                .anchorStart(this._as)
                .anchorEnd(this._ae)
                .parent(this._parentMinimo)
                .controller(controller)
                .htmlStruct(htmlStruct)
                .modal(true)
                .build()
                .start(parameters))
            .then(m => this._minimo = m);
    }

    update() {
        if (this._minimo) {
            this._minimo.update(100);
        }
    }
}

module.exports = {
    createModal: (path, parentMinimo, anchorStart, anchorEnd) => {
        const modal = new Modal(path, parentMinimo, anchorStart, anchorEnd);
        return new Proxy(modal, {
            get: (target, name) => {
                if (name in modal) {
                    return modal[name];
                } else if (modal._minimo) {
                    return modal._minimo.controller[name];
                }
            }
        })
    }
}