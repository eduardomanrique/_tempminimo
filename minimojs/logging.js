class Logging {
  info (msg){
    console.log(`INFO: ${msg}`);
  }

  debug (msg){
    console.log(`DEBUG: ${msg}`);
  }

  error (msg, e){
    console.log(`ERROR: ${msg}`);
    if(e && e.stack){
      console.log(e.stack);
    }
  }
}

module.exports = new Logging();