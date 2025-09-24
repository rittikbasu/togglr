// content.js
(function () {
  "use strict";

  // small toast
  function toast(msg, ok = true, ms = 1400) {
    try {
      let t = document.getElementById("__think_ext_toast");
      if (!t) {
        t = document.createElement("div");
        t.id = "__think_ext_toast";
        Object.assign(t.style, {
          position: "fixed",
          right: "18px",
          bottom: "18px",
          zIndex: 2147483647,
          padding: "10px 14px",
          borderRadius: "10px",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
          fontSize: "13px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          transition: "opacity .22s",
          opacity: "0",
        });
        document.body.appendChild(t);
      }
      t.style.background = ok
        ? "linear-gradient(90deg,#22c55e,#16a34a)"
        : "linear-gradient(90deg,#ef4444,#dc2626)";
      t.style.color = "white";
      t.textContent = msg;
      t.style.opacity = "1";
      clearTimeout(t.__hide_timer);
      t.__hide_timer = setTimeout(() => {
        t.style.opacity = "0";
      }, ms);
    } catch (e) {
      /* ignore */
    }
  }

  // dispatch helper
  function dispatch(el, type, opts = {}) {
    try {
      let ev;
      if (type.startsWith("pointer"))
        ev = new PointerEvent(
          type,
          Object.assign(
            {
              bubbles: true,
              cancelable: true,
              pointerType: "mouse",
              isPrimary: true,
            },
            opts
          )
        );
      else if (type.includes("mouse"))
        ev = new MouseEvent(
          type,
          Object.assign({ bubbles: true, cancelable: true, view: window }, opts)
        );
      else if (type.startsWith("key"))
        ev = new KeyboardEvent(
          type,
          Object.assign({ bubbles: true, cancelable: true }, opts)
        );
      else ev = new Event(type, { bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
    } catch (e) {
      /* ignore */
    }
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- Shared helpers ---
  function isTypingContext(target) {
    try {
      if (!target) return false;
      const tag = (target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return true;
      const editable =
        (target.closest &&
          target.closest('[contenteditable=""], [contenteditable="true"]')) ||
        null;
      return !!editable;
    } catch (e) {
      return false;
    }
  }

  async function clickCenter(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const atPoint = document.elementFromPoint(cx, cy) || el;
    ["pointerover", "pointerenter", "mouseover", "mousemove"].forEach((t) =>
      dispatch(atPoint, t, { clientX: cx, clientY: cy })
    );
    ["pointerdown", "mousedown"].forEach((t) =>
      dispatch(atPoint, t, { clientX: cx, clientY: cy })
    );
    await wait(18);
    ["pointerup", "mouseup", "click"].forEach((t) =>
      dispatch(atPoint, t, { clientX: cx, clientY: cy })
    );
    try {
      atPoint.click && atPoint.click();
    } catch (e) {}
    return true;
  }

  async function hoverCenter(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const atPoint = document.elementFromPoint(cx, cy) || el;
    ["pointerover", "pointerenter", "mouseover", "mousemove"].forEach((t) => {
      dispatch(atPoint, t, { clientX: cx, clientY: cy });
      dispatch(el, t, { clientX: cx, clientY: cy });
    });
    await wait(60);
    return true;
  }

  function getPlusButton() {
    return document.querySelector(
      'button[data-testid="composer-plus-btn"], button[aria-label="Add files and more"]'
    );
  }

  function isPlusMenuOpen(plus) {
    try {
      if (
        plus &&
        plus.getAttribute &&
        plus.getAttribute("aria-expanded") === "true"
      )
        return true;
      if (
        plus &&
        plus.getAttribute &&
        plus.getAttribute("data-state") === "open"
      )
        return true;
      if (
        document.querySelector(
          '[role="menu"][data-state="open"], [data-radix-menu-content][data-state="open"], [data-state="open"]'
        )
      )
        return true;
    } catch (e) {}
    return false;
  }

  async function openPlusMenu() {
    const plus = getPlusButton();
    if (!plus) return false;
    let opened = isPlusMenuOpen(plus);
    for (let i = 0; i < 6 && !opened; i++) {
      [
        "pointerover",
        "pointerenter",
        "mouseover",
        "mousemove",
        "pointerdown",
        "mousedown",
        "pointerup",
        "mouseup",
        "click",
      ].forEach((t) => dispatch(plus, t));
      try {
        plus.click();
      } catch (e) {}
      plus.focus && plus.focus();
      await wait(120 + i * 60);
      opened = isPlusMenuOpen(plus);
    }
    if (!opened) {
      const seen = await new Promise((res) => {
        const obs = new MutationObserver(() => {
          if (isPlusMenuOpen(plus)) {
            obs.disconnect();
            res(true);
          }
        });
        obs.observe(document, { childList: true, subtree: true });
        setTimeout(() => {
          obs.disconnect();
          res(false);
        }, 1200);
      });
      opened = seen || isPlusMenuOpen(plus);
    }
    return opened;
  }

  function getOpenMenuRoot() {
    const plus = getPlusButton();
    try {
      const cid =
        plus && plus.getAttribute && plus.getAttribute("aria-controls");
      if (cid) {
        const el = document.getElementById(cid);
        if (el) return el;
      }
    } catch (e) {}
    return (
      document.querySelector(
        '[role="menu"][data-state="open"], [data-radix-menu-content][data-state="open"], [role="menu"]'
      ) || null
    );
  }

  function findVisibleMenuContaining(textLower) {
    const wrappers = [
      ...document.querySelectorAll(
        'div[data-radix-popper-content-wrapper], div[data-radix-popper-content-wrapper=""], div[data-side], [data-radix-menu-content], [role="menu"]'
      ),
    ];
    return wrappers.filter((w) => {
      try {
        const txt = (w.textContent || "").toLowerCase();
        if (!txt.includes(textLower)) return false;
        const r = w.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        return true;
      } catch (e) {
        return false;
      }
    });
  }

  // --- main Toggle logic (open + select OR click pill if present)
  async function toggleThinkLonger() {
    try {
      // 1) if pill exists, click it (to remove)
      // strictly target Think pill, not other pills like Search
      const pill =
        [
          ...document.querySelectorAll(
            'button.__composer-pill, button[aria-label*="Think, click to remove"], button[aria-label^="Think,"]'
          ),
        ].find((el) => {
          try {
            const aria =
              (el.getAttribute && (el.getAttribute("aria-label") || "")) || "";
            if (aria.toLowerCase().startsWith("think")) return true;
            const label = (el.textContent || "").trim().toLowerCase();
            return label.startsWith("think");
          } catch (e) {
            return false;
          }
        }) || null;
      if (pill) {
        await clickCenter(pill);
        await wait(140);
        toast("Think removed", true);
        return true;
      }

      // 2) open + menu robustly and select Think longer
      const plus = getPlusButton();
      if (!plus) {
        toast("Plus button not found", false);
        return false;
      }

      const opened = await openPlusMenu();
      if (!opened) {
        toast(
          "Menu did not open — try clicking + manually then run",
          false,
          3000
        );
        return false;
      }

      await wait(120);
      const radios = [
        ...document.querySelectorAll(
          '[role="menuitemradio"], [role="menuitem"], [role="menuitemcheckbox"]'
        ),
      ];
      let target = radios.find((r) =>
        (r.textContent || "").trim().toLowerCase().includes("think longer")
      );
      // If disabled, report and bail without changing other modes
      if (
        target &&
        (target.getAttribute("aria-disabled") === "true" ||
          target.hasAttribute("data-disabled"))
      ) {
        toast("Think longer is unavailable right now", false);
        return false;
      }
      if (!target) {
        toast("Think longer item not found", false);
        return false;
      }

      await clickCenter(target);
      ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(
        (t) => dispatch(target, t)
      );
      try {
        target.click && target.click();
      } catch (e) {}

      await wait(140);

      // fallback keyboard activation if necessary
      const radioParent =
        (target.closest && target.closest('[role="menuitemradio"]')) || target;
      let checked =
        radioParent.getAttribute && radioParent.getAttribute("aria-checked");
      if (!(checked === "true" || checked === "mixed" || checked === "1")) {
        target.focus && target.focus();
        target.dispatchEvent(
          new KeyboardEvent("keydown", { key: " ", bubbles: true })
        );
        target.dispatchEvent(
          new KeyboardEvent("keyup", { key: " ", bubbles: true })
        );
        await wait(30);
        target.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        );
        target.dispatchEvent(
          new KeyboardEvent("keyup", { key: "Enter", bubbles: true })
        );
        await wait(120);
        checked =
          radioParent.getAttribute && radioParent.getAttribute("aria-checked");
      }

      // close menu
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      document.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Escape", bubbles: true })
      );

      await wait(80);
      const pillNow = document.querySelector(
        'button.__composer-pill, button[aria-label*="Think, click to remove"], button[aria-label^="Think,"]'
      );
      if (pillNow || checked === "true") {
        toast("Think enabled", true);
        return true;
      } else {
        toast("Failed to enable (UI ignored synthetic events)", false, 3000);
        return false;
      }
    } catch (err) {
      console.error("toggleThinkLonger error", err);
      toast("Error — see console", false, 2000);
      return false;
    }
  }

  // --- Select Web search from + menu (opens More submenu if needed)
  async function runWebSearch() {
    try {
      // 1) Open + menu (reuse robust sequence)
      const plus = getPlusButton();
      if (!plus) {
        toast("Plus button not found", false);
        return false;
      }
      const opened = await openPlusMenu();
      if (!opened) {
        toast("Menu did not open — click + manually then try", false, 3000);
        return false;
      }

      // 2) Try to locate a popper/menu that already contains "Web search"
      let poppers = findVisibleMenuContaining("web search");

      // 3) If not found, hover/click More to reveal submenu
      if (poppers.length === 0) {
        // find the opened menu root (if aria-controls exists, prefer that)
        const menuRoot = getOpenMenuRoot();

        if (!menuRoot) {
          toast("Menu not found after opening +", false);
          return false;
        }

        const maybeMore = [...menuRoot.querySelectorAll("*")].find((n) => {
          try {
            const t = (n.textContent || "").trim().toLowerCase();
            if (!t) return false;
            return t === "more" || t.startsWith("more");
          } catch (e) {
            return false;
          }
        });
        if (!maybeMore) {
          toast('"More" item not found', false);
          return false;
        }
        const moreEl =
          (maybeMore.closest &&
            maybeMore.closest(
              '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], .__menu-item'
            )) ||
          maybeMore;

        const r = moreEl.getBoundingClientRect();
        const cx = Math.round(r.left + r.width / 2);
        const cy = Math.round(r.top + r.height / 2);
        const elAtPoint = document.elementFromPoint(cx, cy) || moreEl;

        await hoverCenter(moreEl);

        // retry finding popper containing Web search
        poppers = findVisibleMenuContaining("web search");
        if (poppers.length === 0) {
          try {
            moreEl.focus && moreEl.focus();
            moreEl.dispatchEvent(
              new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
            );
            moreEl.dispatchEvent(
              new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true })
            );
          } catch (e) {}
          await wait(160);
          poppers = findVisibleMenuContaining("web search");
        }
      }

      if (poppers.length === 0) {
        toast('Could not reveal "Web search" submenu', false);
        return false;
      }

      // 4) Choose the visible popper and find the Web search option
      const popper =
        poppers.find((p) => {
          const r = p.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }) || poppers[0];

      const option = [
        ...popper.querySelectorAll(
          '[role="menuitemradio"], [role="menuitem"], [role="menuitemcheckbox"]'
        ),
      ].find((el) =>
        (el.textContent || "").trim().toLowerCase().includes("web search")
      );

      if (
        option &&
        (option.getAttribute("aria-disabled") === "true" ||
          option.hasAttribute("data-disabled"))
      ) {
        toast("Web search is unavailable right now", false);
        return false;
      }
      if (!option) {
        toast('"Web search" item not found', false);
        return false;
      }

      // 5) Click the option precisely
      // center click via helper + direct dispatch to be extra robust
      await clickCenter(option);
      const rr = option.getBoundingClientRect();
      const cx = Math.round(rr.left + rr.width / 2);
      const cy = Math.round(rr.top + rr.height / 2);
      ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(
        (t) => dispatch(option, t, { clientX: cx, clientY: cy })
      );
      try {
        option.click && option.click();
      } catch (e) {}

      await wait(200);
      toast('Requested "Web search"', true);
      return true;
    } catch (err) {
      console.error("runWebSearch error", err);
      toast("Error selecting Web search", false);
      return false;
    }
  }

  // --- Toggle Web search: if Search pill exists, click to remove; else enable via + menu
  async function toggleWebSearch() {
    try {
      // 1) If a Search pill exists, click it to remove (toggle off)
      const pillCandidates = [
        ...document.querySelectorAll(
          'button.__composer-pill, button[aria-label^="Search"], button[aria-label*="Search, click to remove"]'
        ),
      ];
      const searchPill = pillCandidates.find((el) => {
        try {
          const aria =
            (el.getAttribute && (el.getAttribute("aria-label") || "")) || "";
          const label = (el.textContent || "").trim().toLowerCase();
          if (aria.toLowerCase().includes("search")) return true;
          if (label.includes("search")) return true;
          return false;
        } catch (e) {
          return false;
        }
      });

      if (searchPill) {
        await clickCenter(searchPill);
        const r2 = searchPill.getBoundingClientRect();
        const cx = Math.round(r2.left + r2.width / 2);
        const cy = Math.round(r2.top + r2.height / 2);
        ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(
          (t) => dispatch(searchPill, t, { clientX: cx, clientY: cy })
        );
        try {
          searchPill.click && searchPill.click();
        } catch (e) {}
        await wait(120);
        toast("Web search removed", true);
        return true;
      }

      // 2) Otherwise, enable Web search via + menu
      const ok = await runWebSearch();
      if (ok) {
        toast("Web search enabled", true);
      }
      return ok;
    } catch (err) {
      console.error("toggleWebSearch error", err);
      toast("Error toggling Web search", false);
      return false;
    }
  }

  // --- message handling from background/popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.action) return;
    if (msg.action === "toggleThinkLonger") {
      toggleThinkLonger().then((res) => sendResponse({ ok: !!res }));
      return true; // indicates async response
    } else if (msg.action === "runMode") {
      const mode = msg.mode;
      if (mode === "think_longer") {
        toggleThinkLonger().then((res) => sendResponse({ ok: !!res }));
        return true;
      } else if (mode === "web_search") {
        toggleWebSearch()
          .then((res) => sendResponse({ ok: !!res }))
          .catch((e) => sendResponse({ ok: false, error: String(e) }));
        return true;
      } else {
        // placeholder - not implemented for other modes
        toast("Mode not implemented yet", false, 1200);
        sendResponse({ ok: false, reason: "not_implemented" });
        return false;
      }
    }
  });

  // expose to console for debugging
  window.__toggleThinkLonger = toggleThinkLonger;
  window.__runWebSearch = runWebSearch;
  window.__toggleWebSearch = toggleWebSearch;

  // --- in-page shortcut handling (configurable by popup)
  // Two shortcuts captured at capture phase so they work while typing
  let thinkShortcut = null; // {ctrl,alt,shift,meta,key}
  let webShortcut = null; // {ctrl,alt,shift,meta,key}

  function normalizeShortcutObj(obj) {
    if (!obj) return null;
    return {
      ctrl: !!obj.ctrl,
      alt: !!obj.alt,
      shift: !!obj.shift,
      meta: !!obj.meta,
      key: (obj.key || "").toLowerCase(),
    };
  }

  function shortcutMatchesEvent(shortcut, e) {
    if (!shortcut) return false;
    if (!!e.ctrlKey !== !!shortcut.ctrl) return false;
    if (!!e.altKey !== !!shortcut.alt) return false;
    if (!!e.shiftKey !== !!shortcut.shift) return false;
    if (!!e.metaKey !== !!shortcut.meta) return false;
    const k = (e.key || "").toLowerCase();
    return k === shortcut.key;
  }
  // load stored shortcuts from chrome.storage (or defaults)
  function loadStoredShortcuts() {
    chrome.storage.sync.get(["thinkShortcut", "webShortcut"], (res) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      thinkShortcut = normalizeShortcutObj(
        res.thinkShortcut ||
          (isMac
            ? { ctrl: true, alt: false, shift: true, meta: false, key: "t" }
            : { ctrl: false, alt: true, shift: true, meta: false, key: "t" })
      );
      webShortcut = normalizeShortcutObj(
        res.webShortcut ||
          (isMac
            ? { ctrl: true, alt: false, shift: true, meta: false, key: "w" }
            : { ctrl: false, alt: true, shift: true, meta: false, key: "w" })
      );
    });
  }
  loadStoredShortcuts();

  // listen for changes so popup updates are applied live
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.thinkShortcut) {
      thinkShortcut = normalizeShortcutObj(changes.thinkShortcut.newValue);
    }
    if (changes.webShortcut) {
      webShortcut = normalizeShortcutObj(changes.webShortcut.newValue);
    }
  });

  // capture-phase keydown so it works while typing
  window.addEventListener(
    "keydown",
    (e) => {
      try {
        const k = (e.key || "").toLowerCase();
        if (!k) return;
        if (k === "shift" || k === "control" || k === "alt" || k === "meta")
          return;
        if (shortcutMatchesEvent(thinkShortcut, e)) {
          e.preventDefault();
          e.stopPropagation();
          toggleThinkLonger();
          return;
        }
        if (shortcutMatchesEvent(webShortcut, e)) {
          e.preventDefault();
          e.stopPropagation();
          toggleWebSearch();
          return;
        }
      } catch (err) {}
    },
    { capture: true }
  );
})();
