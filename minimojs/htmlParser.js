const _ = require('underscore');
const esprima = require('esprima');

const _prepareXScriptsValues = (value) => {
  let last = value;
  if (value != null) {
    let pattern = /\$\{(?:(?!\$\{|}).)*}/g;
    while ((matcher = pattern.exec(last)) != null) {
      let js = matcher[0];
      let jsok = js.substring(2, js.length - 1).replace(/"/g, "&quot;");
      last = `${value.substring(0, matcher.index)}<xscr scr="${jsok}"></xscr>${value.substring(matcher.index+js.length)}`;
    }
  }
  return last;
}

const _getAllTextNodes = (element) =>
  _.flatten(element.getChildren().map(e => {
    let list = [];
    if (e instanceof Element) {
      list.push(_getAllTextNodes(e));
    } else if (e instanceof Text) {
      list.push(e);
    }
  }));

const _generateId = () => "id_" + Math.random();

const _isEmptyText = (node) => node instanceof Text && !(node instanceof Comment) && node.getText().trim() == '';

const _eqIgnoreCase = (s1, s2) => s1.toUpperCase() == s2.toUpperCase();

const _validateJS = (js) => {
  try{
    esprima.parse(js.replace('"', '\\"'));
	return true;
  }catch(e){
	return false;
  }
}

class Node {
  constructor(){
    this.buffer = [];
    this.parent = null;
    this.hiddenAttributes = {};
    this.tempAttributes = {};
  }
  getNext() {
    let index = this.getParent().getChildren().indexOf(this);
    if (index == this.getParent().getChildren().length - 1) {
        return null;
    }
    return this.getParent().getChildren()[index + 1];
  }
  getPrevious() {
    let index = this.getParent().getChildren().indexOf(this);
    if (index == 0) {
      return null;
    }
    return this.getParent().getChildren()[index - 1];
  }
  addAfter(node) {
    let index = this.getParent().getChildren().indexOf(this);
    if (index == this.getParent().getChildren().length - 1) {
      this.getParent().addChild(node);
    } else {
      this.getParent().insertChildren(node, index + 1);
    }
  }
  addBefore(node) {
    let index = this.getParent().getChildren().indexOf(this);
    if (index == 0) {
        this.getParent().insertChildren(node, 0);
    } else {
        this.getParent().insertChildren(node, index);
    }
  }
  getParent() {
    return this.parent;
  }
  addChar(c) {
    this.buffer.push(c);
  }
  addString(s) {
    this.buffer.push(s);
  }
  toString() {
    return this.buffer.join('');
  }
  remove() {
    this.getParent().getChildren().remove(this);
    this.parent = null;
  }
  printHiddenAttributesInJsonFormat() {
    return _.pairs(this.hiddenAttributes).map(pair => `${pair[0]}:'${pair[1].replace(/'/g, "\\\\'")}'`).join('');
  }
  setHiddenAttribute(attrName, val) {
    if (_.has(this.hiddenAttributes, attrName) == null) {
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.substring(1, val.length - 1);
      }
      this.hiddenAttributes[attrName] = val;
    }
  }
  getHiddenAttribute(attrName) {
    return this.hiddenAttributes[attrName];
  }
  hasHiddenAttributes() {
    return _.keys(this.hiddenAttributes).length > 0;
  }
  getTempAttribute(name) {
    return this.tempAttributes[name];
  }
  setTempAttribute(name, value) {
    this.tempAttributes[name] = value;
  }
}

