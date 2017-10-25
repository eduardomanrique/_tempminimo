const _ = require('underscore');
const esprima = require('esprima');
const context = require('./context');
const util = require('./util');

const _prepareXScriptsValues = (value) => {
  let last = value;
  if (value != null) {
    let pattern = /\$\{(?:(?!\$\{|}).)*}/g;
    let matcher;
    while ((matcher = pattern.exec(last)) != null) {
      let js = matcher[0];
      let jsok = js.substring(2, js.length - 1).replace(/"/g, "&quot;");
      last = `${value.substring(0, matcher.index)}<xscr scr="${jsok}"></xscr>${value.substring(matcher.index + js.length)}`;
    }
  }
  return last;
}

const _str = (sb) => {
  return sb.join('');
}

const _clearObj = obj => _.omit(obj, v => _.isNull(v) || _.isEmpty(v));

const _getAllTextNodes = (element) =>
  _.flatten(element.children.map(e => {
    let list = [];
    if (e instanceof Element) {
      list.push(_getAllTextNodes(e));
    } else if (e instanceof Text) {
      list.push(e);
    }
    return list;
  }));

const _generateId = (prefix) => (prefix || "id_") + parseInt(Math.random() * 999999);

const _isEmptyText = (node) => node instanceof Text && !(node instanceof Comment) && node.text.trim() == '';

const _eqIgnoreCase = (s1, s2) => s1.toUpperCase() == s2.toUpperCase();

const _validateJS = (js) => {
  try {
    esprima.parse(js.replace(/"/g, '\\"'));
    return true;
  } catch (e) {
    return false;
  }
}

class Node {
  constructor() {
    this._buffer = [];
    this._hiddenAttributes = {};
    this._tempAttributes = {};
  }
  getNext() {
    let index = this.parent.children.indexOf(this);
    if (index == this.parent.children.length - 1) {
      return null;
    }
    return this.parent.children[index + 1];
  }
  getPrevious() {
    let index = this.parent.children.indexOf(this);
    if (index == 0) {
      return null;
    }
    return this.parent.children[index - 1];
  }
  addAfter(node) {
    let index = this.parent.children.indexOf(this);
    if (index == this.parent.children.length - 1) {
      this.parent.addChild(node);
    } else {
      this.parent.insertChild(node, index + 1);
    }
  }
  addBefore(node) {
    let index = this.parent.children.indexOf(this);
    if (index == 0) {
      this.parent.insertChild(node, 0);
    } else {
      this.parent.insertChild(node, index);
    }
  }
  get parent() {
    return this._parent;
  }
  set parent(parent) {
    this._parent = parent;
  }
  addChar(c) {
    this._buffer.push(c);
  }
  addString(s) {
    this._buffer.push(s);
  }
  toString() {
    return _str(this._buffer);
  }
  remove() {
    let index = this.parent.children.indexOf(this);
    this.parent.children.splice(index, 1);
    this._parent = null;
  }
  setHiddenAttribute(attrName, val) {
    if (_.has(this._hiddenAttributes, attrName) == null) {
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.substring(1, val.length - 1);
      }
      this._hiddenAttributes[attrName] = val;
    }
  }
  getHiddenAttribute(attrName) {
    return this._hiddenAttributes[attrName];
  }
  hasHiddenAttributes() {
    return _.keys(this._hiddenAttributes).length > 0;
  }
  getTempAttribute(name) {
    return this._tempAttributes[name];
  }
  setTempAttribute(name, value) {
    this._tempAttributes[name] = value;
  }
}

class Attribute {
  constructor(name, value) {
    this._name = name.toLowerCase().trim().replace(/\n/g, "");
    this.value = value;
  }
  get value() {
    return this._value;
  }
  get stringValue() {
    return _str((this._value || []).map(i => _.isString(i) ? i : `\${${i.s}}`));
  }
  set value(attributeValue) {
    let deliminitator = '"';
    let value = attributeValue;
    if (value) {
      value = value.trim();
      if (value.startsWith("\"") || value.startsWith("'")) {
        deliminitator = value.charAt(0);
        value = value.substring(1, value.length - 1);
      }
      value = deliminitator == '"' ? value.replace(/\\"/g, '"') : value.replace(/\\'/g, "'");
      //parse inner scripts
      this._value = [];
      let index = 0;
      let pattern = /\$\{(.*?)}/g;
      let m;
      while ((m = pattern.exec(value)) != null) {
        if (index != m.index) {
          this._value.push(value.substring(index, m.index));
        }
        //script
        this._value.push({
          s: m[1]
        });
        index = m.index + m[1].length + 3;
      }
      if (index < value.length) {
        this._value.push(value.substring(index, value.length));
      }
    }
  }
  get name() {
    return this._name;
  }
  set name(name) {
    this._name = name;
  }
  get deliminitator() {
    return this._deliminitator;
  }
  toJson() {
    const result = {};
    result[this.name] = this._value;
    return result;
  }
}

class ModalBind {
  constructor(varName, path, elementId = null, toggled = false){
    this._varName = varName;
    this._path = path;
    this._elementId = elementId;
    this._toggle = toggled;
  }
  get elementId() {
    return this._elementId;
  }
  set elementId(elementId) {
    this._elementId = elementId;
  }
  get varName() {
    return this._varName;
  }
  get path() {
    return this._path;
  }
  get toggled() {
    return this._toggle;
  }
  set toggled(toggle) {
    this._toggle = toggle;
  }
}

class Text extends Node {
  constructor(text) {
    super();
    this._text = text;
  }
  get text() {
    return !this._text || this._text.trim() == "" ? _str(this._buffer) : this._text;
  }
  _getNonNullText(fn) {
    let text = this.text;
    if (!text || text.trim() == '') {
      return '';
    }
    return (fn || ((f) => f))(text);
  }
  toString() {
    return this._getNonNullText();
  }
  toJson() {
    return this._getNonNullText();
  }
  close() {}
}

class Comment extends Text {
  constructor(text) {
    super(text);
  }
  close() {}
  toJson() {
    return "";
  }
}

class TextScript extends Node {
  constructor(script) {
    super();
    this._script = script;
  }
  get script() {
    return this._script;
  }
  toJson() {
    return _clearObj({
      x: this._script,
      h: this._hiddenAttributes
    });
  }
}

const NO_END_TAG = "_base_link_meta_hr_br_wbr_area_img_track_embed_param_source_col_input_keygen_";
class Element extends Node {
  constructor(name, root) {
    super();
    this._children = [];
    this._attributes = {};
    this._tagText = null;
    this._name = name;
    this._notClosed = false;
    this._isClosed = false;
    this._isComponent = false;
    this._componentName = null;
    this._root = root;
  }
  set root(root) {
    this._root = root;
  }
  get attributes(){
    return _.values(this._attributes).map(a => {
      return {name: a.name, value: a.stringValue}
    });
  }
  getElementsByName(name) {
    return _.flatten(this.getElements()
      .filter(e => e instanceof Element)
      .map(e => {
        let list = [];
        if (_eqIgnoreCase(e.name, name)) {
          list.push(e);
        }
        list.push(e.getElementsByName(name));
        return list;
      }));
  }
  getAllElements() {
    return _.flatten(this.getElements().map(e => {
      let list = [e];
      list.push(e.getAllElement());
      return list;
    }));
  }
  getAllTextNodes() {
    return _getAllTextNodes(this);
  }
  getElementsWithAttribute(name) {
    return _.flatten(this.getElements().filter(e => e instanceof Element)
      .map(e => {
        let list = [e.getElementsWithAttribute(name)];
        if (e.getAttribute(name) != null) {
          list.push(e);
        }
        return list;
      }));
  }
  addElement(name) {
    let e = new Element(name, this._root);
    this.addChild(e);
    return e;
  }
  addText(value) {
    let e = new Text(value);
    this.addChild(e);
    return e;
  }
  addChildList(list) {
    list.forEach(n => this.addChild(n));
  }
  addChild(node) {
    node.parent = this;
    this._children.push(node);
  }
  insertChild(node, index) {
    node.parent = this;
    this._children.splice(index, 0, node);
  }
  insertChildAfter(node, after) {
    this.insertChild(node, this._children.indexOf(after) + 1);
  }
  insertChildBefore(node, before) {
    this.insertChild(node, this._children.indexOf(before));
  }
  get children() {
    return this._children || [];
  }
  clearChildren() {
    this._children = [];
  }
  getElements() {
    return this.children.filter(e => e instanceof Element);
  }
  get innerText() {
    return _str(this.getAllTextNodes().map(e => e.text));
  }
  getTagText() {
    return this._tagText;
  }
  getAttributes() {
    return _.clone(this._attributes);
  }
  setAttribute(name, val) {
    let a = new Attribute(name, val);
    this._attributes[a.name] = a;
  }
  getAttribute(name) {
    return _.has(this._attributes, name) ? this._attributes[name].stringValue : null;
  }
  getAttributeJsonFormat(n) {
    return this._attributes[n];
  }
  get name() {
    return this._name;
  }
  renameAttribute(name, newName) {
    this._attributes[newName] = this._attributes[name];
    delete this._attributes[name];
  }
  close() {
    this._isClosed = true;
  }
  childrenToJson() {
    return this.children.filter(n => !_isEmptyText(n)).map(n => n.toJson()).filter(c => !_.isEmpty(c));
  }
  toJson() {
    return _clearObj({
      n: this._name,
      a: _.extend({}, ..._.values(this.getAttributes()).map(a => a.toJson())),
      c: this.childrenToJson(),
      h: this._hiddenAttributes
    });
  }
  setNotClosed() {
    if (this.parent) {
      this._notClosed = true;
      this.children.forEach(n => this.parent.addChild(n));
      this.clearChildren();
    }
  }
  isClosed() {
    return this._isClosed;
  }
  remove() {
    super.remove();
  }
  replaceWith(node) {
    this.parent.insertChildAfter(node, this);
    this.remove();
  }
  removeAllChildren() {
    this._children = [];
  }
  addClass(c) {
    let classes = this.getAttribute("class");
    if (!classes || classes.trim() == "") {
      this.setAttribute("class", c);
    } else {
      this.setAttribute("class", classes + " " + c);
    }
  }
  removeAttributes(...attributeNames) {
    attributeNames.forEach(name => this._attributes.remove(name));
  }
  setHiddenAttributeOnChildren(attr, val) {
    this.children.forEach(node => {
      node.setHiddenAttribute(attr, val);
      if (node instanceof Element) {
        node.setHiddenAttributeOnChildren(attr, val);
      }
    });
  }
  findAllChildren(tagName) {
    return _.flatten(this.children
      .filter(c => c instanceof Element)
      .map(c => {
        const result = c.findAllChildren(tagName);
        if (c.name.toLowerCase() == tagName.toLowerCase()) {
          result.push(c);
        }
        return result;
      }));
  }
  findDeepestChild(tagName) {
    return util.firstOption(this.getElementsByName(tagName)).map(e => e.findDeepestChild(tagName) || e);
  }
  findDeepestChildWithAttribute(attributeName) {
    return util.firstOption(this.getElementsWithAttribute(attributeName)).map(e => e.findDeepestChildWithAttribute(attributeName) || e);
  }
}

class TemplateScript extends Element {
  constructor() {
    super();
    this._count = null;
    this._listVariable = null;
    this._iterateVariable = null;
    this._indexVariable = null;
    this._id = null;
  }
  set id(c) {
    this._id = c;
  }
  get id() {
    return this._id;
  }
  set count(c) {
    this._count = c;
  }
  get count() {
    return this._count;
  }
  set listVariable(c) {
    this._listVariable = c;
  }
  get listVariable() {
    return this._listVariable;
  }
  set iterateVariable(c) {
    this._iterateVariable = c;
  }
  get iterateVariable() {
    return this._iterateVariable;
  }
  set indexVariable(c) {
    this._indexVariable = c;
  }
  get indexVariable() {
    return this._indexVariable;
  }
  get name() {
    return "";
  }
  toJson() {
    return _clearObj({
      xc: this._count,
      xl: this._listVariable,
      xv: this._iterateVariable,
      xi: this._indexVariable,
      h: this._hiddenAttributes,
      c: this.children.toJson
    });
  }
}

class HTMLDoc extends Element {
  constructor() {
    super("DOCUMENT", null);
    this.root = this;
    this._requiredResourcesList = [];
  }
  _prepareHTMLElement() {
    if (!_.isEmpty(this._requiredResourcesList)) {
      if (this._htmlElement) {
        this._bodyElement = _.find(this._htmlElement.getElements(), ce => _eqIgnoreCase(ce.name, "body"));
        this._headElement = _.find(this._htmlElement.getElements(), ce => _eqIgnoreCase(ce.name, "head"));
        if (!this._headElement) {
          this._headElement = new Element("head", this);
          this._htmlElement.insertChild(this._headElement, 0);
        }
        this._requiredResourcesList.forEach(e => {
          const source = e.getAttribute("src").trim();
          if (source.toLowerCase().endsWith(".js")) {
            let scriptEl;
            if (this._bodyElement) {
              scriptEl = this._bodyElement.addElement("script");
            } else {
              scriptEl = this._headElement.addElement("script");
            }
            scriptEl.setAttribute("src", `${context.contextPath}/res/${source}`);
            scriptEl.setAttribute("type", "text/javascript");
          } else if (source.toLowerCase().endsWith("css") && this._headElement) {
            const linkEl = this._headElement.addElement("link");
            linkEl.setAttribute("href", `${context.contextPath}/res/${source}`);
            if (e.getAttribute("rel")) {
              linkEl.setAttribute("rel", e.getAttribute("rel"));
            }
            if (e.getAttribute("media")) {
              linkEl.setAttribute("media", e.getAttribute("media"));
            }
          }
        });
      }
    }
  }
  addChild(node) {
    if (node instanceof Element && _eqIgnoreCase(node.name, "html")) {
      this._htmlElement = node;
    }
    super.addChild(node);
  }
  get requiredResourcesList() {
    return this._requiredResourcesList;
  }
  replaceAllTexts(replacer) {
    this.getAllTextNodes().forEach(e => e.text = replacer.replace(e.text));
  }
  renameAllAttributesWithName(name, newName) {
    this.getAllElements().forEach(e => e.renameAttribute(this._name, newName));
  }
  get htmlElement() {
    return this._htmlElement;
  }
  createElement(name) {
    return new Element(name, this._root);
  }
}

class HTMLParser {
  constructor(boundModals = [], boundVars = []) {
    this._textNodes = [];
    this._doc = new HTMLDoc();
    this._currentParent = this._doc;
    this._inTextScript = false;
    this._currentText = [];
    this._current = null;
    this._templateScriptList = [];
    this._currentIndex = 0;
    this._isSearchingForHtmlElementOnly = false;
    this._foundHtml = false;
    this._currentRequires = false;
    this._boundObjects = boundVars;
    this._boundModals = boundModals;
    this._currentLine = [];
  }
  parse(html) {
    this._charArray = (html + "\n");
    let doc = this._doc;
    while (this.hasMore()) {
      let templateIfScript;
      let templateForScript;
      if (!this._inTextScript && this.nextIs("$if") && (templateIfScript = this.isIfTemplateScript()) != null) {
        this.closeCurrentText();
        //if template script eg: $if(exp){
        const templateIf = new TemplateScript();
        templateIf.count = `(${templateIfScript})?1:0`;
        this._currentParent.addChild(templateIf);
        this._currentParent = templateIf;
        this._current = null;
        this._templateScriptList.push(templateIf);
        this.advanceLine();
      } else if (!this._inTextScript && this.nextIs("$for") && (templateForScript = this.isForTemplateScript()) != null) {
        this.closeCurrentText();
        //if template script eg: $if(exp){
        const templateFor = new TemplateScript();
        templateFor.listVariable = templateForScript[1];
        templateFor.iterateVariable = templateForScript[0];
        if (templateForScript[2]) {
          templateFor.indexVariable = templateForScript[2];
        }
        this._currentParent.addChild(templateFor);
        this._currentParent = templateFor;
        this._current = null;
        this._templateScriptList.push(templateFor);
        this.advanceLine();
      } else if (this._templateScriptList.length > 0 && this.isEndOfTemplateScript()) {
        this.closeCurrentText();
        //end of template script eg: }
        let ind = this._templateScriptList.length - 1;
        this._templateScriptList.splice(ind, 1);
        this.advanceLine();
        this.closeTag(e => e instanceof TemplateScript);
      } else if (!this._inTextScript && this._currentParent.name && this._currentParent.name.toLowerCase() == 'script') {
        this.closeCurrentText();
        this.readScriptElementContent();
      } else if (!this._inTextScript && this.nextIs("<!--")) {
        this.closeCurrentText();
        this.advance();
        this.inComment();
      } else if (!this._inTextScript && this.nextIs("<![")) {
        this.closeCurrentText();
        this.advance();
        this.inCDATA();
      } else if (!this._inTextScript && this.nextIs("</")) {
        this.closeCurrentText();
        this.advance();
        this.close();
      } else if (!this._inTextScript && !this.nextIs("< ") && this.nextIs("<")) {
        this.closeCurrentText();
        this.advance();
        this.inTag();
      } else {
        if (!this._inTextScript && this.nextIs("${")) {
          this._inTextScript = true;
          this.closeCurrentText();
        } else if (this._inTextScript && this.nextIs("}") && _validateJS(_str(this._currentText).substring(2))) {
          this._inTextScript = false;
          this._currentParent.addChild(new TextScript(_str(this._currentText).substring(2)));
          this._currentText = [];
          this.advance();
          continue;
        }
        const currentChar = this.read();
        this._currentText.push(currentChar);
      }
      if (this._foundHtml && this._isSearchingForHtmlElementOnly) {
        return null;
      }
    }
    while (!this._currentParent._isClosed && this._currentParent != doc) {
      this._currentParent.setNotClosed();
      this._currentParent = this._currentParent.parent;
    }
    return doc;
  }
  closeCurrentText() {
    const textValue = _str(this._currentText);
    if (textValue.length > 0) {
      this._currentParent.addChild(new Text(textValue));
    }
    this._currentText = [];
  }
  advanceLine() {
    return this.readTill("\n").toLowerCase();
  }
  isIfTemplateScript() {
    let line = this.fullCurrentLine.trim();
    let matcher = /^\$if\s{0,}\((.*?)\)\s{0,}\{$/g.exec(line);
    if (matcher) {
      return matcher[1];
    } else {
      matcher = /^\$if\s{1,}(.*?)[^\)]\s{0,}\{$/g.exec(line);
      if (matcher != null) {
        return matcher[1];
      }
    }
    return null;
  }
  isForTemplateScript() {
    let line = this.fullCurrentLine.trim();
    let matcher = /^\$for\s{0,}\((.*?)\)\s{0,}\{$/.exec(line);
    let variables = null;
    if (matcher) {
      variables = matcher[1];
    } else {
      matcher = /^\$for\s{1,}(.*?)[^\)]\s{0,}\{$/.exec(line);
      if (matcher) {
        variables = matcher[1];
      }
    }
    if (variables != null) {
      matcher = /(\S*?)\s{1,}in\s{1,}(\S*)(\s{1,}with\s{1,}(\S*))?/.exec(variables);
      if (matcher) {
        return [matcher[1], matcher[2], matcher[4]];
      }
    }
    return null;
  }
  isEndOfTemplateScript() {
    return this.fullCurrentLine.trim() == "}";
  }
  readScriptElementContent() {
    let tagName = this._currentParent.name;
    const sb = [];
    let j = this._currentIndex;
    while (true) {
      if (this._charArray[j] == '<' && this._charArray[j + 1] == '/') {
        let h = j + 2;
        let c;
        let valName = [];
        while (this._charArray.length > h && (c = this._charArray[h++]) != '>') {
          valName.push(c);
        }
        if (_str(valName).trim() == tagName) {
          this._currentIndex = j + 2;
          const text = new Text(_str(sb));
          this._textNodes.push(text);
          this._currentParent.addChild(text);
          this.close();
          return;
        }
      }
      sb.push(this._charArray[j++]);
    }
  }
  inTag() {
    const name = this.readTill(" ", ">", "/>", "\n", "\t").toLowerCase();
    if (this._isSearchingForHtmlElementOnly && _eqIgnoreCase(name, "html")) {
      this._foundHtml = true;
      return;
    }
    let element = new Element(name, this._doc);
    let modalBindMap = {};
    let isRequiresTag = _eqIgnoreCase(name, "requires");
    if (isRequiresTag) {
      this._doc._requiredResourcesList.push(element);
      this._currentRequires = element;
    } else {
      this._currentParent.addChild(element);
      this._currentParent = element;
      this._current = element;
    }
    //read attributes
    let currentAttributeValue = [];
    const checkEmptyAttribute = () => {
      if (_str(currentAttributeValue).trim().length > 0)
        element.setAttribute(_str(currentAttributeValue).trim(), null);
      currentAttributeValue = [];
    };
    let dynAttr = 0;
    while (true) {
      if (this.discard(' ')) {
        checkEmptyAttribute();
      }
      if (this.nextIs("/>")) {
        //element without body
        this.advance();
        checkEmptyAttribute();
        if (isRequiresTag) {
          this._currentRequires.close();
          this._currentRequires = null;
        } else {
          this.closeElement();
        }
        break;
      } else if (this.nextIs(">")) {
        //element with body
        this.advance();
        checkEmptyAttribute();
        this._current = null;
        break;
      }
      let s = this.read();
      if (s == '=') {
        let attName = _str(currentAttributeValue).trim();
        currentAttributeValue = [];
        let c = this._charArray[this._currentIndex];
        if (c == '\'' || c == '"' || c != ' ') {
          s = c;
          currentAttributeValue.push(this.read());
          let aspas = c == '\'' || c == '"';
          while (true) {
            c = this.read();
            currentAttributeValue.push(c);
            let endNoAspas = (!aspas && c == ' ') ||
              (!aspas && ((c == '/' && this._charArray[this._currentIndex + 1] == '>') || c == '>'));
            if (endNoAspas || (aspas && c == s && this.previous(2) != '\\')) {
              let val = _str(currentAttributeValue).substring(0, currentAttributeValue.length);
              if (endNoAspas) {
                this._currentIndex--;
                val = val.substring(0, val.length - 1);
              }
              element.setAttribute(attName, val);
              if (attName == "bind") {
                let bind = val.trim();
                if (!endNoAspas) {
                  bind = bind.substring(1, bind.length-1);
                }
                let varName = bind.split(".")[0];
                if (varName != "window" && varName != "xuser") {
                  this._boundObjects.push(varName.split("[")[0]);
                }
              } else if (attName.startsWith("data-modal") && attName != "data-modal-toggle") {
                let varName;
                if (attName.startsWith("data-modal-")) { // has
                  // a
                  // bound
                  // var
                  varName = attName.substring("data-modal-".length);
                } else {
                  varName = _generateId("xvmd_");
                }
                modalBindMap[varName] = new ModalBind(varName, element.getAttribute(attName).trim());
              }
              currentAttributeValue = [];
              break;
            }
          }
        } else {
          element.setAttribute(attName, null);
        }
      } else {
        currentAttributeValue.push(s);
      }
    }
    if (!_.isEmpty(modalBindMap)) {
      let elementId = element.getAttribute("id");
      if (!elementId) {
        elementId = _generateId("xmd_");
        element.setAttribute("id", elementId);
      }
      let toggle = element.getAttribute("data-modal-toggle");
      if (toggle) {
        let bind = modalBindMap[toggle];
        if (bind) {
          bind.toggled = true;
        }
      }
      _.values(modalBindMap).forEach(v => {
        if (_.size(modalBindMap) == 1) {
          v.toggled = true;
        }
        v.elementId = elementId;
        this._boundModals.push(v);
      });
    }
    this.prepareElementsWithSource(element);
  }
  prepareElementsWithSource(element) {
    if (element.name.toUpperCase() == "SCRIPT") {
      let src = element.getAttribute("src");
      if (src && src.startsWith("/")) {
        element.setAttribute("src", `${context.contextPath}${src}`);
      }
    }
    if (element.name.toUpperCase() == "A") {
      let href = element.getAttribute("href");
      if (href && href.startsWith("/")) {
        element.setAttribute("href", `${context.contextPath}${href}`)
      }
    }
  }
  previous(t) {
    return this._charArray[this._currentIndex - t];
  }
  discard(c) {
    let j = this._currentIndex;
    let discarded = false;
    while (this._charArray[j] == c) {
      j++;
      discarded = true;
    }
    this._currentIndex = j;
    return discarded;
  }
  close() {
    let tagName = null;
    try {
      tagName = this.readTill(">").toLowerCase().trim();
      this.closeTag(tagName);
    } catch (e) {
      throw new Error(`Error closing tag ${(tagName != null ? tagName : "")}: ${e.message}`);
    }
  }
  closeTag(tagNameOrFilter) {
    const isString = _.isString(tagNameOrFilter);
    if (isString && _eqIgnoreCase(tagNameOrFilter, "requires")) {
      this._currentRequires.close();
      this._currentRequires = null;
    } else {
      const filter = e => isString ? tagNameOrFilter != e.name : !tagNameOrFilter(e);
      let toClose = this._current instanceof Element ? this._current : this._currentParent;
      while (filter(toClose)) {
        if (!toClose._isClosed) {
          toClose.setNotClosed();
        }
        let prev = toClose;
        while (true) {
          prev = prev.getPrevious();
          if (!prev) {
            toClose = toClose.parent;
            break;
          } else if (prev instanceof Element && !prev._isClosed) {
            toClose = prev;
            break;
          }
        }
      }
      toClose.close();
      this._currentParent = toClose.parent;
      this._current = null;
    }
    this._currentIndex++;
  }
  closeElement() {
    this._currentParent = this._current.parent;
    this._current.close();
    this._current = null;
  }
  readTill(...s) {
    let sb = [];
    let j = this._currentIndex;
    main: while (true) {
      for (let z = 0; z < s.length; z++) {
        if (this.nextIs(s[z], j)) {
          break main;
        }
      }
      sb.push(this._charArray[j++]);
    }
    this.lastAdvance = j - this._currentIndex;
    this.advance();
    return _str(sb);
  }
  inComment() {
    const sb = [];
    while (true) {
      if (this.nextIs("-->")) {
        this.advance();
        break;
      }
      sb.push(this.read());
    }
    const comment = new Comment(_str(sb));
    this._currentParent.addChild(comment);
    comment.close();
  }
  inCDATA() {
    const sb = [];
    while (true) {
      if (this.nextIs("]]>")) {
        this.advance();
        break;
      }
      sb.push(this.read());
    }
    this._currentParent.addChild(new Text(_str(sb)));
  }
  advance() {
    this._currentIndex += this.lastAdvance;
  }
  nextIs(s, index) {
    const sb = [];
    this.lastAdvance = s.length;
    let usedIndex = index || this._currentIndex;
    let j = usedIndex;
    for (; j < s.length + usedIndex && j < this._charArray.length; j++) {
      sb.push(this._charArray[j]);
    }
    return _str(sb) == s;
  }
  hasMore() {
    return this._currentIndex < this._charArray.length;
  }
  read() {
    let c = this._charArray[this._currentIndex++];
    if (c == '\n') {
      //starting new line
      this._currentLine = [];
    }
    this._currentLine.push(c);
    return c;
  }
  get fullCurrentLine() {
    let localIndex = this._currentIndex;
    let line = [];
    let c;
    while (localIndex < this._charArray.length - 1 && (c = this._charArray[localIndex++]) != '\n') {
      line.push(c);
    }
    return _str(line);
  }
  get boundObjects() {
    return this._boundObjects;
  }
  get boundModals() {
    return this._boundModals;
  }
}

module.exports = {
  Attribute: Attribute,
  Comment: Comment,
  Element: Element,
  HTMLDoc: HTMLDoc,
  ModalBind: ModalBind,
  TextScript: TextScript,
  TemplateScript: TemplateScript,
  Text: Text,
  HTMLParser: HTMLParser
}