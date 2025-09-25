(function () {
  "use strict";

  const SELECTORS = {
    plusButton:
      'button[data-testid="composer-plus-btn"], button[aria-label="Add files and more"]',
    anyOpenMenu:
      '[role="menu"][data-state="open"], [data-radix-menu-content][data-state="open"], [role="menu"]',
    pills: "button.__composer-pill, button[aria-label]",
    menuItems:
      '[role="menuitemradio"], [role="menuitem"], [role="menuitemcheckbox"]',
  };

  const LABELS = {
    more: "more",
    thinkLonger: "think longer",
    webSearch: /\bweb\b.*\bsearch\b|\bsearch\b.*\bweb\b/,
    pillThinkStarts: "think",
    pillResearch: "research",
    pillImage: "image",
    pillSearchWord: /\bsearch\b/,
  };

  const TIMING = {
    pollOpenMs: 240,
    pollStepMs: 20,
    clickWaitMs: 60,
    checkWaitMs: 140,
    escapeWaitMs: 100,
  };

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

  async function pollUntil(predicate, timeoutMs = 400, stepMs = 20) {
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      try {
        if (predicate()) return true;
      } catch (e) {}
      await wait(stepMs);
    }
    return false;
  }

  function safeLower(val) {
    try {
      return String(val || "").toLowerCase();
    } catch (e) {
      return "";
    }
  }

  function findPill(predicate) {
    const pills = document.querySelectorAll(
      "button.__composer-pill, button[aria-label]"
    );
    for (const el of pills) {
      const aria = safeLower(el.getAttribute && el.getAttribute("aria-label"));
      const label = safeLower((el.textContent || "").trim());
      if (predicate(aria, label, el)) return el;
    }
    return null;
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

  function isDisabledMenuItem(el) {
    try {
      return (
        (el &&
          el.getAttribute &&
          el.getAttribute("aria-disabled") === "true") ||
        (el && el.hasAttribute && el.hasAttribute("data-disabled"))
      );
    } catch (e) {
      return false;
    }
  }

  async function clickElementRobust(el) {
    if (!el) return false;
    await clickCenter(el);
    try {
      const r = el.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2);
      const cy = Math.round(r.top + r.height / 2);
      ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(
        (t) => dispatch(el, t, { clientX: cx, clientY: cy })
      );
      el.click && el.click();
    } catch (e) {}
    return true;
  }

  function getPlusButton() {
    return document.querySelector(SELECTORS.plusButton);
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
      if (document.querySelector(SELECTORS.anyOpenMenu)) return true;
    } catch (e) {}
    return false;
  }

  async function openPlusMenu() {
    const plus = getPlusButton();
    if (!plus) return false;
    if (isPlusMenuOpen(plus)) return true;

    try {
      plus.click();
    } catch (e) {}
    plus.focus && plus.focus();
    await pollUntil(
      () => isPlusMenuOpen(plus),
      TIMING.pollOpenMs,
      TIMING.pollStepMs
    );
    if (isPlusMenuOpen(plus)) return true;

    try {
      plus.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
      plus.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Enter", bubbles: true })
      );
    } catch (e) {}
    await pollUntil(
      () => isPlusMenuOpen(plus),
      TIMING.pollOpenMs,
      TIMING.pollStepMs
    );
    if (isPlusMenuOpen(plus)) return true;

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
      }, 300);
    });
    return seen || isPlusMenuOpen(plus);
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
    return document.querySelector(SELECTORS.anyOpenMenu) || null;
  }

  function getMenuItems() {
    const root = getOpenMenuRoot() || document;
    return root.querySelectorAll(SELECTORS.menuItems);
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

  async function selectTopMenuItemByText(textLower) {
    const opened = await openPlusMenu();
    if (!opened) return { ok: false, reason: "menu_open_failed" };
    const radios = [...document.querySelectorAll(SELECTORS.menuItems)];
    const target = radios.find((r) =>
      (r.textContent || "").trim().toLowerCase().includes(textLower)
    );
    if (!target) return { ok: false, reason: "item_not_found" };
    if (isDisabledMenuItem(target)) return { ok: false, reason: "disabled" };
    await clickElementRobust(target);
    await wait(80);
    await closeAnyOpenDialog(1);
    return { ok: true };
  }

  function pressEscape(times = 1) {
    for (let i = 0; i < times; i++) {
      try {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
        document.dispatchEvent(
          new KeyboardEvent("keyup", { key: "Escape", bubbles: true })
        );
      } catch (e) {}
    }
  }

  async function closeAnyOpenDialog(attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      // try Esc first
      pressEscape(1);
      await wait(100);
      const dialog =
        document.querySelector(
          '[role="dialog"][data-state="open"], [role="dialog"][aria-hidden="false"], [role="dialog"][open], [aria-modal="true"]'
        ) || null;
      if (!dialog) return true;
      // try clicking a close button
      const closeBtn =
        (dialog.querySelector &&
          dialog.querySelector(
            'button[aria-label="Close"], [aria-label="Close"]'
          )) ||
        null;
      if (closeBtn) {
        try {
          await clickCenter(closeBtn);
        } catch (e) {}
        await wait(120);
        continue;
      }
    }
    return false;
  }

  async function toggleThinkLonger() {
    try {
      const pill = findPill(
        (aria, label) =>
          aria.startsWith(LABELS.pillThinkStarts) ||
          label.startsWith(LABELS.pillThinkStarts)
      );
      if (pill) {
        await clickCenter(pill);
        await wait(140);
        return true;
      }

      const plus = getPlusButton();
      if (!plus) {
        return false;
      }

      const opened = await openPlusMenu();
      if (!opened) {
        return false;
      }

      const menuRoot = getOpenMenuRoot() || document;
      const items = getMenuItems();
      let target = Array.from(items).find((r) =>
        safeLower((r.textContent || "").trim()).includes(LABELS.thinkLonger)
      );
      if (target && isDisabledMenuItem(target)) {
        await closeAnyOpenDialog(3);
        pressEscape(2);
        return false;
      }
      if (!target) {
        await closeAnyOpenDialog(2);
        pressEscape(1);
        return false;
      }

      await clickElementRobust(target);

      await wait(TIMING.checkWaitMs);

      const radioParent =
        (target.closest && target.closest(SELECTORS.menuItems)) || target;
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
        await wait(TIMING.checkWaitMs - 20);
        checked =
          radioParent.getAttribute && radioParent.getAttribute("aria-checked");
      }

      await closeAnyOpenDialog(2);
      pressEscape(1);

      await wait(TIMING.clickWaitMs + 20);
      const pillNow = findPill(() => true);
      if (pillNow || checked === "true") {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error("toggleThinkLonger error", err);
      return false;
    }
  }

  async function runWebSearch() {
    try {
      let poppers = findVisibleMenuContaining(
        LABELS.webSearch.source ? "web search" : "web search"
      );
      if (!poppers || poppers.length === 0) {
        const plus = getPlusButton();
        if (!plus) {
          return false;
        }
        const opened = await openPlusMenu();
        if (!opened) {
          return false;
        }
        poppers = findVisibleMenuContaining("web search");
      }

      if (poppers.length === 0) {
        const menuRoot = getOpenMenuRoot();

        if (!menuRoot) {
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
          return false;
        }
        const moreEl =
          (maybeMore.closest && maybeMore.closest(SELECTORS.menuItems)) ||
          maybeMore;

        await hoverCenter(moreEl);

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
          await wait(60);
          poppers = findVisibleMenuContaining("web search");
        }
      }

      if (poppers.length === 0) {
        return false;
      }

      const popper =
        poppers.find((p) => {
          const r = p.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }) || poppers[0];

      const option = [...popper.querySelectorAll(SELECTORS.menuItems)].find(
        (el) => {
          const txt = (el.textContent || "").trim().toLowerCase();
          return LABELS.webSearch.test(txt);
        }
      );

      if (option && isDisabledMenuItem(option)) return false;
      if (!option) {
        return false;
      }

      await clickElementRobust(option);

      await wait(TIMING.clickWaitMs);
      return true;
    } catch (err) {
      console.error("runWebSearch error", err);
      return false;
    }
  }

  async function runDeepResearch() {
    const res = await selectTopMenuItemByText("deep research");
    return !!res.ok;
  }

  async function runCreateImage() {
    const res = await selectTopMenuItemByText("create image");
    return !!res.ok;
  }

  async function toggleByPillOrMenu(pillMatcher, runEnable) {
    try {
      const pill = findPill((aria, label, el) => pillMatcher(aria, label, el));
      if (pill) {
        await clickElementRobust(pill);
        await wait(120);
        return true;
      }
      return await runEnable();
    } catch (e) {
      return false;
    }
  }

  async function toggleDeepResearch() {
    return toggleByPillOrMenu(
      (aria, label) =>
        LABELS.pillResearch &&
        (aria.includes("research") || label.includes("research")),
      runDeepResearch
    );
  }

  async function toggleCreateImage() {
    return toggleByPillOrMenu(
      (aria, label) =>
        LABELS.pillImage && (aria.includes("image") || label.includes("image")),
      runCreateImage
    );
  }

  async function toggleWebSearch() {
    const wordSearch = LABELS.pillSearchWord;
    try {
      return await toggleByPillOrMenu(
        (aria, label) => wordSearch.test(aria) || wordSearch.test(label),
        runWebSearch
      );
    } catch (err) {
      console.error("toggleWebSearch error", err);
      return false;
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.action) return;
    if (msg.action === "toggleThinkLonger") {
      toggleThinkLonger().then((res) => sendResponse({ ok: !!res }));
      return true;
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
      } else if (mode === "deep_research") {
        toggleDeepResearch()
          .then((ok) => sendResponse({ ok }))
          .catch((e) => sendResponse({ ok: false, error: String(e) }));
        return true;
      } else if (mode === "create_image") {
        toggleCreateImage()
          .then((ok) => sendResponse({ ok }))
          .catch((e) => sendResponse({ ok: false, error: String(e) }));
        return true;
      } else {
        sendResponse({ ok: false, reason: "not_implemented" });
        return false;
      }
    }
  });

  let thinkShortcut = null; // {ctrl,alt,shift,meta,key}
  let webShortcut = null; // {ctrl,alt,shift,meta,key}
  let imageShortcut = null; // create image
  let researchShortcut = null; // deep research

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
  function isMacPlatform() {
    try {
      if (navigator.userAgentData && navigator.userAgentData.platform) {
        return /mac/i.test(navigator.userAgentData.platform);
      }
    } catch (e) {}
    try {
      return /mac/i.test(navigator.userAgent || "");
    } catch (e) {}
    return false;
  }

  function loadStoredShortcuts() {
    chrome.storage.sync.get(
      ["thinkShortcut", "webShortcut", "imageShortcut", "researchShortcut"],
      (res) => {
        const isMac = isMacPlatform();
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
        imageShortcut = normalizeShortcutObj(
          res.imageShortcut ||
            (isMac
              ? { ctrl: true, alt: false, shift: true, meta: false, key: "i" }
              : { ctrl: false, alt: true, shift: true, meta: false, key: "i" })
        );
        researchShortcut = normalizeShortcutObj(
          res.researchShortcut ||
            (isMac
              ? { ctrl: true, alt: false, shift: true, meta: false, key: "r" }
              : { ctrl: false, alt: true, shift: true, meta: false, key: "r" })
        );
      }
    );
  }
  loadStoredShortcuts();

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
        if (shortcutMatchesEvent(imageShortcut, e)) {
          e.preventDefault();
          e.stopPropagation();
          toggleCreateImage();
          return;
        }
        if (shortcutMatchesEvent(researchShortcut, e)) {
          e.preventDefault();
          e.stopPropagation();
          toggleDeepResearch();
          return;
        }
      } catch (err) {}
    },
    { capture: true }
  );
})();
