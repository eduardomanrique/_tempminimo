
function defineAttributes(types){
    return {
      "id": types.mandatory.string,
      "varToBind": types.bind,
      "label": types.mandatory.string
    }
  }