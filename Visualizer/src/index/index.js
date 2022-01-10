document.getElementById('button_newSession').addEventListener('click', () => {
    window.electronAPI.switchPage('session');
});
