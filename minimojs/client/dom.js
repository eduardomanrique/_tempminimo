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

const _findNodes = (element, filter, elementsOnly, firstLevelOnly, findFirst) => {
	const find = el => {
		const child = elementsOnly ? el.childNodes : el.children;
		return child.filter(i => _attr(i, "data-mroot-ctx").isPresent())
			.map(i => {
				const a = [];
				if(filter(i)){
					a.push(i);
				}
				if(!firstLevelOnly && (!findFirst || a.length == 0)){
					a.push(find(item));
				}
				return a;
			});
	}
	return clientUtil.flatten(find(element));
}

const _findChildNodes = (e, filter, firstLevelOnly = false) => _findNodes(e, filter, true, firstLevelOnly, false);

const _findChildren = (e, filter, firstLevelOnly = false) => _findNodes(e, filter, false, firstLevelOnly, false);

const _findFirstChildNode = (e, filter, firstLevelOnly = false) => clientUtil.first(_findNodes(e, filter, true, firstLevelOnly, true));

const _findFirstChild = (e, filter, firstLevelOnly = false) => clientUtil.first(_findNodes(e, filter, false, firstLevelOnly, true));

const _findChildNodesByAttribute = (e, attrName, findFirst, filter) => 
	_findNodes(e, node => {
		const att = _attr(node, attrName);
		return att.isPresent() && filter(att.value);
	}, true, firstLevelOnly, findFirst);

const _findChildNodesByTagName = (e, name, filter, findFirst) => 
	_findNodes(e, node => node.nodeName == name.toUpperCase() && filter(node), true, findFirst);

const _findNodesByProperty = (e, property, filter, findFirst) => 
	_findNodes(e, node => node[property] != null && filter(node[property]), true, findFirst);

const _findInParent = (el, filter = () => true) => {
	if(el != document){
		if(filter(el)){
			return el;
		}else if(el.parentElement){
			return _findInParent(el.parentElement, filter);
		}
	}
	return null;
}

function DOM (minimoInstance, doc = document){
	const m = minimoInstance;
	let _root;
	const _checkElement = (e) => {
		if(!this.isInThisContext(e)){
			throw new Error('Invalid context for element');
		}
		return e;
	}
	const _rootElement = () => {
		if(!_root){
			var elements = _byClass(m.id);
			if(!elements || elements.length == 0){
				if(m.id == "main"){
					_root = document.body;
				}else{
					console.error('XDOM: No root element found!!!');
				}
			}else{
				_root = elements[0];
			}
		}
		//if not found, is the main context
		return _root;
	}
	this.isInThisContext = (element) => {
		if(_attr(element, "data-mroot-ctx").map(v => v != m.id, false)){
			return false;
		} else if(element.parentElement != _rootElement()){
			return this.isInThisContext(element.parentElement);
		}
		return true
	}
	this.setRootElement = (r) => root = r;
	this.getRootElement = () => _rootElement();

	this.getElementById = (id) => _byId(id, doc).optionMap(el => this.isInThisContext(el) ? el : null);

	this.getElementsByName = (name) => _byName(name).filter(el => this.isInThisContext(el));

	this.getElementsByTagNames = (...names) => _findChildren(_rootElement(), i => {
		if(names.find(name => i.nodeName == name)){
			return true;
		}
	});

	this.getElementsByAttribute = (attrName, filter = () => true) => 
		_findChildNodesByAttribute(_rootElement(), attrName, false, filter);
		
	this.findFirstElementByAttribute = (attrName, filter) => 
		_findChildNodesByAttribute(_rootElement(), attrName, true, false);

	this.getInputs = () => this.getElementsByAttribute('onclick')
		.concat(this.getElementsByTagNames('input', 'button', 'select', 'textarea')
			.filter(e => !_attr(e, "onclick").isPresent()));

	this.findNodesByTagName = (element, name, filter) => _findChildNodesByTagName(_rootElement(), filter, false);

	this.findChildNodesByProperty = (el, property, filter) => _findNodesByProperty(_checkElement(el), property, filter);

	this.findFirstIteratorWithNoneStatus = () => 
		_findNodesByProperty(_rootElement(), 'xiteratorStatus', v => 'none');

	this.findParentWithAttribute = (el, attName) => {
		if(el != document){
			if(_attr(el, attName).isPresent()){
				return el;
			}else if(el.parentElement){
				return this.findParentWithAttribute(el.parentElement, attName);
			}
		}
		return null;
	}

	this.findParentWithProperty = (el, name, filter = () => true) => 
		_findPropInParent(el.parentElement, el => el[name] && filter(el[name]));

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