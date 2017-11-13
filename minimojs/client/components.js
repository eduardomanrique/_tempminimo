var __types = '%component-types%';
const components = '%components%';

function createComponentContext(jsonInfo, minimoInstance){
    //must recreate function from string to create it on the right context
    const m = minimoInstance;
    const component = components[jsonInfo.cn];
    const fn = eval(`'%__setUpGetterForAttributes%';var __temp_var = ${component.htmxContext.toString()};__temp_var`);
    return new __temp_var(jsonInfo.ip, m, __types);
}
