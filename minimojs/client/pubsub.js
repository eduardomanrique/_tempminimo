const listeners = {};

const _getArray = (type, name) => {
    listeners[type] = listeners[type] || {};
    listeners[type][name] = listeners[type][name] || [];
    return listeners[type][name];
}

module.exports = {
    addListener: (type, eventName, listener) => {
        _getArray(type, eventName).push(listener)
    },
    removeListener: (type, eventName, listener) => {
        const array = _getArray(type, eventName)
        if (array) {
            const ind = array.indexOf(listener);
            if (ind >= 0) {
                array.splice(ind, 1);
            }
        }
    },
    emit: (event) => {
        const array = _getArray(event.type, event.name);
        array.forEach(listener => {
            listener(event)
        });
    },
    get SCREEN_EVENT_TYPE() {
        return 'SCREEN_EVENT';
    }
}