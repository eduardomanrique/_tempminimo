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
            .then(js => eval(js))
            .then(([htmlStruct, controller]) => Minimo.builder()
                .withInsertPoint(this._as.parentNode)
                .withAnchorStart(this._as)
                .withAnchorEnd(this._ae)
                .withParent(this._parentMinimo)
                .withController(controller)
                .withHtmlStruct(htmlStruct)
                .withModal(true)
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