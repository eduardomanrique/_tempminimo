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
const first = (a) => a && a.length ? a[0] : null;
const nodeListToArray = (nl) => {
    const a = [];
    for (let i = 0; i < nl.length; i++) {
        a.push(nl[i]);
    }
    return a;
};
const toIterable = function* (a) {
    let index = 0;
    while (a.length > index) yield a[index++];
};
const oneline = (s, ...args) => {
    const iter = toIterable(args);
    return s.map(v => v.split('\n').concat(iter.next().value).map(v => `${v || ''}`.trim()).join('')).join('').trim();
};
const tail = a => a.filter((v, i) => i > 0);
module.exports = {
    flatten: flatten,
    nodeListToArray: nodeListToArray,
    toIterable: toIterable,
    oneline: oneline,
    first: first,
    tail: tail
};