const _ = require('underscore');

const _prepareXScriptsValues = (value, escape) => {
  if (value != null) {
    let pattern = /\$\{(?:(?!\$\{|}).)*}/;
    let last = value;
    while ((matcher = pattern.exec(last)) != null) {
      let js = matcher[1];
      let jsok = js.substring(2, js.length() - 1).replace(/"/g, "&quot;");
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

const _eqIgnoreCase = (s1, s2) => s1.toUpperCase() == s2.toUppercase();

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

const PATTERN_SCRIPT = /\$\{(.*?)}/;
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
    });
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
      this.setHiddenAttribute(name.substring("_hidden_".length()), val);
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
    Attribute value = this.attributes[name];
    delete this.attributes[name];
    this.attributes[newName] = value;
  }
  close() {
    this.isClosed = true;
  }
  toString() {
    return `<${this.name} ${this.getAttributes().map(a => a.toString()).join(' ')}
      ${_.pairs(hiddenAttributes).map(p => '_hidden_' + p[0] + "='" + p[1].replace(/'/g, "\\'") + "' ")}>
    ${!this.notClosed && NO_END_TAG.indexOf("_" + this.name + "_") < 0 ? this.printHTML() + </${this.name}> : ''}`;
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
			let matcher = PATTERN_SCRIPT.exec(a.getValue());
            matcher.forEach(m => {
              if (index != m.index) {
                sbuilder.push(`{v:${a.getDeliminitator()}${a.getValue().substring(index, m.index).replace("\n", "\\n")}${a.getDeliminitator()}},`);
              }
              sbAttr.push(`{s:${a.getDeliminitator()}${m[1].replace("\n", "\\n").replace("&quot;", "\\\"")}${a.getDeliminitator()}},`);
              index = m.index + m[1].length;
            }); 
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
    this.getChildren().filter(n => _!isEmptyText(n)).map(n => n.toString()).join('');
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
        int index = 0;
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
            attValues.push({v:, a.getDeliminitator() + a.getValue().substring(index, m.index).replace("\n", "\\n") + a.getDeliminitator()});
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
    }
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

/*

class XHTMLDocument {
  constructor(){
    this.requiredResourcesList = [];
    this.htmlElement = null;
  }
  protected List<XElement> requiredResourcesList = new ArrayList<XElement>();
      private XElement htmlElement;

      public XHTMLDocument() {
          super("DOCUMENT", null);
          this.root = this;
      }

      @Override
      public String toString() {
          if (!requiredResourcesList.isEmpty()) {
              XElement bodyEl = null;
              XElement headEl = null;
              List<XElement> children = this.getElements();
              for (XElement e : children) {
                  if (e.getName().equalsIgnoreCase("html")) {
                      List<XElement> childrenHtml = e.getElements();
                      boolean foundHead = false;
                      for (XElement ce : childrenHtml) {
                          if (ce.getName().equalsIgnoreCase("body")) {
                              bodyEl = ce;
                          } else if (ce.getName().equalsIgnoreCase("head")) {
                              headEl = ce;
                              foundHead = true;
                          }

                      }
                      if (!foundHead) {
                          headEl = new XElement("head", this);
                          e.insertChild(headEl, 0);
                      }
                  }
              }
              if (bodyEl != null || headEl != null) {
                  for (XElement e : requiredResourcesList) {
                      String source = e.getAttribute("src").trim();
                      if (source.toLowerCase().endsWith(".js")) {
                          XElement scriptEl;
                          if (bodyEl != null) {
                              scriptEl = bodyEl.addElement("script");
                          } else {
                              scriptEl = headEl.addElement("script");
                          }
                          scriptEl.setAttribute("src", "{webctx}/res/" + source);
                          scriptEl.setAttribute("type", "text/javascript");
                      } else if (source.toLowerCase().endsWith("css") && headEl != null) {
                          XElement linkEl = headEl.addElement("link");
                          linkEl.setAttribute("href", "{webctx}/res/" + source);
                          if (e.getAttribute("rel") != null) {
                              linkEl.setAttribute("rel", e.getAttribute("rel"));
                          }
                          if (e.getAttribute("media") != null) {
                              linkEl.setAttribute("media", e.getAttribute("media"));
                          }
                      }
                  }
              }
          }
          StringBuffer sb = new StringBuffer();
          for (XNode n : this.getChildren()) {
              sb.append(n.toString());
          }
          return sb.toString().trim();
      }

      @Override
      public void addChild(XNode node) {
          if (node instanceof XElement && ((XElement) node).getName().equalsIgnoreCase("html")) {
              this.htmlElement = (XElement) node;
          }
          super.addChild(node);
      }

      public List<XElement> getRequiredResourcesList() {
          return requiredResourcesList;
      }

      public String getHtmlStructure() {
          StringBuffer sb = new StringBuffer();
          for (XNode n : this.getChildren()) {
              sb.append(n.toString());
          }
          return sb.toString().trim();
      }

      public void replaceAllTexts(TextReplacer tr) {
          for (XText e : this.getAllTextNodes()) {
              e.setText(tr.replace(e.getText()));
          }
      }

      public void renameAllAttributesWithName(String name, String newName) {
          for (XElement e : this.getAllElements()) {
              e.renameAttribute(name, newName);
          }
      }

      public static interface TextReplacer {
          String replace(String text);
      }

      public XElement getHtmlElement() {
          return htmlElement;
      }

      public String getHTML(Map<String, Object> jsonDynAtt, Map<String, Map<String, Object>> jsonHiddenAtt, Map<String, String> jsonComp) {
          StringBuffer sb = new StringBuffer();
          for (XNode n : this.getChildren()) {
              sb.append(n.getHTML(jsonDynAtt, jsonHiddenAtt, jsonComp));
          }
          return sb.toString().trim();
      }

      @Override
      public Object clone() {
          try {
              return super.clone();
          } catch (CloneNotSupportedException e) {
              throw new RuntimeException("XhtmlDocument should be able to clone", e);
          }
      }
}

const parse = (html) => {
  ca = (html + "\n").toCharArray();
  XHTMLDocument doc = new XHTMLDocument();
  currentParent = doc;
  boolean inScript = false;
  StringBuffer currentScript = null;
  while (hasMore()) {
      String templateIfScript;
      String[] templateForScript;
      if (!inScript && nextIs("$if") && (templateIfScript = isIfTemplateScript()) != null) {
          //if template script eg: $if(exp){
          XElement hiddenIteratorElement = new XElement("xiterator", doc);
          hiddenIteratorElement.setAttribute("count", "(" + templateIfScript + ")?1:0");
          currentParent.addChild(hiddenIteratorElement);
          currentParent = hiddenIteratorElement;
          current = null;
          templateScriptLlist.add(hiddenIteratorElement);
          advanceLine();
      } else if (!inScript && nextIs("$for") && (templateForScript = isForTemplateScript()) != null) {
          //if template script eg: $if(exp){
          XElement hiddenIteratorElement = new XElement("xiterator", doc);
          hiddenIteratorElement.setAttribute("list", templateForScript[1]);
          hiddenIteratorElement.setAttribute("var", templateForScript[0]);
          if (templateForScript[2] != null) {
              hiddenIteratorElement.setAttribute("indexvar", templateForScript[2]);
          }
          currentParent.addChild(hiddenIteratorElement);
          currentParent = hiddenIteratorElement;
          current = null;
          templateScriptLlist.add(hiddenIteratorElement);
          advanceLine();
      } else if (!templateScriptLlist.isEmpty() && isEndOfTemplateScript()) {
          //end of template script eg: }
          XElement hiddenIteratorElement = templateScriptLlist.remove(templateScriptLlist.size() - 1);
          advanceLine();
          closeTag("xiterator");
      } else if (!inScript && isCurrentTextOnlyTag()) {
          readTilCloseTag();
      } else if (!inScript && nextIs("<!--")) {
          advance();
          inComment();
      } else if (!inScript && nextIs("<![")) {
          advance();
          inComment();
      } else if (!inScript && nextIs("</")) {
          advance();
          close();
      } else if (!inScript && !nextIs("< ") && nextIs("<")) {
          advance();
          inTag(doc);
      } else {
          if (!inScript && nextIs("${")) {
              inScript = true;
              currentScript = new StringBuffer();
          } else if (inScript && nextIs("}") && XJS.validate(currentScript.toString().substring(2))) {
              inScript = false;
              currentScript = null;
          }
          char currentChar = read();
          if (inScript) {
              currentScript.append(currentChar);
          }
      }
      if (foundHtml && isCheckingHtmlElement) {
          return null;
      }
  }
  while (!currentParent.isClosed() && currentParent != doc) {
      currentParent.setNotClosed();
      currentParent = currentParent.getParent();
  }
  for (XText text : textNodes) {
      text.normalize(doc);
  }
  return doc;
}

    private void advanceLine() {
        readTill("\n").toLowerCase();
    }

    static Pattern patternIf1 = Pattern.compile("^\\$if\\s{0,}\\((.*?)\\)\\s{0,}\\{$");
    static Pattern patternIf2 = Pattern.compile("^\\$if\\s{1,}(.*?)[^\\)]\\s{0,}\\{$");

    private String isIfTemplateScript() {
        String line = getFullCurrentLine().trim();
        Matcher matcher = patternIf1.matcher(line);
        if (matcher.find()) {
            String val = matcher.group(1);
            return val;
        } else {
            matcher = patternIf2.matcher(line);
            if (matcher.find()) {
                String val = matcher.group(1);
                return val;
            }
        }
        return null;
    }

    static Pattern patternFor1 = Pattern.compile("^\\$for\\s{0,}\\((.*?)\\)\\s{0,}\\{$");
    static Pattern patternFor2 = Pattern.compile("^\\$for\\s{1,}(.*?)[^\\)]\\s{0,}\\{$");
    static Pattern patternForVariables = Pattern.compile("(\\S*?)\\s{1,}in\\s{1,}(\\S*)(\\s{1,}with\\s{1,}(\\S*))?");

    private String[] isForTemplateScript() {
        String line = getFullCurrentLine().trim();
        Matcher matcher = patternFor1.matcher(line);
        String variables = null;
        if (matcher.find()) {
            variables = matcher.group(1);
        } else {
            matcher = patternFor2.matcher(line);
            if (matcher.find()) {
                variables = matcher.group(1);
            }
        }
        if (variables != null) {
            matcher = patternForVariables.matcher(variables);
            if (matcher.find()) {
                String[] val = {matcher.group(1), matcher.group(2), matcher.group(4)};
                return val;
            }
        }
        return null;
    }

    private boolean isEndOfTemplateScript() {
        String line = getFullCurrentLine().trim();
        return line.equals("}");
    }

    private void readTilCloseTag() throws XHTMLParsingException {
        String tagName = currentParent.getName();
        StringBuffer sb = new StringBuffer();
        int j = i;
        while (true) {
            if (ca[j] == '<' && ca[j + 1] == '/') {
                int h = j + 2;
                char c;
                StringBuilder sbName = new StringBuilder();
                while (ca.length > h && (c = ca[h++]) != '>') {
                    sbName.append(c);
                }
                if (sbName.toString().trim().equals(tagName)) {
                    i = j + 2;
                    XText text = new XText();
                    textNodes.add(text);
                    text.setText(sb.toString());
                    currentParent.addChild(text);
                    close();
                    return;
                }
            }
            sb.append(ca[j++]);
        }
    }

    private void inTag(XHTMLDocument doc) {
        String name = readTill(" ", ">", "/>", "\n", "\t").toLowerCase();
        if (isCheckingHtmlElement && name.equalsIgnoreCase("html")) {
            foundHtml = true;
            return;
        }
        XElement element = new XElement(name, doc);
        Map<String, XModalBind> modalBindMap = new HashMap<String, XModalBind>();
        boolean isRequiresTag = false;
        if (name.equalsIgnoreCase("requires")) {
            doc.requiredResourcesList.add(element);
            currentRequires = element;
            isRequiresTag = true;
        } else {
            currentParent.addChild(element);
            currentParent = element;
            current = element;
        }
        StringBuffer attVal = new StringBuffer();
        int dynAttr = 0;
        while (true) {
            if (discard(' ')) {
                if (attVal.toString().trim().length() > 0) {
                    element.setAttribute(attVal.toString().trim(), null);
                }
                attVal = new StringBuffer();
            }
            if (nextIs("/>")) {
                advance();
                if (attVal.length() > 0) {
                    element.setAttribute(attVal.toString(), null);
                }
                if (isRequiresTag) {
                    currentRequires.close();
                    currentRequires = null;
                } else {
                    closeElement();
                }
                break;
            } else if (nextIs(">")) {
                advance();
                if (attVal.length() > 0) {
                    element.setAttribute(attVal.toString(), null);
                }
                current = null;
                break;
            }
            if (nextIs("${")) {
                advance();
                StringBuffer script = new StringBuffer();
                while (!nextIs("}") && XJS.validate(script.toString())) {
                    read(script);
                }
                discard('}');
                element.setAttribute("_outxdynattr_" + dynAttr++, script.toString());
            } else {

                char s = read(attVal);
                if (s == '=') {
                    String attName = attVal.substring(0, attVal.length() - 1).trim();
                    attVal = new StringBuffer();
                    char c = ca[i];
                    if (c == '\'' || c == '"' || c != ' ') {
                        s = c;
                        read(attVal);
                        boolean aspas = c == '\'' || c == '"';
                        while (true) {
                            c = read(attVal);
                            boolean endNoAspas = (!aspas && c == ' ')
                                    || (!aspas && ((c == '/' && ca[i + 1] == '>') || c == '>'));
                            if (endNoAspas || (aspas && c == s && previous(2) != '\\')) {
                                String val;
                                if (endNoAspas) {
                                    i--;
                                    val = attVal.substring(0, attVal.length() - 1);
                                } else {
                                    val = attVal.toString();
                                }
                                element.setAttribute(attName, val);
                                if (attName.equals("data-xbind")) {
                                    String bind = element.getAttribute(attName).trim();
                                    String varName = bind.split("\\.")[0];
                                    if (!varName.equals("window") && !varName.equals("xuser")) {
                                        boundObjects.add(varName.split("\\[")[0]);
                                    }
                                } else if (attName.startsWith("data-xmodal") && !attName.equals("data-xmodal-toggle")) {
                                    XModalBind modalBind = new XModalBind();
                                    if (attName.startsWith("data-xmodal-")) {// has
                                        // a
                                        // bound
                                        // var
                                        modalBind.setVarName(attName.substring("data-xmodal-".length()));
                                    } else {
                                        modalBind.setVarName("xvmd_" + ((int) (Math.random() * 99999)));
                                    }
                                    modalBind.setPath(element.getAttribute(attName).trim());
                                    modalBindMap.put(modalBind.getVarName(), modalBind);
                                }
                                attVal = new StringBuffer();
                                break;
                            }
                        }
                    } else {
                        element.setAttribute(attName, null);
                    }
                }
            }
        }
        if (!modalBindMap.isEmpty()) {
            String elementId = element.getAttribute("id");
            if (elementId == null) {
                elementId = "xmd_" + ((int) (Math.random() * 99999));
                element.setAttribute("id", elementId);
            }
            String toggle = element.getAttribute("data-xmodal-toggle");
            if (toggle != null) {
                XModalBind bind = modalBindMap.get(toggle);
                if (bind != null) {
                    bind.setToggle(true);
                }
            }
            for (Map.Entry<String, XModalBind> e : modalBindMap.entrySet()) {
                if (modalBindMap.size() == 1) {
                    e.getValue().setToggle(true);
                }
                e.getValue().setElementId(elementId);
            }
            boundModals.putAll(modalBindMap);
        }
        prepareElementsWithSource(element);
    }

    private void prepareElementsWithSource(XElement element) {
        if (element.getName().toUpperCase().equals("SCRIPT")) {
            String src = element.getAttribute("src");
            if (src != null && src.startsWith("/")) {
                element.setAttribute("src", "{webctx}" + src);
            }
        }
        if (element.getName().toUpperCase().equals("A")) {
            String href = element.getAttribute("href");
            if (href != null && href.startsWith("/")) {
                element.setAttribute("href", "{webctx}" + href);
            }
        }
    }

    private boolean isCurrentTextOnlyTag() {
        // put text only tag here
        String textOnlyTags = " script ";
        return currentParent != null && textOnlyTags.contains(currentParent.getName());
    }

    private char previous(int t) {
        return ca[i - t];
    }

    private boolean discard(char c) {
        int j = i;
        boolean discarded = false;
        while (ca[j] == c) {
            j++;
            discarded = true;
        }
        i = j;
        return discarded;
    }

    private void close() throws XHTMLParsingException {
        String tagName = null;
        try {
            tagName = readTill(">").toLowerCase().trim();
            closeTag(tagName);
        } catch (Exception e) {
            throw new XHTMLParsingException("Error closing tag " + (tagName != null ? tagName : ""));
        }
    }

    private void closeTag(String tagName) {
        if (tagName.equalsIgnoreCase("requires")) {
            currentRequires.close();
            currentRequires = null;
        } else {
            XElement toClose = current instanceof XElement ? (XElement) current : currentParent;
            while (!tagName.equals(toClose.getName())) {
                if (!toClose.isClosed()) {
                    toClose.setNotClosed();
                }
                XNode prev = toClose;
                while (true) {
                    prev = prev.getPrevious();
                    if (prev == null) {
                        toClose = toClose.getParent();
                        break;
                    } else if (prev instanceof XElement && !((XElement) prev).isClosed()) {
                        toClose = (XElement) prev;
                        break;
                    }
                }
            }
            toClose.close();
            currentParent = toClose.getParent();

            current = null;
        }
        i++;
    }

    private void closeElement() {
        currentParent = current.getParent();
        current.close();
        current = null;
    }

    private String readTill(String... s) {
        StringBuffer sb = new StringBuffer();
        int j = i;
        main:
        while (true) {
            for (int z = 0; z < s.length; z++) {
                if (nextIs(s[z], j)) {
                    break main;
                }
            }
            sb.append(ca[j++]);
        }
        lastAdvance = j - i;
        advance();
        return sb.toString();
    }

    private void inComment() {
        current = new XComment();
        currentParent.addChild(current);
        while (true) {
            if (nextIs("-->")) {
                advance();
                current.close();
                current = null;
                break;
            }
            read();
        }
    }

    private void advance() {
        i += lastAdvance;
    }

    private boolean nextIs(String s) {
        return nextIs(s, null);
    }

    private boolean nextIs(String s, Integer index) {
        StringBuffer sb = new StringBuffer();
        lastAdvance = s.length();
        int usedIndex = index == null ? i : index;
        int j = usedIndex;
        for (; j < s.length() + usedIndex && j < ca.length; j++) {
            sb.append(ca[j]);
        }
        return sb.toString().equals(s);
    }

    // private void rewind(int t) {
    // i -= t;
    // }

    private boolean hasMore() {
        return i < ca.length;
    }

    private char read() {
        return read(null);
    }

    private char read(StringBuffer sb) {
        char c = ca[i++];
        if (c == '\n') {
            //starting new line
            currentLine = new StringBuilder();
        }
        if (sb == null) {
            if (current == null) {
                current = new XText();
                textNodes.add((XText) current);
                currentParent.addChild(current);
            }
            current.addChar(c);
        } else {
            sb.append(c);
        }
        currentLine.append(c);
        return c;
    }

    private String getFullCurrentLine() {
        int localIndex = i;
        StringBuilder line = new StringBuilder(currentLine);
        char c;
        while (localIndex < ca.length - 1 && (c = ca[localIndex++]) != '\n') {
            line.append(c);
        }
        return line.toString();
    }

    public static void main(String[] args) {
        try {
            XHTMLParser parser = new XHTMLParser();
            XHTMLDocument doc = parser
                    .parse(XFileUtil.instance.readFile("/Users/eduardo/work/eclipseworkspaces/xloja/Testes/teste.html"));

            // System.out.println("html " + doc.getHtmlElement());
            System.out.println(doc.toJson());

            // parser = new XHTMLParser();
            // doc = parser.parse("<!DOCTYPE html><html></html>");
            // System.out.println("html " + doc.getHtmlElement());
            // System.out.println(doc.toString());
            //
            // parser = new XHTMLParser();
            // doc = parser.parse("<body>test</body>");
            // System.out.println("html " + doc.getHtmlElement());
            // System.out.println(doc.toString());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public Set<String> getBoundObjects() {
        return boundObjects;
    }

    public Map<String, XModalBind> getBoundModals() {
        return boundModals;
    }

    public boolean hasHtmlElement(String content) throws XHTMLParsingException {
        isCheckingHtmlElement = true;
        parse(content);
        return foundHtml;
    }
}
*/