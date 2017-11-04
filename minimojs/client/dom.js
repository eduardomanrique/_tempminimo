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
	constructor(minimoInstance, rootElement, doc = document){
		const m = minimoInstance;
		const _root = rootElement;
		this._root = _root;
		this._root._minimoInstance = this;

		const _checkElement = (e) => {
			if(e !== _root && !this.isInThisContext(e)){
				throw new Error('Invalid context for element');
			}
			return e;
		}
		this.isInThisContext = (element) => {
			if(!element._minimoInstance && element.parentElement){
				if(element.parentElement === _root){
					return true;
				} else if(element.parentElement){
					return this.isInThisContext(element.parentElement);
				}
			}
			return false;
		}

		const _findNodes = (element, filter, elementsOnly, firstLevelOnly, findFirst) => {
			const a = [];
			const find = el => {
				const nodeList = elementsOnly ? el.childNodes : el.children;
				for(var i = 0; i < nodeList.length; i++){
					let item = nodeList[i];
					if(!item._minimoInstance){
						if(filter(item)){
							a.push(item);
						}
						if(!firstLevelOnly && (!findFirst || a.length == 0)){
							find(item);
						}
					}
				}
			}
			find(_checkElement(element));
			return a;
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
		
		const _findInParent = (element, filter) => {
			const find = (el) => { 
				if(el != document && !el._minimoInstance){
					if(filter(el)){
						return el;
					}else if(el.parentElement){
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
			return _findChildren(_root, i => {
				if(uNames.find(name => i.nodeName == name)){
					return true;
				}
			});
		}
	
		this.getElementsByAttribute = (attrName, filter = () => true) => 
			_findChildNodesByAttribute(_root, attrName, false, filter);
			
		this.findFirstElementByAttribute = (attrName, filter) => 
			_findChildNodesByAttribute(_root, attrName, true, false);
	
		this.getInputs = () => this.getElementsByAttribute('onclick')
			.concat(this.getElementsByTagNames('input', 'button', 'select', 'textarea')
				.filter(e => !_attr(e, "onclick").isPresent()));
	
		this.findNodesByTagName = (element, name, filter) => _findChildNodesByTagName(_root, filter, false);
	
		this.findChildNodesByProperty = (el, property, filter) => _findNodesByProperty(_checkElement(el), property, filter);
	
		this.findFirstIteratorWithNoneStatus = () => 
			_findNodesByProperty(_root, 'xiteratorStatus', v => 'none');
	
		this.findParentWithAttribute = (el, attName, filter = () => true) => _findInParent(el, e => _attr(e, attName).map(v => filter(v)));
	
		this.findParentWithProperty = (el, name, filter = () => true) => _findInParent(el, el => el[name] && filter(el[name]));
	}
	get rootElement() {
		return this._root;
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