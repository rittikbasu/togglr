// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const runButtons = Array.from(document.querySelectorAll(".run-btn"));
  runButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const modeEl = e.target.closest(".mode");
      const mode = modeEl && modeEl.getAttribute("data-mode");
      if (!mode) return;
      // send message to active tab to run the mode
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) {
          alert("Open a ChatGPT tab to run the mode.");
          return;
        }
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "runMode", mode },
          (resp) => {
            if (!resp) {
              // may be because content script not injected; show helper
              alert(
                "Could not run the mode. Make sure you are on https://chatgpt.com/ and the page is loaded."
              );
              return;
            }
            if (resp.ok) {
              // success (content script will show a toast in page)
            } else {
              if (resp.reason === "not_implemented") {
                // small inline feedback
                const status = modeEl.querySelector(".status");
                if (status) {
                  status.textContent = "Not implemented";
                  status.style.color = "#c44";
                  setTimeout(() => {
                    status.textContent = "Not implemented";
                    status.style.color = "";
                  }, 1600);
                }
              }
            }
          }
        );
      });
    });
  });

  // Shortcut capture UI (two shortcuts)
  const thinkInput = document.getElementById("thinkShortcutInput");
  const webInput = document.getElementById("webShortcutInput");
  const clearThink = document.getElementById("clearThinkShortcut");
  const clearWeb = document.getElementById("clearWebShortcut");

  function formatShortcut(obj) {
    if (!obj) return "";
    const parts = [];
    if (obj.ctrl) parts.push("Ctrl");
    if (obj.alt) parts.push("Alt");
    if (obj.shift) parts.push("Shift");
    if (obj.meta) parts.push("Meta");
    if (obj.key) parts.push((obj.key || "").toUpperCase());
    return parts.join("+");
  }

  function normalizeKey(k) {
    if (!k) return "";
    const low = k.toLowerCase();
    if (low === "control" || low === "ctrl") return "Ctrl";
    if (low === "alt") return "Alt";
    if (low === "shift") return "Shift";
    if (low === "meta" || low === "command" || low === "cmd") return "Meta";
    return k.length === 1 ? k.toUpperCase() : k;
  }

  // load saved shortcuts
  chrome.storage.sync.get(["thinkShortcut", "webShortcut"], (res) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const defThink = isMac
      ? { ctrl: true, alt: false, shift: true, meta: false, key: "t" }
      : { ctrl: false, alt: true, shift: true, meta: false, key: "t" };
    const defWeb = isMac
      ? { ctrl: true, alt: false, shift: true, meta: false, key: "w" }
      : { ctrl: false, alt: true, shift: true, meta: false, key: "w" };
    thinkInput.value = formatShortcut(res.thinkShortcut || defThink);
    webInput.value = formatShortcut(res.webShortcut || defWeb);
  });

  // capture key sequence when user focuses input and presses keys
  let capturing = false;
  const startCapture = (which) => {
    const input = which === "think" ? thinkInput : webInput;
    input.value = "Press keys...";
    capturing = which; // "think" | "web"
  };
  thinkInput.addEventListener("focus", () => startCapture("think"));
  webInput.addEventListener("focus", () => startCapture("web"));

  const stopCapture = () =>
    setTimeout(() => {
      capturing = false;
    }, 50);
  thinkInput.addEventListener("blur", stopCapture);
  webInput.addEventListener("blur", stopCapture);

  // global capture for popup window while focused
  window.addEventListener("keydown", (e) => {
    if (!capturing) return;
    const activeEl = document.activeElement;
    if (!activeEl || (activeEl !== thinkInput && activeEl !== webInput)) return;
    e.preventDefault();
    e.stopPropagation();
    const obj = {
      ctrl: !!e.ctrlKey,
      alt: !!e.altKey,
      shift: !!e.shiftKey,
      meta: !!e.metaKey,
      key: (e.key || "").toLowerCase(),
    };
    // ignore pure modifier press
    if (
      obj.key === "control" ||
      obj.key === "shift" ||
      obj.key === "alt" ||
      obj.key === "meta"
    ) {
      input.value = formatShortcut(obj);
      return;
    }
    const storageKey = capturing === "think" ? "thinkShortcut" : "webShortcut";
    chrome.storage.sync.set({ [storageKey]: obj }, () => {
      (capturing === "think" ? thinkInput : webInput).value =
        formatShortcut(obj);
    });
  });

  clearThink.addEventListener("click", () => {
    chrome.storage.sync.remove(["thinkShortcut"], () => {
      thinkInput.value = "";
    });
  });
  clearWeb.addEventListener("click", () => {
    chrome.storage.sync.remove(["webShortcut"], () => {
      webInput.value = "";
    });
  });

  // open Chrome's extension shortcuts page to set OS-level shortcut
  // removed OS-level shortcut link (not needed for in-page only)

  document.getElementById("closeBtn").addEventListener("click", () => {
    window.close();
  });
});
