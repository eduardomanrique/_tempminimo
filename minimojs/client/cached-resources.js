const _requiredUsed = [];
const _messages = {};

module.exports = {
    get: (type, key) => ((_messages[type]||{})[key]||[]).shift();
    put: (type, key, value) => {
        _messages[type] = _messages[type] || {};
        _messages[type][key] = _messages[type][key] || [];
        _messages[type][key].push(value);
    },
    alreadyRequired: (src) => {
        if (_requiredUsed.indexOf(src) < 0) {
            _requiredUsed.push(src);
            return false;
        }
        return true;
    }
};