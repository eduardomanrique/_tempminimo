let newPageListeners = [];
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

//get lastUrl

module.exports = {
    isChangingState: isChangingState,
    pageChanged: pageChanged,
    startPageChange: startPageChange,
    lastUrl: null
}