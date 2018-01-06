const listeners = {};

const _getArray = (type, name) =>  ((listeners[type] = listeners[type] || {})[name] = listeners[name] || []);

module.exports = {
    addListener: (type, eventName, listener) => _getArray(type, name).push(listeners),
    removeListener: (type, eventName, listener) => {
        const array = _getArray(type, eventName)
        if (array) {
            const ind = array.indexOf(listener);
            if (ind >= 0) {
                array.splice(ind, 1);
            }
        }
    },
    emit: (event) => _getArray(event.type, event.name).forEach(listener => listener(event))
}