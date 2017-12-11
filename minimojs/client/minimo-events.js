let newPageListeners = [];
let pushStateListeners = [];
let _changingState;

const isChangingState = () => _changingState;
const onNewPage = (fn) => {
    newPageListeners.push(fn);
}
const pageChanged = () => {
    _changingState = false;
}
const startPageChange = () => {
    _changingState = true;
    const listeners = newPageListeners;
    newPageListeners = [];
    listeners.forEach(listener => {
        try{
            listener();
        }catch(e){
            console.log("Error on new page listener" + e.message);
        }
    });
}
const addPushStateListener = (listener) => {
    pushStateListeners.push(listener);
}
const onPushState = (url) => {
    pushStateListeners.forEach(fn => fn(url));
}

const onStart = () => {}

//get lastUrl

module.exports = {
    isChangingState: isChangingState,
    pageChanged: pageChanged,
    startPageChange: startPageChange,
    onStart: onStart,
    addPushStateListener: addPushStateListener,
    onPushState: onPushState,
    lastUrl: null
}