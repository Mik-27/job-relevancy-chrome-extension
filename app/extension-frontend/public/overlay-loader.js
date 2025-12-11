(async () => {
    // Dynamically import the actual overlay logic as a module
    await import(chrome.runtime.getURL("src/overlay.js"));
})();
