const _ = require('underscore');
const esprima = require('esprima');

const _str = (sb) => {
  return sb.join('');
}

const _clearObj = (obj) => _.omit(obj, v => !_.isNull(v) && !_.isEmpty(v));

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
    esprima.parse(js.replace('"', '\\"'));
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
  set parent(parent){
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
  set value(attributeValue) {
    let deliminitator = '"';
    let value = attributeValue;
    if (value) {
      value = value.trim();
      if (value.startsWith("\"") || value.startsWith("'")) {
        deliminitator = value.charAt(0);
        value = value.substring(1, value.length - 1);
      }
      value = deliminitator == '"' ? value.replace('\\"', '"') : value.replace("\\'", "'");
    }
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
      this._value.push({s:m[1]});
      index = m.index + m[1].length;
    }
    if (index < value.length) {
      this._value.push(value.substring(index, value.length));
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
  toString() {
    return this.name + (!_.isEmpty(this._value) ? `="${_str(this._value.filter(i => _.isString(i)))}"` : "");
  }
  toJson() {
    const result = {};
    result[a.name] = this._value;
    
  }
}

class ModalBind {
  get elementId() {
    return this._elementId;
  }
  set elementId(elementId) {
    this._elementId = elementId;
  }
  get varName() {
    return this._varName;
  }
  set varName(varName) {
    this._varName = varName;
  }
  get path() {
    return this._path;
  }
  set path(path) {
    this._path = path;
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
    this.text = text;
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
  close() { }
  _getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp) {
    return this._getNonNullText();
  }

}

class Comment extends Text {
  constructor(text) {
    super(text);
  }
  close() {
  }
  toJson() {
    return "";
  }
  _getHTML(a,b,c){
    return `<!--${super._getHTML(a, b, c)}-->`;
  }
}

class TextScript extends Node {
  constructor(script){
    this._script = script;
  }
  toJson(){
    return _clearObj({
      x: this._script,
      h: this._hiddenAttributes
    });
  }
  toHTML(){
    return '';
  }
}

class TemplateScript extends Node {
  constructor(){
  }
  set count(c) {
    this._cont = c;
  }
  toJson(){
    return _clearObj({
      x: this._condition,
      h: this._hiddenAttributes
    });
  }
  toHTML(){
    return '';
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
  findChildrenByName(name) {
    return this.getElements().filter(e => e instanceof Element && _eqIgnoreCase(e.name, name));
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
        let list = [];
        if (e.getAttribute(name) != null) {
          list.push(e);
        }
        list.push(e.getElementsWithAttribute(name));
      }));
  }
  addElement(name) {
    let e = new Element(name, this._root);
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
    return this._children;
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
    return _.has(this._attributes, name) ? this._attributes[name].value : null;
  }
  getAttributeObject(n) {
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
  toString() {
    return `<${this._name} ${_.values(this.getAttributes()).map(a => a.toString()).join(' ')} >` +
      (!this._notClosed && NO_END_TAG.indexOf(`_${this._name}_`) < 0 ? `${this.toHTML()}</${this._name}>` : '');
  }
  toJson() {
    return _clearObj({
      n:this._name,
      a: _.extend({}, ...this.getAttributes().map(a => a.toJson())),
      c: this.children.filter(n => !_isEmptyText(n)).map(n.toJson()).filter(c => !_.isEmpty(c)),
      h: this._hiddenAttributes
    });
  }
  innerHTML() {
    return _str(this.children.filter(n => !_isEmptyText(n)).map(n => n.toString()));
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
  toHTML(){
    return this._getHTML({}, {}, {});
  }
  _getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp) {
    const xcompId = this.getHiddenAttribute("xcompId");
    if (xcompId) {
      jsonComp[xcompId] = this.getHiddenAttribute("xcompName");
    }
    const sb = ["<"];
    let dynId = this.getAttribute("data-xdynid");
    if (_eqIgnoreCase(this._name, "xscript")) {
      const att = this.getAttribute("scr");
      sb.push(`xscript data-xscript=${att.getDeliminitator()}${att.value}${att.getDeliminitator()}`);
      if (this.hasHiddenAttributes()) {
        dynId = dynId || _generateId();
        sb.push(` data-xdynid='${dynId}' `);
        jsonHiddenAtt[dynId] = _.clone(this._hiddenAttributes);
      }
      sb.push("></xscript>");
      return _str(sb);
    } else {
      sb.push(`${this._name} `);
      _.values(this.getAttributes()).forEach(a => {
        let isDynAtt = false;
        if (a.value) {
          let index = 0;
          let attValues;
          let m;
          while((m = /\$\{(.*?)}/g.exec(a.value)) != null){
            isDynAtt = true;
            if (dynId == null) {
              dynId = XComponents.generateId();
              sb.push(`data-xdynid='${dynId}' `);
            }
            // get dynamic atts for element
            let dynAtts = jsonDynAtt[dynId];
            if (!dynAtts) {
              dynAtts = {};
              jsonDynAtt[dynId] = dynAtts;
            }
            // get values of the att
            attValues = dynAtts[a.name];
            if (!attValues) {
              attValues = [];
              dynAtts[a.name] = attValues;
            }
            if (index != m.index) {
              attValues.push({
                v: a.getDeliminitator() + a.value.substring(index, m.index).replace("\n", "\\n") + a.getDeliminitator()
              });
            }
            index = m.index + m[1].length;
            attValues.push({
              s: a.getDeliminitator() + m[1].replace("\n", "\\n") + a.getDeliminitator()
            });
            if (isDynAtt && index < a.value.length) {
              attValues.push({
                v: a.getDeliminitator() + a.value.substring(index, a.value.length).replace("\n", "\\n") + a.getDeliminitator()
              });
            }
          }
          if (!isDynAtt) {
            sb.push(`${a.toString()} `);
          }
        }
      });
      if (_.isEmpty(this._hiddenAttributes)) {
        dynId = this.getAttribute("data-xdynid");
        if (!dynId) {
          dynId = _generateId();
          sb.push(`data-xdynid='${dynId}' `);
        }
        jsonHiddenAtt[dynId] = _.clone(this._hiddenAttributes);
      }
      if (!this._notClosed && NO_END_TAG.indexOf("_" + this._name + "_") < 0) {
        const sbChild = [];
        const sbHiddenIterators = [];
        let i = 0;
        this.children.forEach(n => {
          if (!_isEmptyText(n)) {
            let hiddenIterator = n instanceof Element && _eqIgnoreCase(n.name, "xiterator");
            if (!hiddenIterator) {
              sbChild.push(n._getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp));
            } else {
              // hidden iterator
              sbHiddenIterators.push(`${n.getHiddenAttribute("xiterId")},${i}|`);
            }
            i++;
          }
        });
        if (!_.isEmpty(sbHiddenIterators)) {
          sb.push(`data-hxiter='${sbHiddenIterators}' `);
        }
        return `${_str(sb).trim()}>${_str(sbChild)}</${this._name}>`;
      } else {
        return `${_str(sb).trim()}>`;
      }
    }
  }
}


