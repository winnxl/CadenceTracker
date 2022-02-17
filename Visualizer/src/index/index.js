document.getElementById('button_newSession').addEventListener('click', () => {
    window.electronIPC.switchPage('session');
});