class Text extends Node {
  constructor(){
    this.text = null;
  }
  getText() {
    return !text || text.trim() == "" ? this.buffer.join('') : text;
  }
  _getNonNullText(fn){
	let text = getText();
  	if (!text || text.trim() == '') {
	  return '';
	}
	return (fn || ((f)=>f))(text);	
  }
  setText(text) {
    this.text = text;
  }
  normalize(doc) {
    let text = _getNonNullText();
    if (text == "") {
        return;
    }
	let pattern = /\$\{(.*?)}/g;
    let index = 0;
    let t = new Text();
    this.addAfter(t);
    this.remove();
    while ((m = patter.exec(text)) != null) {
      if (index != m.index) {
        let newText = text.substring(index, m.index);
        if (newText.length > 0) {
          let tNew = new Text();
          tNew.setText(newText);
          t.addAfter(tNew);
          t = tNew;
        }
      }
      let x = new Element("xscript", doc);
      x.setAttribute("data-xscript", m[1]);
      _.pairs(this.hiddenAttributes).forEach(pair => {
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
        tNew.setText(newText);
        t.addAfter(tNew);
        t = tNew;
      }
    }
  }
  toString() {
    let textValue = _prepareValueInXScript(getText(), _eqIgnoreCase(this.getParent().getName(), "script"));
    if (!_isEmpty(this.hiddenAttributes)) {
      // separete xscripts
      let doc = null;
      try {
        doc = new HTMLParser().parse(`<root>${textValue}</root>`);
      } catch (ee) {
        throw new Error(`UNKNOWN ERROR IN XTEXT TO STRING: ${e.message}`);
      }
      textValueg = doc.getChildren().get(0).getChildren().map(child => {
        if (child instanceof XText) {
          return child.getText();
        } else {
          if (!child.getName().toLowerCase() == "xscript") {
            throw new Error(
	      		  `THERE SHOUDN'T BE A TAG DIFFERENT THAN XSCRIPT INSIDE A XTEXT. TAG: ${child.getName()}`);
          }
          _.pairs(hiddenAttributes).forEach(e => child.setHiddenAttribute(e[0], e[1]));
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
  close() {}
  getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp) {
    return this._getNonNullText();
  }
}

const NO_END_TAG = "_base_link_meta_hr_br_wbr_area_img_track_embed_param_source_col_input_keygen_";
class Element extends Node {
  constructor(name, root) {
    this.children = [];
    this.attributes = {};
    this.innerText = null;
    this.tagText = null;
    this.name = name;
    this.notClosed = false;
    this.isClosed = false;
    this.isComponent = false;
    this.componentName = null;
    this.root = root;
	this.lastAdvance = 0;
  }
  getElementsByName(name) {
    return _.flatten(this.getElements()
      .filter(e => e instanceof Element)
      .map(e => {
        let list = [];
        if (_eqIgnoreCase(e.getName(), name)) {
          list.push(e);
        }
        list.push(e.getElementsByName(name));
        return list;
      }));
  }
  findChildrenByName(name) {
    return this.getElements().filter(e => e instanceof Element && _eqIgnoreCase(e.getName(), name));
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
    let e = new Element(name, this.root);
    this.addChild(e);
    return e;
  }
  addChildList(list) {
    list.forEach(n => this.addChild(n));
  }
  addChild(node) {
    node.parent = this;
    this.children.push(node);
  }
  insertChild(node, index) {
    node.parent = this;
    this.children.splice(index, 0, node);
  }
  insertChildAfter(node, after) {
    this.insertChildren(node, this.children.indexOf(after) + 1);
  }
  insertChildBefore(node, before) {
    this.insertChildren(node, this.children.indexOf(before));
  }
  getChildren() {
    return this.children;
  }
  getElements() {
    return this.getChildren().filter(e => e instanceof Element);
  }
  getInnerText() {
    return this.innerText;
  }
  getTagText() {
    return this.tagText;
  }
  getAttributes() {
    return _.clone(attributes);
  }
  setAttribute(name, val) {
    if (name.startsWith("_hidden_")) {
      this.setHiddenAttribute(name.substring("_hidden_".length), val);
    } else {
      let a = new Attribute(name, val);
      this.attributes[a.getName()] = a;
    }
  }
  getAttribute(name) {
    return _.has(this.attributes, name) ? this.attributes[n].getValue() : null;
  }
  getAttributeObject(n) {
    return this.attributes[n];
  }
  getName() {
    return this.name;
  }
  renameAttribute(name, newName) {
    this.attributes[newName] = this.attributes[name];
    delete this.attributes[name];
  }
  close() {
    this.isClosed = true;
  }
  toString() {
    return `<${this.name} ${this.getAttributes().map(a => a.toString()).join(' ')} ` +
      _.pairs(hiddenAttributes).map(p => `_hidden_${p[0]}='${p[1].replace(/'/g, "\\'")}' `).join(' ') + '>' +
      (!this.notClosed && NO_END_TAG.indexOf(`_${this.name}_`) < 0 ? `${this.printHTML()}</${this.name}>` : '');
  }
  toJson() {
    if (_eqIgnoreCase(this.name, "xscr")) {
	  const sb = [];
      const att = this.getAttribute("scr");
      sb.push(`{x: ${att.getDeliminitator()}${att.getValue()}${att.getDeliminitator()}`);

      if (this.hasHiddenAttributes()) {
      	sb.push(`,h:{${thisprintHiddenAttributesInJsonFormat()}}`);
      }
      sb.push("}");
      return sb.join('');
    } else {
      const sbAttr = _.flatten(this.getAttributes().map(a => {
      	const sbuilder = [`'${a.getName()}':[`];
          if (a.getValue()) {
            let index = 0;
			let pattern = /\$\{(.*?)}/g;
			while((m = pattern.exec(a.getValue())) != null){
              if (index != m.index) {
                sbuilder.push(`{v:${a.getDeliminitator()}${a.getValue().substring(index, m.index).replace("\n", "\\n")}${a.getDeliminitator()}},`);
              }
              sbAttr.push(`{s:${a.getDeliminitator()}${m[1].replace("\n", "\\n").replace("&quot;", "\\\"")}${a.getDeliminitator()}},`);
              index = m.index + m[1].length;
            }
            if (index < a.getValue().length) {
              sbAttr.push(`{v:${a.getDeliminitator()}${a.getValue().substring(index, a.getValue().length).replace("\n", "\\n")}${a.getDeliminitator()}},`);
            }
          }
          sbAttr.push("],");
		  return sbAttr;
        })).join('');
	  const sb = [`{n:'${this.name}',`];
      if (sbAttr.length > 0) {
        sb.push(`a:{${sbAttr}},`);
      }
      const sbChildren = this.getChildren().filter(n => !_isEmptyText(n)).map(n => n.toJson().trim()).filter(t => t != '').join(',');

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
    this.getChildren().filter(n => !_isEmptyText(n)).map(n => n.toString()).join('');
  }
  setNotClosed() {
    if (this.getParent()) {
      this.notClosed = true;
      this.getChildren().forEach(n => this.getParent().addChild(n));
      this.getChildren().clear();
    }
  }
  isClosed() {
    return this.isClosed;
  }
  remove() {
    super.remove();
  }
  replaceWith(node) {
    this.getParent().insertChildAfter(node, this);
    this.remove();
  }
  removeAllChildren() {
    this.children = [];
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
    attributeNames.forEach(name => this.attributes.remove(name));
  }
  setHiddenAttributeOnChildren(attr, val) {
    this.getChildren().forEach(node => {
      node.setHiddenAttribute(attr, val);
      if (node instanceof Element && !node.getName() == "_x_text_with_attributes") {
        node.setHiddenAttributeOnChildren(attr, val);
      }
    });
  }
  getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp) {
    const xcompId = this.getHiddenAttribute("xcompId");
    if (xcompId) {
      jsonComp[xcompId] = this.getHiddenAttribute("xcompName");
    }
    const sb = ["<"];
    let dynId = this.getAttribute("data-xdynid");
    if (_._eqIgnoreCase(this.name, "xscript")) {
      const att = this.getAttribute("scr");
      sb.push(`xscript data-xscript=${att.getDeliminitator()}${att.getValue()}${att.getDeliminitator()}`);
      if (this.hasHiddenAttributes()) {
        dynId = dynId || _generateId();
        sb.push(` data-xdynid='${dynId}' `);
        jsonHiddenAtt[dynId] = _.clone(this.hiddenAttributes);
      }
      sb.push("></xscript>");
      return sb.join('');
    } else {
      sb.append(this.name);
      this.getAttributes().forEach(a => {
        let isDynAtt = false;
        if (a.getValue()) {
          let matcher = PATTERN_SCRIPT.matcher(a.getValue());
          let index = 0;
          let attValues;
          matcher.forEach(m => {
            isDynAtt = true;
            if (dynId == null) {
              dynId = XComponents.generateId();
              sb.push(` data-xdynid='${dynId}' `);
            }
            // get dynamic atts for element
            let dynAtts = jsonDynAtt[dynId];
            if (!dynAtts) {
              dynAtts = {};
              jsonDynAtt[dynId] = dynAtts;
            }
            // get values of the att
            attValues = dynAtts[a.getName()];
            if (!attValues) {
              attValues = [];
              dynAtts[a.getName()] = attValues;
            }
            if (index != m.index) {
              attValues.push({v: a.getDeliminitator() + a.getValue().substring(index, m.index).replace("\n", "\\n") + a.getDeliminitator()});
            }
  		  index = m.index + m[1].length;
            attValues.push({s: a.getDeliminitator() + m[1].replace("\n", "\\n") + a.getDeliminitator()});
            if (isDynAtt && index < a.getValue().length) {
               attValues.push({v: a.getDeliminitator() + a.getValue().substring(index, a.getValue().length).replace("\n", "\\n") + a.getDeliminitator()});
            }
  	    });
          if (!isDynAtt) {
            sb.push(`${a.toString()}`);
          }
        }
      });
      if (this.hiddenAttributes.length == 0) {
        dynId = this.getAttribute("data-xdynid");
        if (!dynId) {
        	dynId = _generateId();
          sb.push(` data-xdynid='${dynId}' `);
        }
        jsonHiddenAtt[dynId] = _.clone(this.hiddenAttributes);
      }
      if (!this.notClosed && NO_END_TAG.indexOf("_" + this.name + "_") < 0) {
        const sbChild = [];
        const sbHiddenIterators = [];
        let i = 0;
        this.getChildren().forEach(n => {
          if (!isEmptyText(n)) {
	        let hiddenIterator = n instanceof Element && n.getName().equalsIgnoreCase("xiterator");
            if (!hiddenIterator) {
              sbChild.push(n.getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp));
            } else {
              // hidden iterator
	  		sbHiddenIterators.push(`${n.getHiddenAttribute("xiterId")},${i}|`);
            }
            i++;
          }
        });
        if (sbHiddenIterators.length > 0) {
          sb.push(` data-hxiter='${sbHiddenIterators}'`);
        }
        sb.push(`>${sbChild}</${this.name}>`);
      } else {
        sb.push(">");
      }
      return sb.join('');
    }
  }
}


class HTMLDoc extends Element{
  constructor(){
    super("DOCUMENT", this);
    this.requiredResourcesList = [];
    this.htmlElement = null;
  }
  _prepareHTML(){
    if (this.requiredResourcesList.length > 0) {
      this.getElements().filter(e => _eqIgnoreCase(e.getName(), "html")).forEach(htmlElement => {
        htmlElement.getElements().forEach(ce => {
          if (!this._bodyElement && ce.getName().equalsIgnoreCase("body")) {
            this._bodyElement = ce;
          } else if (!this._headElement && ce.getName().equalsIgnoreCase("head")) {
            this._headElement = ce;
          }
        });
        if (!this._headElement) {
          this._headElement = new Element("head", this);
          htmlElement.insertChild(this._headElement, 0);
        }
      });
      if (this._bodyElement || this._headElement) {
        this.requiredResourcesList.forEach(e => {
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
            const linkEl                     = this._headElement.addElement("link");
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
    return this.getChildren().map(n => n.toString()).join('').trim();
  }
  addChild(node) {
    if (node instanceof Element && _eqIgnoreCase(node.getName(), "html")) {
      this.htmlElement = node;
    }
    super.addChild(node);
  }
  getRequiredResourcesList() {
    return this.requiredResourcesList;
  }
  getHtmlStructure() {
    return this.getChildren().map(n => n.toString()).join('').trim();
  }
  replaceAllTexts(replacer) {
    this.getAllTextNodes().forEach(e => e.setText(replacer.replace(e.getText())));
  }
  renameAllAttributesWithName(name, newName) {
    this.getAllElements().forEach(e => e.renameAttribute(this.name, newName));
  }
  getHtmlElement() {
    return htmlElement;
  }
  getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp) {
    this.getChildren().map(n => n.getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp)).join('').trim();
  }
}

class HTMLParser{
  constructor(){
    this.textNodes = [];
    this.doc = new HTMLDoc();
    this.currentParent = doc;
    this.inScript = false;
    this.currentScript = null;
    this.current = null;
    this.templateScriptLlist = [];
    this.currentIndex = 0;
	this.isCheckingHtmlElement = false;
	this.foundHtml = false;
	this.currentRequires = false;
	this.boundObjects = [];
	this.boundModals = {};
	this.currentLine = null;
  }
  parse(html){
	this.ca = (html + "\n").toCharArray();
    while (this.hasMore()) {
      let templateIfScript;
      let templateForScript;
      if (!inScript && this.nextIs("$if") && (templateIfScript = this.isIfTemplateScript()) != null) {
        //if template script eg: $if(exp){
        const hiddenIteratorElement = new Element("xiterator", doc);
        hiddenIteratorElement.setAttribute("count", `(${templateIfScript})?1:0`);
        currentParent.addChild(hiddenIteratorElement);
        currentParent = hiddenIteratorElement;
        this.current = null;
        templateScriptLlist.push(hiddenIteratorElement);
        this.advanceLine();
      } else if (!inScript && this.nextIs("$for") && (templateForScript = this.isForTemplateScript()) != null) {
        //if template script eg: $if(exp){
        const hiddenIteratorElement = new Element("xiterator", doc);
        hiddenIteratorElement.setAttribute("list", templateForScript[1]);
        hiddenIteratorElement.setAttribute("var", templateForScript[0]);
        if (templateForScript[2]) {
            hiddenIteratorElement.setAttribute("indexvar", templateForScript[2]);
        }
        this.currentParent.addChild(hiddenIteratorElement);
        this.currentParent = hiddenIteratorElement;
        this.current = null;
        this.templateScriptLlist.push(hiddenIteratorElement);
        this.advanceLine();
      } else if (this.templateScriptLlist.length > 0 && this.isEndOfTemplateScript()) {
        //end of template script eg: }
        let ind = templateScriptLlist.size() - 1;
        hiddenIteratorElement = this.templateScriptLlist[ind];
        this.templateScriptLlist.splice(ind, 1);
        this.advanceLine();
        this.closeTag("xiterator");
      } else if (!inScript && this.isCurrentTextOnlyTag()) {
        this.readTilCloseTag();
      } else if (!inScript && this.nextIs("<!--")) {
        this.advance();
        this.inComment();
      } else if (!inScript && this.nextIs("<![")) {
        this.advance();
        this.inComment();
      } else if (!inScript && this.nextIs("</")) {
        this.advance();
        this.close();
      } else if (!inScript && !nextIs("< ") && nextIs("<")) {
        this.advance();
        this.inTag(doc);
      } else {
        if (!inScript && this.nextIs("${")) {
          inScript = true;
          this.currentScript = [];
        } else if (inScript && this.nextIs("}") && XJS.validate(currentScript.toString().substring(2))) {
          inScript = false;
          this.currentScript = null;
        }
        const currentChar = read();
        if (inScript) {
          this.currentScript.append(currentChar);
        }
      }
      if (this.foundHtml && this.isCheckingHtmlElement) {
        return null;
      }
    }
    while (!this.currentParent.isClosed() && this.currentParent != doc) {
      this.currentParent.setNotClosed();
      this.currentParent = this.currentParent.getParent();
    }
    this.textNodes.forEach(text => {
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
    let tagName = this.currentParent.getName();
    const sb = [];
    let j = this.currentIndex;
    while (true) {
      if (ca[j] == '<' && ca[j + 1] == '/') {
        let h = j + 2;
        let c;
        let valName = [];
        while (ca.length > h && (c = ca[h++]) != '>') {
          valName.push(c);
        }
        if (sbName.join('').trim() == tagName) {
          this.currentIndex = j + 2;
          const text = new Text();
          this.textNodes.push(text);
          text.setText(sb.join(''));
          this.currentParent.addChild(text);
          this.close();
          return;
        }
      }
      sb.push(ca[j++]);
    }
  }
  inTag(doc) {
    let name = readTill(" ", ">", "/>", "\n", "\t").toLowerCase();
    if (this.isCheckingHtmlElement && name.equalsIgnoreCase("html")) {
        this.foundHtml = true;
        return;
    }
    let element = new Element(name, doc);
    let modalBindMap = {};
    let isRequiresTag = false;
    if (_eqIgnoreCase(name, "requires")) {
        this.doc.requiredResourcesList.push(element);
        this.currentRequires = element;
        isRequiresTag = true;
    } else {
        this.currentParent.addChild(element);
        this.currentParent = element;
        this.current = element;
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
                this.currentRequires.close();
                this.currentRequires = null;
            } else {
                this.closeElement();
            }
            break;
        } else if (this.nextIs(">")) {
            this.advance();
            if (attVal.length > 0) {
                element.setAttribute(attVal.join(''), null);
            }
            this.current = null;
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
                let attName = attVal.substring(0, attVal.length - 1).trim();
                attVal = [];
                let c = ca[this.currentIndex];
                if (c == '\'' || c == '"' || c != ' ') {
                    s = c;
                    this.read(attVal);
                    let aspas = c == '\'' || c == '"';
                    while (true) {
                        c = this.read(attVal);
                        let endNoAspas = (!aspas && c == ' ')
                                || (!aspas && ((c == '/' && ca[this.currentIndex + 1] == '>') || c == '>'));
                        if (endNoAspas || (aspas && c == s && this.previous(2) != '\\')) {
                            let val;
                            if (endNoAspas) {
                                this.currentIndex--;
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
                                if (attName.startsWith("data-xmodal-")) {// has
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
        _.extend(boundModals, modalBindMap);
    }
    this.prepareElementsWithSource(element);
  }
  prepareElementsWithSource(element) {
    if (element.getName().toUpperCase().equals("SCRIPT")) {
      let src = element.getAttribute("src");
      if (src && src.startsWith("/")) {
        element.setAttribute("src", `{webctx}${src}`);
      }
    }
    if (element.getName().toUpperCase().equals("A")) {
      let href = element.getAttribute("href");
      if (href && href.startsWith("/")) {
        element.setAttribute("href", `{webctx}${href}`)
	  }
    }
  }
  isCurrentTextOnlyTag() {
    // put text only tag here
    let textOnlyTags = " script ";
    return this.currentParent != null && textOnlyTags.indexOf(this.currentParent.getName()) >= 0;
  }
  previous(t) {
    return this.ca[this.currentIndex - t];
  }
  discard(c) {
    let j = this.currentIndex;
    let discarded = false;
    while (ca[j] == c) {
        j++;
        discarded = true;
    }
    this.currentIndex = j;
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
    if (tagName.equalsIgnoreCase("requires")) {
      this.currentRequires.close();
      this.currentRequires = null;
    } else {
      let toClose = this.current instanceof Element ? this.current : this.currentParent;
      while (tagName != toClose.getName()) {
        if (!toClose.isClosed()) {
          toClose.setNotClosed();
        }
        let prev = toClose;
        while (true) {
          prev = prev.getPrevious();
          if (!prev) {
            toClose = toClose.getParent();
            break;
          } else if (prev instanceof Element && !prev.isClosed()) {
            toClose = prev;
            break;
          }
        }
      }
      toClose.close();
      this.currentParent = toClose.getParent();
      this.current = null;
    }
    this.currentIndex++;
  }
  closeElement() {
  	this.currentParent = current.getParent();
    this.current.close();
    this.current = null;
  }
  readTill(...s) {
    let sb = [];
    let j = this.currentIndex;
    main: while (true) {
        for (let z = 0; z < s.length; z++) {
            if (this.nextIs(s[z], j)) {
                break main;
            }
        }
        sb.push(ca[j++]);
    }
    this.lastAdvance = j - this.currentIndex;
    this.advance();
    return sb.join('');
  }
  inComment() {
	this.current = new Comment();
	this.currentParent.addChild(this.current);
	while (true) {
	  if (this.nextIs("-->")) {
	    this.advance();
	    this.current.close();
	    this.current = null;
	    break;
	  }
	  this.read();
	}
  }
  advance() {
    i += this.lastAdvance;
  }
  nextIs(s, index) {
    const sb = [];
    this.lastAdvance = s.length;
    let usedIndex = index || this.currentIndex;
    let j = usedIndex;
    for (; j < s.length + usedIndex && j < ca.length; j++) {
        sb.push(ca[j]);
    }
    return sb.join('') == s;
  }
  hasMore() {
    return this.currentIndex < ca.length;
  }
  read(sb) {
    let c = ca[this.currentIndex++];
    if (c == '\n') {
      //starting new line
      this.currentLine = [];
    }
    if (!sb) {
      if (this.current == null) {
        this.current = new Text();
        this.textNodes.push(this.current);
        this.currentParent.addChild(this.current);
      }
      this.current.addChar(c);
    } else {
      sb.push(c);
    }
    this.currentLine.push(c);
    return c;
  }
  getFullCurrentLine() {
    let localIndex = this.currentIndex;
    let line = [];
    let c;
    while (localIndex < ca.length - 1 && (c = ca[localIndex++]) != '\n') {
        line.push(c);
    }
    return line.join('');
  }
  getBoundObjects() {
    return this.boundObjects;
  }
  getBoundModals() {
    return this.boundModals;
  }
  hasHtmlElement(content) {
    this.isCheckingHtmlElement = true;
    this.parse(content);
    return this.foundHtml;
  }
}
