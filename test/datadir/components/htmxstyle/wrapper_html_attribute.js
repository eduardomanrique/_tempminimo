
function defineAttributes(types){
  return {
    "id": types.mandatory.string,
    "innerattribute": {
      "test": types.mandatory.string,
      "content": types.mandatory.html
    },
    "wraperVarName": types.exportedVariable.of("wrapperInternalVar"),
    "wraperTestVarName": types.exportedVariable.of("this.innerattribute.test"),
  }
}

var wrapperInternalVar = "abcd";

function getValue(){
  return "methodval";
}