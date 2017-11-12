
function defineAttributes(types){
  return {
    "id": types.mandatory.string,
    "innerattribute": {
      "test": types.mandatory.string,
      "content": types.mandatory.html
    }
  }
}
