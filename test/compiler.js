require('./test');
const compiler = require('../minimojs/compiler');
const resources = require('../minimojs/resources');
const expect = require('chai').expect;
const components = require('../minimojs/components');
const htmlParser = require('../minimojs/htmlParser');

describe('Test compiler', function () {
    it('Get resource info htmx/js OK', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/dir1/test1.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.true;
                resourceOption.ifPresent(resource => {
                    resource.relativeHtmxPath.value.should.equal('./pages/dir1/test1.htmx');
                    resource.relativeJsPath.value.should.equal('./pages/dir1/test1.js');
                    expect(resource.htmxRealPath.value).to.endsWith('/pages/dir1/test1.htmx');
                    expect(resource.jsRealPath.value).to.endsWith('/pages/dir1/test1.js');
                    resource.htmxPath.value.should.equal('/dir1/test1.htmx');
                    resource.jsPath.value.should.equal('/dir1/test1.js');
                    expect(resource.templateName.value).to.be.null;
                    expect(resource.isGlobal).to.be.false;
                    expect(resource.htmxPath.isPresent()).to.be.true;
                    expect(resource.jsPath.isPresent()).to.be.true;
                });
            })));
    it('Get resource info htmx/js Non existent', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/testqq1.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.false;
            })));
    it('Get resource info js Only', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/dir2/jsonly.htmx', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.true;
                resourceOption.ifPresent(resource => {
                    resource.htmxPath.isPresent().should.be.false;
                    resource.jsPath.isPresent().should.be.true;
                    resource.relativeJsPath.value.should.equal('./pages/dir2/jsonly.js');
                });
            })));
    it('Get resource info htmx Only', () => compiler._restart()
        .then(() => compiler._getResourceInfo('/dir2/htmxonly.js', false)
            .then(resourceOption => {
                expect(resourceOption.isPresent()).to.be.true;
                resourceOption.ifPresent(resource => {
                    resource.htmxPath.isPresent().should.be.true;
                    resource.jsPath.isPresent().should.be.false;
                    resource.relativeHtmxPath.value.should.equal('./pages/dir2/htmxonly.htmx');
                });
            })));
    it ('Prepare injections', () => {
        const js = `
        //import:/import/i1
        var i;
        //import:/import/i2
        var i2;
        //modal:/modal/modal1,element,toggle
        var modal1;
        //modal:/modal/modal2,element
        var modal2;
        `;
        const prepared = compiler._prepareInjections(js, [new htmlParser.ModalBind('modal3', '/modal/modal3', 'element3', true)]);
        const imported = [];
        const instance = {};
        const modals = [];
        const vars = {};
        let setVars;
        const X = {
            CTX: '_CTX',
            import: path => {
                imported.push(path);
                return new Promise((resolve) => resolve(instance))
            },
            bindService: name => services.push(name),
            modalS: (path, toggle, elementId) => {
                modals.push({t: toggle, p: path, e: elementId});
                return new Promise((resolve) => resolve(instance));
            }
        }
        var binds;
        eval(`${prepared}; 
            binds = this.__binds__;
            setVars = function(){
                vars.i=i;
                vars.i2=i2;
                vars.modal1=modal1;
                vars.modal2=modal2;
                vars.modal3=modal3;
            }`);
        return Promise.all(binds).then(() => {
            setVars();
            instance.CTX.should.equal('_CTX');
            imported.should.have.lengthOf(2);
            imported.filter(i => i == '/import/i1.js').should.have.lengthOf(1);
            imported.filter(i => i == '/import/i2.js').should.have.lengthOf(1);
            modals.should.have.lengthOf(3);
            modals.filter(i => i.t && i.p == '/modal/modal1' && i.e == 'element').should.have.lengthOf(1);
            modals.filter(i => !i.t && i.p == '/modal/modal2' && i.e == 'element').should.have.lengthOf(1);
            modals.filter(i => i.t && i.p == '/modal/modal3' && i.e == 'element3').should.have.lengthOf(1);
            expect(vars.i).to.be.equal(instance);
            expect(vars.i2).to.be.equal(instance);
            expect(vars.modal1).to.be.equal(instance);
            expect(vars.modal2).to.be.equal(instance);
            expect(vars.modal3).to.be.equal(instance);
        });
    });
    it ('Test instrument controller', () => {
        const parser = new htmlParser.HTMLParser();
        const docJson = parser.parse(`<html>
            <body>
                <input bind="obj.test">
                <div data-modal-mod="/modal/mod"></div>
            </body>
        </html>`).toJson();
        const boundVars = parser.boundVars;
        const boundModals = parser.boundModals;
        const jsData = `
        var obj = {
            test:1
        };
        var mod;
        function onInit(){
            console.log('onInit');
        }
        function onChange(){
            console.log('onChange ' + obj.test);
        }
        `;
        const realPath = resources.getRealPath('/pages/dir1/test1.htmx');
        const resInfo = new compiler.Resource('/dir1/test1', true, true, realPath.substring(0, realPath.lastIndexOf('.')), false);
        const controllerJs = compiler._instrumentController(docJson, jsData, false, resInfo, boundVars, boundModals);
        
        let htmlStruct;
        let resourceName;
        const X = {
            _interval: 1,
            _timeout: 2,
            _clearInterval: 3,
            _clearTimeout: 4,
            modalS: (path, bool, id) => new Promise(resolve => resolve({}))
        };
        const X$ = {
            register: (html, name, constructorFn) => {
                htmlStruct = html;
                resourceName = name;
                return new constructorFn(X);
            }
        };
        var controller;
        eval(`controller = ${controllerJs}`);
        expect(controller.onInit).not.null;
        expect(controller.onChange).not.null;
        expect(controller._x_eval('mod')).not.null;
        expect(controller.resourceName).to.be.eq('dir1.test1');
        expect(controller._x_eval('setInterval')).to.eq(1);
        expect(controller._x_eval('setTimeout')).to.eq(2);
        expect(controller._x_eval('clearInterval')).to.eq(3);
        expect(controller._x_eval('clearTimeout')).to.eq(4);
    });
    it ('Reload black template', () => {
        compiler._reloadTemplate();
    });
    it ('Compile page htmx and js no components no html element', () => {
        const realPath = resources.getRealPath('/pages/dir1/test1.htmx');
        const resInfo = new compiler.Resource('/dir1/test1', true, true, realPath.substring(0, realPath.lastIndexOf('.')), false);
        return components.startComponents().then(() => 
            Promise.all([resources.readResource(resInfo.relativeHtmxPath.value), resources.readResource(resInfo.relativeJsPath.value)])
            .then(([htmx, js]) => compiler._compilePage(resInfo, htmx.data, js.data)));
    });
    it ('Compile page htmx and js not components with template info', () => {
        
    });
    it ('Compile page htmx and js with components no html element', () => {
    });
    it ('Compile page htmx and js with components with template info', () => {
    });
    it ('Compile page htmx only', () => {
    });
    it ('Compile page js only?', () => {
    });
    //_loadFileAndCache
    // _reloadFile
    //_reloadFiles
    //_reloadTemplate com mock?
    //_addChildValidElements ?
    //_compilePage com mock?
    //_buildComponents

});