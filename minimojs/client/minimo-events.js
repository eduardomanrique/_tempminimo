let newPageListeners = [];
let pageChangedListeners = [];
let pushStateListeners = [];
let _changingState;

const isChangingState = () => _changingState;
const onNewPage = (fn) => {
    newPageListeners.push(fn);
}
const onPageChanged = (fn) => {
    pageChangedListeners.push(fn);
}
const pageChanged = () => {
    pageChangedListeners.forEach(listener => {
        try{
            listener();
        }catch(e){
            console.log("Error on page changed listener" + e.message);
        }
    });
    _changingState = false;
}
const startPageChange = () => {
    _changingState = true;
    newPageListeners.forEach(listener => {
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
    onNewPage: onNewPage,
    onPageChanged:onPageChanged 
}