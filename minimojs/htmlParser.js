const _ = require('underscore');
const esprima = require('esprima');

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

const _getAllTextNodes = (element) =>
  _.flatten(element.children.map(e => {
    let list = [];
    if (e instanceof Element) {
      list.push(_getAllTextNodes(e));
    } else if (e instanceof Text) {
      list.push(e);
    }
  }));

const _generateId = () => "id_" + Math.random();

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
    return this._buffer.join('');
  }
  remove() {
    let index = this.parent.children.indexOf(this);
    this.parent.children.splice(index, 1);
    this._parent = null;
  }
  printHiddenAttributesInJsonFormat() {
    return _.pairs(this._hiddenAttributes).map(pair => `${pair[0]}:'${pair[1].replace(/'/g, "\\\\'")}'`).join('');
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
  set value(value) {
    this._deliminitator = '"';
    if (value != null) {
      value = value.trim();
      if (value.startsWith("\"") || value.startsWith("'")) {
        this._deliminitator = value.charAt(0);
        value = value.substring(1, value.length - 1);
      } else {
        value = value.replace('"', '\\"');
      }
    }
    this._value = value;
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
    return this.name + (this.value != null ? `=${this.deliminitator}${this.value}${this.deliminitator}` : "");
  }
  toJSON() {
    return `'${this.name}':` + (this.value != null ? this.deliminitator + this.value + this.deliminitator : "null");
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
    return !this._text || this._text.trim() == "" ? this._buffer.join('') : this._text;
  }
  _getNonNullText(fn) {
    let text = this.text;
    if (!text || text.trim() == '') {
      return '';
    }
    return (fn || ((f) => f))(text);
  }
  set text(text) {
    this._text = text;
  }
  normalize(doc) {
    let text = this._getNonNullText();
    if (text == "") {
      return;
    }
    let pattern = /\$\{(.*?)}/g;
    let index = 0;
    let t = new Text();
    this.addAfter(t);
    this.remove();
    let m;
    while ((m = pattern.exec(text)) != null) {
      if (index != m.index) {
        let newText = text.substring(index, m.index);
        if (newText.length > 0) {
          let tNew = new Text();
          tNew.text = newText;
          t.addAfter(tNew);
          t = tNew;
        }
      }
      let x = new Element("xscript", doc);
      x.setAttribute("data-xscript", m[1]);
      _.pairs(this._hiddenAttributes).forEach(pair => {
        x.setHiddenAttribute(pair[0], pair[1]);
      });
      t.addAfter(x);
      t = x;
      index = m.index + m[0].length;
    }
    if (index < text.length) {
      let newText = text.substring(index, text.length);
      if (newText.length > 0) {
        let tNew = new Text();
        tNew.text = newText;
        t.addAfter(tNew);
        t = tNew;
      }
    }
  }
  toString() {
    let textValue = _prepareValueInXScript(this.text, _eqIgnoreCase(this.parent.name, "script"));
    if (!_isEmpty(this._hiddenAttributes)) {
      // separete xscripts
      let doc = null;
      try {
        doc = new HTMLParser().parse(`<root>${textValue}</root>`);
      } catch (ee) {
        throw new Error(`UNKNOWN ERROR IN XTEXT TO STRING: ${e.message}`);
      }
      textValueg = doc.children.get(0).children.map(child => {
        if (child instanceof XText) {
          return child.text;
        } else {
          if (!child.name.toLowerCase() == "xscript") {
            throw new Error(
              `THERE SHOUDN'T BE A TAG DIFFERENT THAN XSCRIPT INSIDE A XTEXT. TAG: ${child.name}`);
          }
          _.pairs(this._hiddenAttributes).forEach(e => child.setHiddenAttribute(e[0], e[1]));
          return child.toString();
        }
      }).join('');
    }
    return textValue;
  }
  toJson() {
    return this._getNonNullText(text =>
      `{t:"${StringEscapeUtils.unescapeHtml4(text.replace("\"", "\\\"").replace("\n", ""))}"}`);
  }
  close() { }
  _getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp) {
    return this._getNonNullText();
  }
}

class Comment extends Text {
  constructor(text) {
    super(text);
    this.addString("<!--");
  }
  close() {
    this.addString("-->");
  }
  toJson() {
    return "";
  }
}

