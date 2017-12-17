class Context {
  get devMode() {
    return "%devmode%";
  }
  set localAccess(local) {
    this._localAccess = local;
  }
  get localAccess() {
    return this._localAccess;
  }
  set destinationPath(d) {
    this._destPath = d;
  }
  get destinationPath(){
    return this._destPath;
  }
}

module.exports = new Context();