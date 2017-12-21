var __types = "%component-types%";
const components = "%components%";

const buildComponentBuilderFunction = (minimoInstance) => (name, instanceProperties) => {
    //must recreate function from string to create it on the right context
    const m = minimoInstance;
    const component = components[name];
    const fn = eval(`"%__setUpGetterForAttributes%";var __temp_var = ${component.htmxContext.toString()};__temp_var`);
    return new __temp_var(instanceProperties, m, __types);
}

module.exports = {
    buildComponentBuilderFunction: buildComponentBuilderFunction
}