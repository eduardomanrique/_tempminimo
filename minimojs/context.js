class Context {
  set devMode(d) {
    this._devMode = d;
  }
  get devMode() {
    return this._devMode;
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