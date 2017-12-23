require('./test');
require('chai').should();
const rewire = require('rewire');
const expect = require('chai').expect;
const _ = require('underscore');
const assert = require('assert');
const process = require('process');
const htmlParser = require('../minimojs/htmlparser');
const _htmlParser = rewire('../minimojs/htmlparser');

describe('Test html parser', function () {
  it('Test private functions', () => {
    let textWitScript = _htmlParser.__get__('_prepareMScriptsValues')('Test 123 ${fn(1,2,"3") + "x"}, lorem');
    expect(textWitScript).is.equal('Test 123 <xscr scr="fn(1,2,&quot;3&quot;) + &quot;x&quot;"></xscr>, lorem');
    //_htmlParser._isEmptyText
    expect(_htmlParser.__get__('_eqIgnoreCase')('asdf', 'ASdf')).is.equal(true);
    expect(_htmlParser.__get__('_eqIgnoreCase')('asdf', 'ssdf')).is.equal(false);
    expect(_htmlParser.__get__('_validateJS')('var a = 1;')).is.equal(true);
  });

  it('Test dom', () => {
    let doc = new htmlParser.HTMLDoc();
    let htmlEl = doc.addElement('html');
    let script = new htmlParser.Text('console.log("1");');
    htmlEl.addElement('head').addElement('script').addChild(script);
    let body = htmlEl.addElement('body');
    let comment = new htmlParser.Comment('Comment');
    body.addChild(comment);
    let div = body.addElement('div');
    div.setAttribute("id", "1234");
    div.setAttribute("att", "val");
    let divText = new htmlParser.Text('Div of id 1234');
    div.addChild(divText);
    let bodyText = new htmlParser.Text('Text 1234 "aa"');
    body.addChild(bodyText);

    let jsonDoc = doc.toJson();

    expect(jsonDoc.n).is.eq('DOCUMENT');
    let jsonHtml = jsonDoc.c[0];
    expect(jsonHtml.n).is.eq('html');
    expect(jsonHtml.c).to.have.lengthOf(2);
    let jsonHead = jsonHtml.c[0];
    expect(jsonHead.n).is.eq('head');
    expect(jsonHead.c[0].n).is.eq('script');
    expect(jsonHead.c[0].c[0]).is.eq('console.log("1");');
    let jsonBody = jsonHtml.c[1];
    expect(jsonBody.n).is.eq('body');
    expect(jsonBody.c[0].n).is.eq('div');
    expect(jsonBody.c[0].c[0]).is.eq('Div of id 1234');
    expect(jsonBody.c[1]).is.eq('Text 1234 "aa"');

    //expect(doc.toHTML()).is.eq('<html><head><script>console.log("1");</script></head><body><!--Comment--><div id="1234" att="val">Div of id 1234</div>Text 1234 "aa"</body></html>');
  });

  it('Test simple parsing', () => {
    let parser = new htmlParser.HTMLParser();
    let doc = parser.parse(`
      <html>
        <head>
          <script>console.log("1");</script>
        </head>
        <body>
          <!--Comment-->
          <div id="1234" att="val" a="A" b='BB' c=C d=DD f=" A \${a(\\"a\\")} B \${1+b} C ">Div of id 1234</div>
          <br>
          Text 1234 "aa"
          <div><div>a</div><br><span>b</span><div><span>a</span><span>b</span></div></div>
          $if(a == 1){
            <div dyn="\${a.op() + '3'}" att="val">Div of id 1234</div>
            <div>
            $for(x in xx with xxx){
              xxxx
            }    
            </div>
          }
          $for(a in list with i){
            test
          }
          \${obj.label}
        </body>
      </html>
    `);
    let head = doc.htmlElement.getElements().filter(e => e.name == 'head');
    expect(head).to.have.lengthOf(1);
    expect(head[0].getElementsByName('script')[0].innerText).to.be.equal('console.log("1");');
    let body = doc.htmlElement.getElements().filter(e => e.name == 'body');
    expect(body).to.have.lengthOf(1);
    let list = body[0].children;
    let currIndex = 0;
    let node;
    const discardEmptyText = () => {
      while((node = list[currIndex++]) && node instanceof htmlParser.Text && node.text.trim() == '');
    };
    discardEmptyText();
    expect(node).to.be.instanceOf(htmlParser.Comment);

    discardEmptyText();
    expect(node).to.be.instanceOf(htmlParser.Element);
    expect(node.name).to.be.equal('div');
    expect(node.innerText).to.be.equal('Div of id 1234');
    expect(node.getAttribute("id")).to.be.equal('1234');
    expect(node.getAttribute("att")).to.be.equal('val');
    expect(node.getAttribute("a")).to.be.equal('A');
    expect(node.getAttribute("b")).to.be.equal('BB');
    expect(node.getAttribute("c")).to.be.equal('C');
    expect(node.getAttribute("d")).to.be.equal('DD');
    expect(node.getAttribute("f")).to.be.equal(' A ${a("a")} B ${1+b} C ');
    let attr = node.getAttributeJsonFormat("f").toJson().f;
    expect(attr).to.have.lengthOf(5);
    expect(attr[0]).to.be.equal(' A ');
    expect(attr[1].s).to.be.equal('a("a")');
    expect(attr[2]).to.be.equal(' B ');
    expect(attr[3].s).to.be.equal('1+b');
    expect(attr[4]).to.be.equal(' C ');

    discardEmptyText();
    expect(node.name).to.be.equal('br');
    expect(node.children).to.have.lengthOf(0);

    discardEmptyText();
    expect(node.text.trim()).to.be.equal('Text 1234 "aa"');

    discardEmptyText();
    expect(node.name).to.be.equal('div');
    expect(node.children).to.have.lengthOf(4);
    expect(node.children[0].name).is.equal('div');
    expect(node.children[0].innerText).is.equal('a');
    expect(node.children[1].name).is.equal('br');
    expect(node.children[2].name).is.equal('span');
    expect(node.children[2].innerText).is.equal('b');
    expect(node.children[3].name).is.equal('div');
    expect(node.children[3].children).to.have.lengthOf(2);
    expect(node.children[3].children[0].innerText).is.equal('a');
    expect(node.children[3].children[1].innerText).is.equal('b');

    discardEmptyText();
    expect(node).is.instanceof(htmlParser.TemplateScript)
    expect(node.condition).is.eq('a == 1');
    expect(node.children[1].name).is.eq('div');
    expect(node.children[1].getAttribute("att")).is.eq("val");
    expect(node.children[1].getAttribute("dyn")).is.eq("${a.op() + '3'}");
    attr = node.children[1].getAttributeJsonFormat("dyn").toJson().dyn;
    expect(attr[0].s).is.eq("a.op() + '3'");
    expect(node.children[1].children[0].text).is.eq("Div of id 1234");
    expect(node.children[3].name).is.eq("div");
    expect(node.children[3].children[1]).instanceOf(htmlParser.TemplateScript)
    expect(node.children[3].children[1].listVariable).is.eq('xx');
    expect(node.children[3].children[1].iterateVariable).is.eq('x');
    expect(node.children[3].children[1].indexVariable).is.eq('xxx');
    expect(node.children[3].children[1].children[0].text.trim()).is.eq('xxxx');

    discardEmptyText();
    expect(node).is.instanceof(htmlParser.TemplateScript)
    expect(node.listVariable).is.eq('list');
    expect(node.iterateVariable).is.eq('a');
    expect(node.indexVariable).is.eq('i');
    expect(node.children[0].text.trim()).is.eq('test');
    
    discardEmptyText();
    expect(node).is.instanceOf(htmlParser.TextScript);
    expect(node.script).is.eq('obj.label');

    discardEmptyText();
    assert(!node, 'Node should be empty');
    //console.log(JSON.stringify(doc.toJson()))
  });
  it('Test find elements', () => {
    let parser = new htmlParser.HTMLParser();
    let doc = parser.parse(`
      <html>
        <head>
          <script>console.log("1");</script>
        </head>
        <body>
          <div id=a>
            <span id=b att=x>
              <div id=c>
              </div>
            </span>
          </div>
        </body>
      </html>
    `);
    expect(doc.getElementsByName('div')).to.have.lengthOf(2);
    expect(doc.getElementsByName('span')).to.have.lengthOf(1);
    expect(doc.findDeepestChild('div').getAttribute("id")).is.eq('c');
    expect(doc.findDeepestChild('span').getAttribute("id")).is.eq('b');
    expect(doc.findDeepestChildWithAttribute('att').getAttribute("id")).is.eq('b');
  });
});
