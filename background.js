// background.js
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    const tab = tabs[0];
    if (!tab.url || !tab.url.startsWith("https://chatgpt.com/")) return;

    if (command === "toggle_think_longer") {
      chrome.tabs.sendMessage(tab.id, { action: "toggleThinkLonger" });
    } else if (command === "run_web_search") {
      // tell content script to run the web_search mode
      chrome.tabs.sendMessage(tab.id, {
        action: "runMode",
        mode: "web_search",
      });
    }
  });
});
