const DEFAULT_OPTIONS = {
  enabled: false,
  locatorType: "css",
  locator: "",
  texts: RTFILLER_WORD_BANK,
  wordBankVersion: 2,
  fillDelayMs: 100,
  overwriteFilled: false,
  fillExistingOnLoad: true
};

const fields = {
  enabled: document.querySelector("#enabled"),
  locatorType: document.querySelector("#locatorType"),
  locator: document.querySelector("#locator"),
  texts: document.querySelector("#texts"),
  fillExistingOnLoad: document.querySelector("#fillExistingOnLoad"),
  overwriteFilled: document.querySelector("#overwriteFilled"),
  status: document.querySelector("#status")
};

loadOptions();

for (const field of [
  fields.enabled,
  fields.locatorType,
  fields.locator,
  fields.texts,
  fields.fillExistingOnLoad,
  fields.overwriteFilled
]) {
  field.addEventListener("input", saveOptions);
}

function loadOptions() {
  chrome.storage.sync.get(null, (storedOptions) => {
    const options = normalizeOptions(storedOptions);

    fields.enabled.checked = options.enabled;
    fields.locatorType.value = options.locatorType;
    fields.locator.value = options.locator;
    fields.texts.value = options.texts.join("\n");
    fields.fillExistingOnLoad.checked = options.fillExistingOnLoad;
    fields.overwriteFilled.checked = options.overwriteFilled;
  });
}

function normalizeOptions(storedOptions) {
  const options = {
    ...DEFAULT_OPTIONS,
    ...storedOptions
  };

  if (storedOptions.wordBankVersion !== DEFAULT_OPTIONS.wordBankVersion) {
    options.texts = RTFILLER_WORD_BANK;
    options.wordBankVersion = DEFAULT_OPTIONS.wordBankVersion;
    options.fillDelayMs = DEFAULT_OPTIONS.fillDelayMs;
    chrome.storage.sync.set({
      texts: options.texts,
      wordBankVersion: options.wordBankVersion,
      fillDelayMs: options.fillDelayMs
    });
  }

  return options;
}

function saveOptions() {
  const options = {
    enabled: fields.enabled.checked,
    locatorType: fields.locatorType.value,
    locator: fields.locator.value.trim(),
    texts: fields.texts.value
      .split("\n")
      .map((text) => text.trim())
      .filter(Boolean),
    wordBankVersion: DEFAULT_OPTIONS.wordBankVersion,
    overwriteFilled: fields.overwriteFilled.checked,
    fillExistingOnLoad: fields.fillExistingOnLoad.checked
  };

  chrome.storage.sync.set(options, () => {
    fields.status.textContent = "Saved";
    window.clearTimeout(saveOptions.statusTimer);
    saveOptions.statusTimer = window.setTimeout(() => {
      fields.status.textContent = "";
    }, 1200);
  });
}
