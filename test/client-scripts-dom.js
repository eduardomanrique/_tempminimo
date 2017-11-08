const expect = require('chai').expect;
require('chai').should();
const _ = require('underscore');
const assert = require('assert');
const jsdom = require('mocha-jsdom');
const dom = require('../minimojs/client/dom.js');

let dom1, dom2, dom3;

describe('Client scripts - dom.js', () => {
    jsdom({ skipWindowCheck: true });
    before(() => {
        document.body.innerHTML = `
            <div id="rootInstance">
                <span id="sp">
                    <div id="test" class="cl2" name="x"></div>
                    <input type="text" id="input1">
                    <input type="text" id="input2">
                </span>
                <div class="test" name="c" id="y" onclick="test()"></div>
                <span class="cl" name="c"></span>
                <button id="button" onclick="f()">Button</button>
                <div id="innerInstance">
                    <div id="dv" testAttribute="0">
                        <span id="test2" name="c" testAttribute="1">
                            <select id="select">
                                <option>1</option>
                                <option>2</option>
                            </select>
                        </span>
                        <textarea id="textarea"></textarea>
                    </div>
                </div>
                <div id="innerInstance2">
                    <div id="dv2">
                        <span id="test3" name="c" onclick="x()"></span>
                        <span id="test4" name="c"></span>
                        <span id="test5" name="c"></span>
                        <span id="test6" v="x"></span>
                        <textarea id="textarea1"></textarea>
                    </div>
                </div>
            </div>`;
        dom1 = new dom.DOM({id: 'm1'}, document.getElementById("rootInstance"), document);
        dom2 = new dom.DOM({id: 'm2'}, document.getElementById("innerInstance"), document);
        dom3 = new dom.DOM({id: 'm3'}, document.getElementById("innerInstance2"), document);
    });
    it('Static function', () => {
        const test = dom.byId("test", document).value;
        test.id.should.be.eq("test");
        expect(dom.byId("a", document).isPresent()).to.be.false;
        dom.byClass("cl", document).should.have.lengthOf(1);
        dom.addClass(test, "cl");
        dom.byClass("cl", document).should.have.lengthOf(2);
        dom.removeClass(test, "cl");
        dom.byClass("cl", document).should.have.lengthOf(1);
        dom.byName("c").should.have.lengthOf(6);
    });
    it('DOM by id', () => {
        dom1.getElementById("test").isPresent().should.be.true;
        dom2.getElementById("test").isPresent().should.be.false;
        dom1.getElementById("test3").isPresent().should.be.false;
        dom2.getElementById("test3").isPresent().should.be.false;
        dom3.getElementById("test3").isPresent().should.be.true;
        dom1.getElementById("test2").isPresent().should.be.false;
        dom2.getElementById("test2").isPresent().should.be.true;
    });
    it('DOM by name', () => {
        dom1.getElementsByName("c").should.have.lengthOf(2);
        dom2.getElementsByName("c").should.have.lengthOf(1);
        dom3.getElementsByName("c").should.have.lengthOf(3);
    });
    it('DOM by tag name', () => {
        dom1.getElementsByTagNames("div").should.have.lengthOf(2);
        dom2.getElementsByTagNames("div").should.have.lengthOf(1);
        dom3.getElementsByTagNames("div").should.have.lengthOf(1);

        dom1.getElementsByTagNames("div", "span").should.have.lengthOf(4);
        dom2.getElementsByTagNames("div", "span").should.have.lengthOf(2);
        dom3.getElementsByTagNames("div", "span").should.have.lengthOf(5);
    });

    it('DOM by attribute', () => {
        dom1.getElementsByAttribute("name").should.have.lengthOf(3);
        dom2.getElementsByAttribute("name").should.have.lengthOf(1);
        dom3.getElementsByAttribute("name").should.have.lengthOf(3);

        dom1.getElementsByAttribute("name", v => v == 'x').should.have.lengthOf(1);
    });

    it('DOM first by attribute', () => {
        dom1.findFirstElementByAttribute("name").getAttribute("id").should.eq("test");
        dom2.findFirstElementByAttribute("name").getAttribute("id").should.eq("test2");
        dom3.findFirstElementByAttribute("name").getAttribute("id").should.eq("test3");

        dom1.findFirstElementByAttribute("name", v => v == 'c').getAttribute("id").should.eq("y");
    });

    it('DOM getInputs', () => {
        const inputs1 = dom1.getInputs();
        const inputs2 = dom2.getInputs();
        const inputs3 = dom3.getInputs();

        inputs1.should.have.lengthOf(4);
        inputs2.should.have.lengthOf(2);
        inputs3.should.have.lengthOf(2);

        inputs1.filter(i => i.nodeName == 'INPUT').should.have.lengthOf(2);
        inputs1.filter(i => i.nodeName == 'BUTTON').should.have.lengthOf(1);
        inputs1.filter(i => i.nodeName == 'DIV').should.have.lengthOf(1);
        inputs1.filter(i => i.nodeName == 'TEXTAREA').should.have.lengthOf(0);
        inputs2.filter(i => i.nodeName == 'SELECT').should.have.lengthOf(1);
        inputs2.filter(i => i.nodeName == 'TEXTAREA').should.have.lengthOf(1);
        inputs3.filter(i => i.nodeName == 'SPAN').should.have.lengthOf(1);
        inputs3.filter(i => i.nodeName == 'TEXTAREA').should.have.lengthOf(1);
    });

    it('DOM findChildNodesByTagName', () => {
        const sp = dom1.getElementById("sp");
        dom1.findChildNodesByTagName(null, "input").should.have.lengthOf(2);
        dom1.findChildNodesByTagName(sp, "input").should.have.lengthOf(2);
        dom1.findChildNodesByTagName(null, "input", i => i.getAttribute("id") == "input1").should.have.lengthOf(1);
        dom1.findChildNodesByTagName(sp, "input", i => i.getAttribute("id") == "input1").should.have.lengthOf(1);
        try{
            dom2.findChildNodesByTagName(sp, "input", i => i.getAttribute("id") == "input1").should.have.lengthOf(1);
            assert(false, "This line should not be called");
        }catch(e){
        }

        const dv = dom2.getElementById("dv");
        dom2.findChildNodesByTagName(dv, "span").should.have.lengthOf(1);

        const dv2 = dom3.getElementById("dv2");
        dom3.findChildNodesByTagName(dv2, "span", n => n.getAttribute("name") == "c").should.have.lengthOf(3);
    });
    
    it('DOM findChildNodesByAttribute', () => {
        const sp = dom1.getElementById("sp").value;
        const test = dom1.getElementById("test").value;
        const input1 = dom1.getElementById("input1").value;
        sp.setAttribute("testAttribute", "1");
        test.setAttribute("testAttribute", "2");
        input1.setAttribute("testAttribute", "3");

        dom1.findChildNodesByAttribute(null, "testAttribute").should.have.lengthOf(3);
        dom1.findChildNodesByAttribute(sp, "testAttribute").should.have.lengthOf(2);
        dom1.findChildNodesByAttribute(null, "testAttribute", v => parseInt(v) > 1).should.have.lengthOf(2);
        dom1.findChildNodesByAttribute(sp, "testAttribute", v => parseInt(v) > 1).should.have.lengthOf(2);
        try{
            dom2.findChildNodesByAttribute(sp, "testAttribute").should.have.lengthOf(3);
            assert(false, "This line should not be called");
        }catch(e){
        }
    });

    it('DOM findParentWithAttribute', () => {
        const dv = dom2.getElementById("dv").value;
        const select = dom2.getElementById("select").value;

        dom2.findParentWithAttribute(select, "testAttribute").getAttribute("testAttribute").should.eq("1");
        dom2.findParentWithAttribute(select, "testAttribute", v => v != "1").getAttribute("testAttribute").should.eq("0");
        try{
            dom1.findChildNodesByAttribute(select, "testAttribute").should.have.lengthOf(0);
            assert(false, "This line should not be called");
        }catch(e){
        }
    });
    it('DOM createElement', () => {
        const div = dom1.createElement('div');
        div.setAttribute("id", "created");
        div.setAttribute("test", "ok");
        document.getElementById("rootInstance").appendChild(div);
        dom1.getElementById('created').value.getAttribute("test").should.eq("ok");
    });
    it('DOM Listerner', () => {
        const listener = {
            inputs: [],
            links: [],
            onCreateInput: i => listener.inputs.push(i),
            onCreateLink: l => listener.links.push(l)
        }
        const listener2 = {
            texts: [],
            links: [],
            onCreateText: i => listener2.texts.push(i),
            onCreateLink: l => listener2.links.push(l)
        }
        dom1.addListener(listener, listener2);
        dom1.createElement('input');
        dom1.createElement('button');
        dom1.createElement('a');
        dom1.createTextNode(dom1.getElementById("sp").value, 'input', false);

        listener.inputs.should.have.lengthOf(2);
        listener.links.should.have.lengthOf(1);
        listener2.links.should.have.lengthOf(1);
        listener2.texts.should.have.lengthOf(1);
    });
});