document.addEventListener("DOMContentLoaded", () => {
  function renderKeys(el, obj) {
    el.innerHTML = "";
    if (!obj) return;
    const order = [];
    const isMac = isMacPlatform();
    if (obj.ctrl) order.push("Ctrl");
    if (obj.alt) order.push(isMac ? "Opt" : "Alt");
    if (obj.shift) order.push("Shift");
    if (obj.meta) order.push(isMac ? "Cmd" : "Meta");
    if (obj.key) order.push((obj.key || "").toUpperCase());
    order.forEach((txt) => {
      const k = document.createElement("span");
      k.className = "key";
      k.textContent = txt;
      el.appendChild(k);
    });
  }

  function isMacPlatform() {
    try {
      if (navigator.userAgentData && navigator.userAgentData.platform)
        return /mac/i.test(navigator.userAgentData.platform);
    } catch (e) {}
    try {
      return /mac/i.test(navigator.userAgent || "");
    } catch (e) {}
    return false;
  }

  const getDefaults = () => {
    const isMac = isMacPlatform();
    return {
      think: isMac
        ? { ctrl: true, alt: false, shift: true, meta: false, key: "t" }
        : { ctrl: false, alt: true, shift: true, meta: false, key: "t" },
      web: isMac
        ? { ctrl: true, alt: false, shift: true, meta: false, key: "w" }
        : { ctrl: false, alt: true, shift: true, meta: false, key: "w" },
      image: isMac
        ? { ctrl: true, alt: false, shift: true, meta: false, key: "i" }
        : { ctrl: false, alt: true, shift: true, meta: false, key: "i" },
      research: isMac
        ? { ctrl: true, alt: false, shift: true, meta: false, key: "r" }
        : { ctrl: false, alt: true, shift: true, meta: false, key: "r" },
    };
  };

  const thinkKeysEl = document.querySelector(
    '.shortcut-display[data-for="think_longer"]'
  );
  const webKeysEl = document.querySelector(
    '.shortcut-display[data-for="web_search"]'
  );
  const imageKeysEl = document.querySelector(
    '.shortcut-display[data-for="create_image"]'
  );
  const researchKeysEl = document.querySelector(
    '.shortcut-display[data-for="deep_research"]'
  );

  const defaults = getDefaults();
  chrome.storage.sync.get(
    ["thinkShortcut", "webShortcut", "imageShortcut", "researchShortcut"],
    (res) => {
      const t = res.thinkShortcut || defaults.think;
      const w = res.webShortcut || defaults.web;
      const i = res.imageShortcut || defaults.image;
      const r = res.researchShortcut || defaults.research;
      renderKeys(thinkKeysEl, t);
      renderKeys(webKeysEl, w);
      renderKeys(imageKeysEl, i);
      renderKeys(researchKeysEl, r);
    }
  );
});
