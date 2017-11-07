const util = require('../util.js');
const clientUtil = require('./util.js');

const _attr = (el, name) => util.nullableOption(el && el.getAttribute ? el.getAttribute(name) : null);

const _insertBefore = (parent, e, beforeElement) => {
	(parent._iteratorOpenNode ? parent.parentElement : parent).insertBefore(e, beforeElement);
}

const _byId = (id, _doc = document) => util.nullableOption(_doc.getElementById(id));
const _byClass = (classes, _doc = document) => clientUtil.flatten(classes.split(' ')
	.map(c => clientUtil.nodeListToArray(_doc.getElementsByClassName(c))));
const _byName = (name, _doc = document) => clientUtil.nodeListToArray(_doc.getElementsByName(name));
const _query = (query, _doc = document) => clientUtil.nodeListToArray(_doc.querySelectorAll(query));

const _removeClass = (element, className) => _attr(element, "class").ifPresent(classes =>
	element.setAttribute("class", classes.split(" ").filter(c => c != className).join(' ')));

const _addClass = (element, className) =>
	element.setAttribute("class", `${_attr(element, "class").map(v => `${v} `, '')} ${className}`);

const _getInstanceId = (element) => {
	return element._mid;
}

class DOM {
	constructor(minimoInstance, rootElement, doc = document) {
		const m = minimoInstance;
		const _root = rootElement;
		this._doc = doc;
		this._root = _root;
		this._root._minimoInstance = this;
		this._elementsListener = [];

		const _checkElement = (element) => {
			const e = util.getValue(element);
			if (e !== _root && !this.isInThisContext(e)) {
				throw new Error('Invalid context for element');
			}
			return e;
		}
		this.isInThisContext = (element) => {
			if (!element._minimoInstance && element.parentElement) {
				if (element.parentElement === _root) {
					return true;
				} else if (element.parentElement) {
					return this.isInThisContext(element.parentElement);
				}
			}
			return false;
		}
		const _findNodes = (element, filter, elementsOnly, firstLevelOnly, findFirst) => {
			const a = [];
			const find = el => {
				if (findFirst && a.length) return;
				const nodeList = elementsOnly ? el.children : el.childNodes;
				for (var i = 0; i < nodeList.length; i++) {
					let item = nodeList[i];
					if (!item._minimoInstance) {
						if (filter(item)) {
							a.push(item);
						}
						if (!firstLevelOnly) {
							find(item);
						}
					}
					if (findFirst && a.length) return;
				}
			}
			find(_checkElement(element));
			return a;
		}

		const _findChildNodes = (e, filter, firstLevelOnly = false) => _findNodes(e, filter, true, firstLevelOnly, false);

		const _findChildren = (e, filter, firstLevelOnly = false) => _findNodes(e, filter, false, firstLevelOnly, false);

		const _findFirstChildNode = (e, filter, firstLevelOnly = false) => clientUtil.first(_findNodes(e, filter, true, firstLevelOnly, true))[0];

		const _findFirstChild = (e, filter, firstLevelOnly = false) => clientUtil.first(_findNodes(e, filter, false, firstLevelOnly, true))[0];

		const _findChildNodesByAttribute = (e, attrName, findFirst, filter) =>
			_findNodes(e, node => {
				const att = _attr(node, attrName);
				return att.isPresent() && filter(att.value);
			}, true, false, findFirst);

		const _findChildNodesByTagName = (e, name, filter, findFirst) =>
			_findNodes(e, node => node.nodeName == name.toUpperCase() && filter(node), true, findFirst);

		const _findNodesByProperty = (e, property, filter, findFirst) =>
			_findNodes(e, node => node[property] != null && filter(node[property]), true, findFirst);

		const _findInParent = (element, filter) => {
			const find = (el) => {
				if (el != doc && !el._minimoInstance) {
					if (filter(el)) {
						return el;
					} else if (el.parentElement) {
						return find(el.parentElement);
					}
				}
				return null;
			}
			_checkElement(element);
			return find(element.parentElement);
		}
		this.getElementById = (id) => _byId(id, doc).optionMap(el => this.isInThisContext(el) ? el : null);

		this.getElementsByName = (name) => _byName(name).filter(el => this.isInThisContext(el));

		this.getElementsByTagNames = (...names) => {
			let uNames = names.map(n => n.toUpperCase());
			return _findChildNodes(_root, i => {
				if (uNames.find(name => i.nodeName == name)) {
					return true;
				}
			});
		}

		this.getElementsByAttribute = (attrName, filter = () => true) =>
			_findChildNodesByAttribute(_root, attrName, false, filter);

		this.findFirstElementByAttribute = (attrName, filter = () => true) =>
			_findChildNodesByAttribute(_root, attrName, true, filter)[0];

		this.getElementsByProperty = (property, filter = () => true) =>
			_findNodesByProperty(_root, property, filter, true);

		this.findFirstElementByProperty = (property, filter = () => true) =>
			_findNodesByProperty(_root, property, filter, false)[0];

		this.getInputs = () => this.getElementsByAttribute('onclick')
			.concat(this.getElementsByTagNames('input', 'button', 'select', 'textarea')
				.filter(e => !_attr(e, "onclick").isPresent()));

		this.findChildNodesByTagName = (element, name, filter = () => true) => _findChildNodesByTagName(element || _root, name, filter, false);

		this.findChildNodesByAttribute = (el, attribute, filter = () => true) => _findChildNodesByAttribute(el ? _checkElement(el) : _root, attribute, false, filter);

		this.findChildNodesByProperty = (el, property, filter = () => true) => _findNodesByProperty(el ? _checkElement(el) : _root, property, filter);

		this.findParentWithAttribute = (el, attName, filter = () => true) => _findInParent(el, e => _attr(e, attName).map(v => filter(v)));

		this.findParentWithProperty = (el, name, filter = () => true) => _findInParent(el, el => el[name] && filter(el[name]));
	}
	get rootElement() {
		return this._root;
	}
	addListener(...listeners) {
		listeners.forEach(l => this._elementsListener.push(l));
	}
	createTextNode(insertPoint, text, isScript) {
		if (isScript) {
			insertPoint.innerHTML = text;
			this._elementsListener.forEach(l => l.onCreateScript && l.onCreateScript(text));
		} else {
			const textNode = this._doc.createTextNode(text);
			insertPoint.appendChild(textNode);
			this._elementsListener.forEach(l => l.onCreateText && l.onCreateText(textNode));
		}
	}
	createElement(name) {
		const el = this._doc.createElement(name);
		el._byminimo = true;
		const lName = name.toLowerCase();
		if (['input', 'button', 'select', 'textarea'].indexOf(lName) >= 0) {
			this._elementsListener.forEach(l => l.onCreateInput && l.onCreateInput(el));
		} else if (lName == 'mscript') {
			this._elementsListener.forEach(l => l.onCreateMScript && l.onCreateMScript(el));
		} else if (lName == 'a') {
			this._elementsListener.forEach(l => l.onCreateLink && l.onCreateLink(el));
		} else {
			this._elementsListener.forEach(l => l.onCreateElement && l.onCreateElement(el));
		}
		return el;
	}
	setAttribute(el, ...attNameValueList) {
		for (let i = 0; i < attNameValueList.length; i++) {
			const attName = attNameValueList[i++];
			const attValue = attNameValueList[i];
			el.setAttribute(attName, attValue);
			if (attName.indexOf('on') == 0) {
				this._elementsListener.forEach(l => l.onNewEvent && l.onNewEvent(e, attName.substring(2).toLowerCase()));
			} else if (attName == 'data-bind') {
				this._elementsListener.forEach(l => l.onNewBind && l.onNewBind(e));
			}
		}
	}
}

module.exports = {
	byId: _byId,
	byClass: _byClass,
	byName: _byName,
	query: _query,
	DOM: DOM,
	removeClass: _removeClass,
	addClass: _addClass
}