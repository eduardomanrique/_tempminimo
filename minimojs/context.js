class Context {
  set devMode(d) {
    this._devMode = d;
  }
  get devMode() {
    return this._devMode;
  }
  set contextPath(ctx) {
    this._ctxPath = ctx;
  }
  get contextPath() {
    return this._ctxPath != null && !this._ctxPath.trim() == "" ? (this._localAccess == 'y' ? "" : "/") + this._ctxPath : "";
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