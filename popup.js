const DEFAULT_OPTIONS = {
  enabled: false,
  locators: [],
  texts: RTFILLER_WORD_BANK,
  wordBankVersion: 2,
  fillDelayMs: 100,
  overwriteFilled: false,
  fillExistingOnLoad: true
};

const fields = {
  enabled: document.querySelector("#enabled"),
  locators: document.querySelector("#locators"),
  addLocator: document.querySelector("#addLocator"),
  texts: document.querySelector("#texts"),
  fillExistingOnLoad: document.querySelector("#fillExistingOnLoad"),
  overwriteFilled: document.querySelector("#overwriteFilled"),
  status: document.querySelector("#status")
};

loadOptions();

for (const field of [
  fields.enabled,
  fields.texts,
  fields.fillExistingOnLoad,
  fields.overwriteFilled
]) {
  field.addEventListener("input", saveOptions);
}

fields.addLocator.addEventListener("click", () => {
  addLocatorRow({ type: "css", value: "" });
  saveOptions();
});

function loadOptions() {
  chrome.storage.sync.get(null, (storedOptions) => {
    const options = normalizeOptions(storedOptions);

    fields.enabled.checked = options.enabled;
    renderLocators(options.locators);
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

  if (!Array.isArray(options.locators)) {
    options.locators = normalizeLegacyLocator(storedOptions);
  }

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

function normalizeLegacyLocator(storedOptions) {
  if (!storedOptions.locator || !storedOptions.locator.trim()) {
    return [{ type: "css", value: "" }];
  }

  return [
    {
      type: storedOptions.locatorType || "css",
      value: storedOptions.locator.trim()
    }
  ];
}

function renderLocators(locators) {
  fields.locators.textContent = "";

  const rows = locators.length > 0 ? locators : [{ type: "css", value: "" }];
  for (const locator of rows) {
    addLocatorRow(locator);
  }
}

function addLocatorRow(locator) {
  const row = document.createElement("div");
  row.className = "locator-row";

  const type = document.createElement("select");
  type.className = "locator-type";
  type.innerHTML = `
    <option value="css">CSS</option>
    <option value="xpath">XPath</option>
    <option value="testid">data-testid</option>
  `;
  type.value = locator.type || "css";

  const value = document.createElement("input");
  value.className = "locator-value";
  value.type = "text";
  value.placeholder = getLocatorPlaceholder(type.value);
  value.value = locator.value || "";

  const remove = document.createElement("button");
  remove.className = "icon-button";
  remove.type = "button";
  remove.textContent = "x";
  remove.title = "Remove locator";
  remove.setAttribute("aria-label", "Remove locator");

  type.addEventListener("input", () => {
    value.placeholder = getLocatorPlaceholder(type.value);
    saveOptions();
  });
  value.addEventListener("input", saveOptions);
  remove.addEventListener("click", () => {
    row.remove();
    if (fields.locators.children.length === 0) {
      addLocatorRow({ type: "css", value: "" });
    }
    saveOptions();
  });

  row.append(type, value, remove);
  fields.locators.append(row);
}

function getLocatorPlaceholder(type) {
  if (type === "xpath") {
    return "//input[@name='firstName']";
  }

  if (type === "testid") {
    return "first-name";
  }

  return "input[name='firstName']";
}

function saveOptions() {
  const options = {
    enabled: fields.enabled.checked,
    locators: getLocatorRows(),
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

function getLocatorRows() {
  return Array.from(fields.locators.querySelectorAll(".locator-row"))
    .map((row) => ({
      type: row.querySelector(".locator-type").value,
      value: row.querySelector(".locator-value").value.trim()
    }))
    .filter((locator) => locator.value);
}
