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

  // Shortcut capture UI
  const input = document.getElementById("shortcutInput");
  const clearBtn = document.getElementById("clearShortcut");

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

  // load saved inpageShortcut
  chrome.storage.sync.get(["inpageShortcut"], (res) => {
    if (res && res.inpageShortcut) {
      input.value = formatShortcut(res.inpageShortcut);
    } else {
      // show sensible default based on platform
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const def = isMac
        ? { ctrl: true, alt: false, shift: true, meta: false, key: "t" }
        : { ctrl: false, alt: true, shift: true, meta: false, key: "t" };
      input.value = formatShortcut(def);
    }
  });

  // capture key sequence when user focuses input and presses keys
  let capturing = false;
  input.addEventListener("focus", () => {
    input.value = "Press keys...";
    capturing = true;
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      capturing = false;
    }, 50);
  });

  // global capture for popup window while focused
  window.addEventListener("keydown", (e) => {
    if (
      !document.activeElement ||
      document.activeElement.id !== "shortcutInput"
    )
      return;
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
    // normalize printable key
    chrome.storage.sync.set({ inpageShortcut: obj }, () => {
      input.value = formatShortcut(obj);
    });
  });

  clearBtn.addEventListener("click", () => {
    chrome.storage.sync.remove(["inpageShortcut"], () => {
      input.value = "";
    });
  });

  // open Chrome's extension shortcuts page to set OS-level shortcut
  document.getElementById("openShortcuts").addEventListener("click", (e) => {
    e.preventDefault();
    // open the shortcuts page
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });

  document.getElementById("closeBtn").addEventListener("click", () => {
    window.close();
  });
});
