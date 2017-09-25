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
    let textWitScript = _htmlParser.__get__('_prepareXScriptsValues')('Test 123 ${fn(1,2,"3") + "x"}, lorem');
    expect(textWitScript).is.equal('Test 123 <xscr scr="fn(1,2,&quot;3&quot;) + &quot;x&quot;"></xscr>, lorem');
    //_htmlParser._isEmptyText
    expect(_htmlParser.__get__('_eqIgnoreCase')('asdf', 'ASdf')).is.equal(true);
    expect(_htmlParser.__get__('_eqIgnoreCase')('asdf', 'ssdf')).is.equal(false);
    expect(_htmlParser.__get__('_validateJS')('var a = 1;')).is.equal(true);
    expect(_htmlParser.__get__('_validateJS')('var a s s')).is.equal(false);
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

    expect(doc.toHTML()).is.eq('<html><head><script>console.log("1");</script></head><body><!--Comment--><div id="1234" att="val">Div of id 1234</div>Text 1234 "aa"</body></html>');
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
          <div id="1234" att="val">Div of id 1234</div>
          <br>
          Text 1234 "aa"
          <div><div>a</div><br><span>b</span><div><span>a</span><span>b</span></div></div>
          $if(a == 1){
            <div dyn="\${a.op() + '3'}" att="val">Div of id 1234</div>
          }
          $for(a in list with i){
            test
          }
        </body>
      </html>
    `);
    let head = doc.htmlElement.getElements().filter(e => e.name == 'head');
    expect(head).to.have.lengthOf(1);
    expect(head[0].getElementsByName('script')[0].innerText).to.be.equal('console.log("1");');
    let body = doc.htmlElement.getElements().filter(e => e.name == 'body');
    expect(body).to.have.lengthOf(1);
    let list = body[0].children;
    expect(list[1]).to.be.instanceOf(htmlParser.Comment);
    expect(list[3]).to.be.instanceOf(htmlParser.Element);
    expect(list[3].name).to.be.equal('div');
    expect(list[3].innerText).to.be.equal('Div of id 1234');
    expect(list[3].getAttribute("id")).to.be.equal('1234');
    expect(list[3].getAttribute("att")).to.be.equal('val');
    expect(list[5].name).to.be.equal('br');
    expect(list[5].children).to.have.lengthOf(0);
    expect(list[7].text.trim()).to.be.equal('Text 1234 "aa"');
    expect(list[8].name).to.be.equal('div');
    expect(list[8].children).to.have.lengthOf(4);
    expect(list[8].children[0].name).is.equal('div');
    expect(list[8].children[0].innerText).is.equal('a');
    expect(list[8].children[1].name).is.equal('br');
    expect(list[8].children[2].name).is.equal('span');
    expect(list[8].children[2].innerText).is.equal('b');
    expect(list[8].children[3].name).is.equal('div');
    expect(list[8].children[3].children).to.have.lengthOf(2);
    expect(list[8].children[3].children[0].innerText).is.equal('a');
    expect(list[8].children[3].children[1].innerText).is.equal('b');

    // expect(list[6].getAttribute("dyn").trim()).to.be.equal("${a.op() + '3'}");
    console.log(doc.toHTML());

  });
});