const NO_END_TAG = "_base_link_meta_hr_br_wbr_area_img_track_embed_param_source_col_input_keygen_";
class Element extends Node {
  constructor(name, root) {
    super();
    this._children = [];
    this._attributes = {};
    this._innerText = null;
    this._tagText = null;
    this._name = name;
    this._notClosed = false;
    this._isClosed = false;
    this._isComponent = false;
    this._componentName = null;
    this._root = root;
    this._lastAdvance = 0;
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
  getElements() {
    return this.children.filter(e => e instanceof Element);
  }
  get innerText() {
    return this._innerText;
  }
  set innerText(text) {
    this._innerText = text;
  }
  getTagText() {
    return this._tagText;
  }
  getAttributes() {
    return _.clone(this._attributes);
  }
  setAttribute(name, val) {
    if (name.startsWith("_hidden_")) {
      this.setHiddenAttribute(name.substring("_hidden_".length), val);
    } else {
      let a = new Attribute(name, val);
      this._attributes[a.name] = a;
    }
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
    return `<${this._name} ${_.values(this.getAttributes()).map(a => a.toString()).join(' ')} ` +
      _.pairs(this._hiddenAttributes).map(p => `_hidden_${p[0]}='${p[1].replace(/'/g, "\\'")}' `).join(' ') + '>' +
      (!this._notClosed && NO_END_TAG.indexOf(`_${this._name}_`) < 0 ? `${this.toHTML()}</${this._name}>` : '');
  }
  toJson() {
    if (_eqIgnoreCase(this._name, "xscr")) {
      const sb = [];
      const att = this.getAttribute("scr");
      sb.push(`{x: ${att.getDeliminitator()}${att.value}${att.getDeliminitator()}`);

      if (this.hasHiddenAttributes()) {
        sb.push(`,h:{${thisprintHiddenAttributesInJsonFormat()}}`);
      }
      sb.push("}");
      return sb.join('');
    } else {
      const sbAttr = _.flatten(this.getAttributes().map(a => {
        const sbuilder = [`'${a.name}':[`];
        if (a.value) {
          let index = 0;
          let pattern = /\$\{(.*?)}/g;
          let m;
          while ((m = pattern.exec(a.value)) != null) {
            if (index != m.index) {
              sbuilder.push(`{v:${a.getDeliminitator()}${a.value.substring(index, m.index).replace("\n", "\\n")}${a.getDeliminitator()}},`);
            }
            sbAttr.push(`{s:${a.getDeliminitator()}${m[1].replace("\n", "\\n").replace("&quot;", "\\\"")}${a.getDeliminitator()}},`);
            index = m.index + m[1].length;
          }
          if (index < a.value.length) {
            sbAttr.push(`{v:${a.getDeliminitator()}${a.value.substring(index, a.value.length).replace("\n", "\\n")}${a.getDeliminitator()}},`);
          }
        }
        sbAttr.push("],");
        return sbAttr;
      })).join('');
      const sb = [`{n:'${this._name}',`];
      if (sbAttr.length > 0) {
        sb.push(`a:{${sbAttr}},`);
      }
      const sbChildren = this.children.filter(n => !_isEmptyText(n)).map(n => n.toJson().trim()).filter(t => t != '').join(',');

      if (sbChildren.length > 0) {
        sb.push(`c:[${sbChildren}],`);
      }
      const hidden = printHiddenAttributesInJsonFormat();
      if (hidden != "") {
        sb.push(`h:{${hidden}}`);
      }
      sb.push("}");
      return sb.join('');
    }
  }
  innerHTML() {
    this.children.filter(n => !_isEmptyText(n)).map(n => n.toString()).join('');
  }
  setNotClosed() {
    if (this.parent) {
      this._notClosed = true;
      this.children.forEach(n => this.parent.addChild(n));
      this.children.clear();
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
      if (node instanceof Element && !node.name == "_x_text_with_attributes") {
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
      return sb.join('');
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
      if (this._hiddenAttributes.length == 0) {
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
        if (sbHiddenIterators.length > 0) {
          sb.push(`data-hxiter='${sbHiddenIterators}' `);
        }
        return `${sb.join('').trim()}>${sbChild.join('')}</${this._name}>`;
      } else {
        return `${sb.join('').trim()}>`;
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
    if (this._requiredResourcesList.length > 0) {
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
    return this.children.map(n => n.toString()).join('').trim();
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
  getHtmlStructure() {
    return this.children.map(n => n.toString()).join('').trim();
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
    return this.children.map(n => n._getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp)).join('').trim();
  }
}

class HTMLParser {
  constructor() {
    this._textNodes = [];
    this._doc = new HTMLDoc();
    this._currentParent = this._doc;
    this._inScript = false;
    this._currentScript = null;
    this._current = null;
    this._templateScriptLlist = [];
    this._currentIndex = 0;
    this._isCheckingHtmlElement = false;
    this._foundHtml = false;
    this._currentRequires = false;
    this._boundObjects = [];
    this._boundModals = {};
    this._currentLine = [];
  }
  parse(html) {
    this._charArray = (html + "\n");
    let doc = this._doc;
    while (this.hasMore()) {
      let templateIfScript;
      let templateForScript;
      if (!this._inScript && this.nextIs("$if") && (templateIfScript = this.isIfTemplateScript()) != null) {
        //if template script eg: $if(exp){
        const hiddenIteratorElement = new Element("xiterator", doc);
        hiddenIteratorElement.setAttribute("count", `(${templateIfScript})?1:0`);
        currentParent.addChild(hiddenIteratorElement);
        currentParent = hiddenIteratorElement;
        this._current = null;
        templateScriptLlist.push(hiddenIteratorElement);
        this.advanceLine();
      } else if (!this._inScript && this.nextIs("$for") && (templateForScript = this.isForTemplateScript()) != null) {
        //if template script eg: $if(exp){
        const hiddenIteratorElement = new Element("xiterator", doc);
        hiddenIteratorElement.setAttribute("list", templateForScript[1]);
        hiddenIteratorElement.setAttribute("var", templateForScript[0]);
        if (templateForScript[2]) {
          hiddenIteratorElement.setAttribute("indexvar", templateForScript[2]);
        }
        this._currentParent.addChild(hiddenIteratorElement);
        this._currentParent = hiddenIteratorElement;
        this._current = null;
        this._templateScriptLlist.push(hiddenIteratorElement);
        this.advanceLine();
      } else if (this._templateScriptLlist.length > 0 && this.isEndOfTemplateScript()) {
        //end of template script eg: }
        let ind = templateScriptLlist.size() - 1;
        hiddenIteratorElement = this._templateScriptLlist[ind];
        this._templateScriptLlist.splice(ind, 1);
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
        } else if (this._inScript && this.nextIs("}") && XJS.validate(currentScript.toString().substring(2))) {
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
  advanceLine() {
    return this.readTill("\n").toLowerCase();
  }
  isIfTemplateScript() {
    let line = this.getFullCurrentLine().trim();
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
    let line = this.getFullCurrentLine().trim();
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
        if (valName.join('').trim() == tagName) {
          this._currentIndex = j + 2;
          const text = new Text();
          this._textNodes.push(text);
          text.text = sb.join('');
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
        if (attVal.join('').trim().length > 0) {
          element.setAttribute(attVal.join('').trim(), null);
        }
        attVal = [];
      }
      if (this.nextIs("/>")) {
        this.advance();
        if (attVal.length > 0) {
          element.setAttribute(attVal.join(''), null);
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
        if (attVal.length > 0) {
          element.setAttribute(attVal.join(''), null);
        }
        this._current = null;
        break;
      }
      if (this.nextIs("${")) {
        this.advance();
        let script = [];
        while (!this.nextIs("}") && _validateJS(script.join(''))) {
          this.read(script);
        }
        this.discard('}');
        element.setAttribute("_outxdynattr_" + dynAttr++, script.join(''));
      } else {
        let s = this.read(attVal);
        if (s == '=') {
          let attJoin = attVal.join('');
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
                  val = attVal.join('').substring(0, attVal.length - 1);
                } else {
                  val = attVal.join('');
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
                    modalBind.setVarName("xvmd_" + (Math.random() * 99999));
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
    if (_.keys(modalBindMap).length == 0) {
      let elementId = element.getAttribute("id");
      if (!elementId) {
        elementId = "xmd_" + (Math.random() * 99999);
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
    return sb.join('');
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
    return sb.join('') == s;
  }
  hasMore() {
    return this._currentIndex < this._charArray.length;
  }
  read(sb) {
    let c = this._charArray[this._currentIndex++];
    if (c == '\n') {
      //starting new line
      this._currentLine = [];
    }
    if (!sb) {
      if (this._current == null) {
        this._current = new Text();
        this._textNodes.push(this._current);
        this._currentParent.addChild(this._current);
      }
      this._current.addChar(c);
    } else {
      sb.push(c);
    }
    this._currentLine.push(c);
    return c;
  }
  getFullCurrentLine() {
    let localIndex = this._currentIndex;
    let line = [];
    let c;
    while (localIndex < this._charArray.length - 1 && (c = this._charArray[localIndex++]) != '\n') {
      line.push(c);
    }
    return line.join('');
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