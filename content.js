(function () {
  const DEFAULT_OPTIONS = {
    enabled: false,
    locators: [],
    texts: RTFILLER_WORD_BANK,
    wordBankVersion: 2,
    fillDelayMs: 100,
    overwriteFilled: false,
    fillExistingOnLoad: true
  };

  let options = { ...DEFAULT_OPTIONS };
  let pendingFill = 0;
  let pendingMutationFill = 0;

  loadOptions();
  observeDomChanges();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    options = {
      ...options,
      ...Object.fromEntries(
        Object.entries(changes).map(([key, change]) => [key, change.newValue])
      )
    };

    scheduleFill();
  });

  window.addEventListener("rtfiller:network-complete", () => {
    scheduleFill();
  });

  function loadOptions() {
    chrome.storage.sync.get(null, (storedOptions) => {
      options = normalizeOptions(storedOptions);

      if (options.fillExistingOnLoad) {
        scheduleFill();
      }
    });
  }

  function normalizeOptions(storedOptions) {
    const normalizedOptions = {
      ...DEFAULT_OPTIONS,
      ...storedOptions
    };

    if (!Array.isArray(normalizedOptions.locators)) {
      normalizedOptions.locators = normalizeLegacyLocator(storedOptions);
    }

    if (storedOptions.wordBankVersion !== DEFAULT_OPTIONS.wordBankVersion) {
      normalizedOptions.texts = RTFILLER_WORD_BANK;
      normalizedOptions.wordBankVersion = DEFAULT_OPTIONS.wordBankVersion;
      normalizedOptions.fillDelayMs = DEFAULT_OPTIONS.fillDelayMs;
      chrome.storage.sync.set({
        texts: normalizedOptions.texts,
        wordBankVersion: normalizedOptions.wordBankVersion,
        fillDelayMs: normalizedOptions.fillDelayMs
      });
    }

    return normalizedOptions;
  }

  function scheduleFill() {
    if (!options.enabled || getActiveLocators().length === 0) {
      return;
    }

    window.clearTimeout(pendingFill);
    pendingFill = window.setTimeout(fillMatchesWhenReady, options.fillDelayMs);
  }

  function scheduleMutationFill() {
    if (!options.enabled || getActiveLocators().length === 0) {
      return;
    }

    window.clearTimeout(pendingMutationFill);
    pendingMutationFill = window.setTimeout(fillMatchesWhenReady, options.fillDelayMs);
  }

  function fillMatchesWhenReady() {
    if (document.readyState !== "complete") {
      window.addEventListener("load", () => scheduleFill(), { once: true });
      return;
    }

    fillMatches();
  }

  function fillMatches() {
    const elements = findElementsForLocators(getActiveLocators());

    for (const element of elements) {
      if (!isVisible(element)) {
        continue;
      }

      if (!options.overwriteFilled && getElementValue(element).trim()) {
        continue;
      }

      fillElement(element, getRandomText());
    }
  }

  function getActiveLocators() {
    return options.locators
      .map((locator) => ({
        type: locator.type || "css",
        value: (locator.value || "").trim()
      }))
      .filter((locator) => locator.value);
  }

  function normalizeLegacyLocator(storedOptions) {
    if (!storedOptions.locator || !storedOptions.locator.trim()) {
      return [];
    }

    return [
      {
        type: storedOptions.locatorType || "css",
        value: storedOptions.locator.trim()
      }
    ];
  }

  function findElementsForLocators(locators) {
    const elements = [];
    const seenElements = new Set();

    for (const locator of locators) {
      for (const element of findElements(locator.type, locator.value)) {
        if (!seenElements.has(element)) {
          seenElements.add(element);
          elements.push(element);
        }
      }
    }

    return elements;
  }

  function findElements(locatorType, locator) {
    try {
      if (locatorType === "xpath") {
        return findByXPath(locator);
      }

      if (locatorType === "testid") {
        return Array.from(document.querySelectorAll(`[data-testid="${cssEscape(locator)}"]`));
      }

      return Array.from(document.querySelectorAll(locator));
    } catch (error) {
      console.warn("[RTFiller] Invalid locator:", error);
      return [];
    }
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }

    return value.replace(/["\\]/g, "\\$&");
  }

  function findByXPath(xpath) {
    const snapshot = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    const elements = [];
    for (let index = 0; index < snapshot.snapshotLength; index += 1) {
      const node = snapshot.snapshotItem(index);
      if (node instanceof Element) {
        elements.push(node);
      }
    }

    return elements;
  }

  function getRandomText() {
    const texts = options.texts
      .map((text) => text.trim())
      .filter(Boolean);

    if (texts.length === 0) {
      return crypto.randomUUID();
    }

    return getRandomWords(texts, 5).join(" ");
  }

  function getRandomWords(words, count) {
    const pickedWords = [];

    for (let index = 0; index < count; index += 1) {
      pickedWords.push(words[Math.floor(Math.random() * words.length)]);
    }

    return pickedWords;
  }

  function fillElement(element, text) {
    const tagName = element.tagName.toLowerCase();
    const isEditable = element.isContentEditable;
    const isInput =
      tagName === "textarea" ||
      (tagName === "input" && supportsTextValue(element));

    if (isInput) {
      dispatchActivationEvents(element);
      focusElement(element);
      selectElementContents(element);
      element.dataset.rtfillerFilled = "true";
      fillInputInMainWorld(element, text);
      return;
    }

    if (isEditable) {
      ensureElementId(element);
      element.dataset.rtfillerFilled = "true";
      fillInputInMainWorld(element, text);
    }
  }

  function fillInputInMainWorld(element, text) {
    const id = ensureElementId(element);
    window.dispatchEvent(
      new CustomEvent("rtfiller:main-fill", {
        detail: { id, text }
      })
    );

    window.setTimeout(() => {
      dispatchGenericEvent(element, "change");
      commitElement(element, text);
    }, 150);
  }

  function ensureElementId(element) {
    if (!element.dataset.rtfillerId) {
      element.dataset.rtfillerId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    return element.dataset.rtfillerId;
  }

  function selectElementContents(element) {
    if (typeof element.select === "function") {
      element.select();
      return;
    }

    if (typeof element.setSelectionRange === "function") {
      element.setSelectionRange(0, element.value.length);
    }
  }

  function commitElement(element, text) {
    window.setTimeout(() => {
      nativeClick(element);
      focusElement(element);
      dispatchInputLifecycleEvent(element, "input", text);
      dispatchGenericEvent(element, "change");
    }, 50);

    window.setTimeout(() => {
      nativeClick(element);
      focusElement(element);
      dispatchGenericEvent(element, "change");
    }, 250);
  }

  function nativeClick(element) {
    if (typeof element.click === "function") {
      element.click();
    }
  }

  function dispatchActivationEvents(element) {
    for (const eventName of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      element.dispatchEvent(
        new MouseEvent(eventName, {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window
        })
      );
    }
  }

  function dispatchKeyboardEvents(element, text) {
    const lastCharacter = text.at(-1) || " ";

    for (const eventName of ["keydown", "keypress", "keyup"]) {
      element.dispatchEvent(
        new KeyboardEvent(eventName, {
          bubbles: true,
          cancelable: true,
          composed: true,
          key: lastCharacter,
          code: `Key${lastCharacter.toUpperCase()}`,
          view: window
        })
      );
    }
  }

  function focusElement(element) {
    if (document.activeElement === element) {
      return;
    }

    element.focus({ preventScroll: true });
    dispatchGenericEvent(element, "focus");
    dispatchGenericEvent(element, "focusin");
  }

  function blurElement(element) {
    dispatchGenericEvent(element, "blur");
    dispatchGenericEvent(element, "focusout");
    element.blur();
  }

  function dispatchGenericEvent(element, eventName) {
    element.dispatchEvent(
      new Event(eventName, {
        bubbles: true,
        composed: true
      })
    );
  }

  function dispatchInputLifecycleEvent(element, eventName, text) {
    element.dispatchEvent(
      new InputEvent(eventName, {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: text,
        inputType: "insertText"
      })
    );
  }

  function getElementValue(element) {
    const tagName = element.tagName.toLowerCase();

    if (tagName === "input" || tagName === "textarea") {
      return element.value || "";
    }

    if (element.isContentEditable) {
      return element.textContent || "";
    }

    return "";
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  }

  function supportsTextValue(element) {
    return [
      "",
      "email",
      "number",
      "password",
      "search",
      "tel",
      "text",
      "url"
    ].includes(element.type);
  }

  function observeDomChanges() {
    const startObserver = () => {
      const target = document.documentElement || document.body;
      if (!target) {
        return;
      }

      const observer = new MutationObserver(scheduleMutationFill);
      observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "id", "name", "type", "contenteditable"]
      });
    };

    if (document.documentElement || document.body) {
      startObserver();
    } else {
      document.addEventListener("DOMContentLoaded", startObserver, { once: true });
    }
  }
})();