class HTMLDoc extends Element {
  constructor() {
    super("DOCUMENT", null);
    this.root = this;
    this._requiredResourcesList = [];
    this._htmlElement = null;
  }
  _prepareHTML() {
    let htmlElement = this._htmlElement;
    if (!_.isEmpty(this._requiredResourcesList)) {
      this.getElements().filter(e => _eqIgnoreCase(e.name, "html")).forEach(htmlElement => {
        htmlElement.getElements().forEach(ce => {
          if (!this._bodyElement && _eqIgnoreCase(ce.name, "body")) {
            this._bodyElement = ce;
          } else if (!this._headElement && _eqIgnoreCase(ce.name, "head")) {
            this._headElement = ce;
          }
        });
        if (!this._headElement) {
          this._headElement = new Element("head", this);
          htmlElement.insertChild(this._headElement, 0);
        }
      });
      if (this._bodyElement || this._headElement) {
        this._requiredResourcesList.forEach(e => {
          const source = e.getAttribute("src").trim();
          if (source.toLowerCase().endsWith(".js")) {
            let scriptEl;
            if (this._bodyElement) {
              scriptEl = this._bodyElement.addElement("script");
            } else {
              scriptEl = this._headElement.addElement("script");
            }
            scriptEl.setAttribute("src", `{webctx}/res/${source}`);
            scriptEl.setAttribute("type", "text/javascript");
          } else if (source.toLowerCase().endsWith("css") && this._headElement) {
            const linkEl = this._headElement.addElement("link");
            linkEl.setAttribute("href", `{webctx}/res/${source}`);
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
  toString() {
    this._prepareHTML();
    return _str(this.children.map(n => n.toString())).trim();
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
  _getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp) {
    return _str(this.children.map(n => n._getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp))).trim();
  }
}

class _ParseInput {
  constructor(text){
    this._charArray = (html + "\n");
    this._index = 0;
    this._lastAdvance = 0;
  }
  currentWithOffset(offset){
    return this._charArray[this._index+offset];
  }
  current() {
    return this.curOffset(0);
  }
  skip(n){
    this._index += n;
    return this.cur();
  }
  next(){
    return this._skip(1);
  }
  hasMore(){
    return this._index < this._charArray.length;
  }
  currentLine() {
    let localIndex = this._index;
    let line = [];
    let c;
    while (localIndex < this._charArray.length - 1 && (c = this._charArray[localIndex++]) != '\n') {
      line.push(c);
    }
    return _str(line);
  }
  advance() {
    this._index += this._lastAdvance;
  }
  nextIs(s, index) {
    const sb = [];
    this._lastAdvance = s.length;
    let usedIndex = index || this._index;
    let j = usedIndex;
    for (; j < s.length + usedIndex && j < this._charArray.length; j++) {
      sb.push(this._charArray[j]);
    }
    return _str(sb) == s;
  }
  readTill(...s) {
    let sb = [];
    let j = this._index;
    main: while (true) {
      for (let z = 0; z < s.length; z++) {
        if (this.nextIs(s[z], j)) {
          break main;
        }
      }
      sb.push(this._charArray[j++]);
    }
    this.lastAdvance = j - this._index;
    this.advance();
    return _str(sb);
  }
  apply(fn){
    let line = this.currentLine().trim();
    let result = fn(line);
    if(!_.isEmpty(result)){
      this._lastAppliedFunctionValue = result;
      return true;
    }
    return false;
  }
  getApplied(){
    return this._lastAppliedFunctionValue;
  }
  advanceLine() {
    return this.readTill("\n").toLowerCase();
  }
}

const _forTemplateScript = (line) => {
  if(line.trim().startsWith('$for')){
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
  }
  return null;
}

const _ifTemplateFunction = (line) => {
  if(line.trim().startsWith("$if")){
    let matcher = /^\$if\s{0,}\((.*?)\)\s{0,}\{$/g.exec(line);
    if (matcher) {
      return matcher[1];
    } else {
      matcher = /^\$if\s{1,}(.*?)[^\)]\s{0,}\{$/g.exec(line);
      if (matcher != null) {
        return matcher[1];
      }
    }
  }
  return null;
}

class HTMLParser {
  constructor() {
    this._doc = new HTMLDoc();
    this._templateScriptList = [];
  }
  parse(html) {
    this._nav = new _ParseInput(html);
    this._doc.addChildList(this._parse(this._nav));
    return this._doc;
  }
  _parse(nav, currEl) {
    const elements = [];
    if (nav.hasMore()) {
      let element;
      if (nav.apply(_ifTemplateFunction) || nav.apply(_forTemplateScript)) {
        const applied = nav.getApplied();
        element = new TemplateScript();
        if(_.isString(applied)){
          element.count = `(${applied})?1:0`;
        }else{
          element.list = applied[1];
          element.variable = applied[0];
          if (applied[2]) {
            element.indexVariable = applied[2];
          }
        }
        this._templateScriptList.push(element);
        nav.advanceLine();
      } else if (!_.isEmpty(this._templateScriptList) && this.isEndOfTemplateScript()) {
        //end of template script eg: }
        let ind = this._templateScriptList.length - 1;
        let hiddenIteratorElement = this._templateScriptList[ind];
        this._templateScriptList.splice(ind, 1);
        this.advanceLine();
        this.closeTag("xiterator");
      } else if (!this._inScript && this.isCurrentTextOnlyTag()) {
        this.readTilCloseTag();
      } else if (!this._inScript && this.nextIs("<!--")) {
        this.advance();
        this.inComment();
      } else if (!this._inScript && this.nextIs("<![")) {
        this.advance();
        this.inComment();
      } else if (!this._inScript && this.nextIs("</")) {
        this.advance();
        this.close();
      } else if (!this._inScript && !this.nextIs("< ") && this.nextIs("<")) {
        this.advance();
        this.inTag(doc);
      } else {
        if (!this._inScript && this.nextIs("${")) {
          this._inScript = true;
          this._currentScript = [];
        } else if (this._inScript && this.nextIs("}") && _validateJS(_str(this._currentScript).substring(2))) {
          this._inScript = false;
          this._currentScript = null;
        }
        const currentChar = this.read();
        if (this._inScript) {
          this._currentScript.push(currentChar);
        }
      }
      if (this._foundHtml && this._isCheckingHtmlElement) {
        return null;
      }
      elements.push(element);
    }
    while (!this._currentParent._isClosed && this._currentParent != doc) {
      this._currentParent.setNotClosed();
      this._currentParent = this._currentParent.parent;
    }
    this._textNodes.forEach(text => {
      text.normalize(doc);
    });
    return doc;
  }
  isEndOfTemplateScript() {
    return this.getFullCurrentLine().trim() == "}";
  }
  readTilCloseTag() {
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
          const text = new Text();
          this._textNodes.push(text);
          text.text = _str(sb);
          this._currentParent.addChild(text);
          this.close();
          return;
        }
      }
      sb.push(this._charArray[j++]);
    }
  }
  inTag(doc) {
    let name = this.readTill(" ", ">", "/>", "\n", "\t").toLowerCase();
    if (this._isCheckingHtmlElement && _eqIgnoreCase(name, "html")) {
      this._foundHtml = true;
      return;
    }
    let element = new Element(name, doc);
    let modalBindMap = {};
    let isRequiresTag = false;
    if (_eqIgnoreCase(name, "requires")) {
      this._doc._requiredResourcesList.push(element);
      this._currentRequires = element;
      isRequiresTag = true;
    } else {
      this._currentParent.addChild(element);
      this._currentParent = element;
      this._current = element;
    }
    let attVal = [];
    let dynAttr = 0;
    while (true) {
      if (this.discard(' ')) {
        if (_str(attVal).trim().length > 0) {
          element.setAttribute(_str(attVal).trim(), null);
        }
        attVal = [];
      }
      if (this.nextIs("/>")) {
        this.advance();
        if (!_.isEmpty(attVal)) {
          element.setAttribute(_str(attVal), null);
        }
        if (this.isRequiresTag) {
          this._currentRequires.close();
          this._currentRequires = null;
        } else {
          this.closeElement();
        }
        break;
      } else if (this.nextIs(">")) {
        this.advance();
        if (!_.isEmpty(attVal)) {
          element.setAttribute(_str(attVal), null);
        }
        this._current = null;
        break;
      }
      if (this.nextIs("${")) {
        this.advance();
        let script = [];
        while (!this.nextIs("}") && _validateJS(_str(script))) {
          this.read(script);
        }
        this.discard('}');
        element.setAttribute("_outxdynattr_" + dynAttr++, _str(script));
      } else {
        let s = this.read(attVal);
        if (s == '=') {
          let attJoin = _str(attVal);
          let attName = attJoin.substring(0, attJoin.length - 1).trim();
          attVal = [];
          let c = this._charArray[this._currentIndex];
          if (c == '\'' || c == '"' || c != ' ') {
            s = c;
            this.read(attVal);
            let aspas = c == '\'' || c == '"';
            while (true) {
              c = this.read(attVal);
              let endNoAspas = (!aspas && c == ' ') ||
                (!aspas && ((c == '/' && this._charArray[this._currentIndex + 1] == '>') || c == '>'));
              if (endNoAspas || (aspas && c == s && this.previous(2) != '\\')) {
                let val;
                if (endNoAspas) {
                  this._currentIndex--;
                  val = _str(attVal).substring(0, attVal.length - 1);
                } else {
                  val = _str(attVal);
                }
                element.setAttribute(attName, val);
                if (attName == "data-xbind") {
                  let bind = element.getAttribute(attName).trim();
                  let varName = bind.split(".")[0];
                  if (varName != "window" && varName != "xuser") {
                    boundObjects.push(varName.split("[")[0]);
                  }
                } else if (attName.startsWith("data-xmodal") && attName != "data-xmodal-toggle") {
                  let modalBind = new ModalBind();
                  if (attName.startsWith("data-xmodal-")) { // has
                    // a
                    // bound
                    // var
                    modalBind.setVarName(attName.substring("data-xmodal-".length));
                  } else {
                    modalBind.setVarName(_generateId("xvmd_"));
                  }
                  modalBind.setPath(element.getAttribute(attName).trim());
                  modalBindMap[modalBind.getVarName()] = modalBind;
                }
                attVal = [];
                break;
              }
            }
          } else {
            element.setAttribute(attName, null);
          }
        }
      }
    }
    if (_.isEmpty(modalBindMap)) {
      let elementId = element.getAttribute("id");
      if (!elementId) {
        elementId = _generateId("xmd_");
        element.setAttribute("id", elementId);
      }
      let toggle = element.getAttribute("data-xmodal-toggle");
      if (toggle) {
        let bind = modalBindMap[toggle];
        if (bind) {
          bind.setToggle(true);
        }
      }
      _.values(modalBindMap).forEach(v => {
        if (modalBindMap.size() == 1) {
          v.setToggle(true);
        }
        v.setElementId(elementId);
      });
      _.extend(this._boundModals, modalBindMap);
    }
    this.prepareElementsWithSource(element);
  }
  prepareElementsWithSource(element) {
    if (element.name.toUpperCase() == "SCRIPT") {
      let src = element.getAttribute("src");
      if (src && src.startsWith("/")) {
        element.setAttribute("src", `{webctx}${src}`);
      }
    }
    if (element.name.toUpperCase() == "A") {
      let href = element.getAttribute("href");
      if (href && href.startsWith("/")) {
        element.setAttribute("href", `{webctx}${href}`)
      }
    }
  }
  isCurrentTextOnlyTag() {
    // put text only tag here
    let textOnlyTags = " script ";
    return this._currentParent != null && textOnlyTags.indexOf(this._currentParent.name) >= 0;
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
  closeTag(tagName) {
    if (_eqIgnoreCase(tagName, "requires")) {
      this._currentRequires.close();
      this._currentRequires = null;
    } else {
      let toClose = this._current instanceof Element ? this._current : this._currentParent;
      while (tagName != toClose.name) {
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
    this._currentParent = current.parent;
    this._current.close();
    this._current = null;
  }
  inComment() {
    this._current = new Comment();
    this._currentParent.addChild(this._current);
    while (true) {
      if (this.nextIs("-->")) {
        this.advance();
        this._current.close();
        this._current = null;
        break;
      }
      this.read();
    }
  }
  
  getBoundObjects() {
    return this._boundObjects;
  }
  getBoundModals() {
    return this._boundModals;
  }
  hasHtmlElement(content) {
    this._isCheckingHtmlElement = true;
    this.parse(content);
    return this._foundHtml;
  }
}

module.exports = {
  Attribute: Attribute,
  Comment: Comment,
  Element: Element,
  HTMLDoc: HTMLDoc,
  ModalBind: ModalBind,
  Text: Text,
  HTMLParser: HTMLParser
}