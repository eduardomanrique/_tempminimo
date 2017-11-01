const byId = (id, _doc = document) => _doc.getElementById(id);
const flatten = (a) => {
    let r = [];
    a.forEach(i => {
        if (i instanceof Array) {
            r = r.concat(flatten(i));
        } else {
            r.push(i);
        }
    });
    return r;
};
const nodeListToArray = (nl) => {
    const a = [];
    for (let i = 0; i < nl.length; i++) {
        a.push(nl[i]);
    }
    return a;
};
const byClass = (classes, _doc = document) => flatten(classes.split(' ')
    .map(c => nodeListToArray(_doc.getElementsByClassName(c))));
const byName = (name, _doc = document) => nodeListToArray(_doc.getElementsByName(name));
const toIterable = function* (a) {
    let index = 0;
    while (a.length > index) yield a[index++];
};
const oneline = (s, ...args) => {
    const iter = toIterable(args);
    return s.map(v => v.split('\n').concat(iter.next().value).map(v => `${v || ''}`.trim()).join('')).join('').trim();
};
const query = (query, _doc = document) => nodeListToArray(_doc.querySelectorAll(query));
module.exports = {
    byId: byId,
    flatten: flatten,
    nodeListToArray: nodeListToArray,
    byClass: byClass,
    byName: byName,
    toIterable: toIterable,
    oneline: oneline,
    query: query
};