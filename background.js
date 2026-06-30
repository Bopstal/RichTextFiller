const ICONS = {
  off: {
    16: "icons/icon-off-16.png",
    32: "icons/icon-off-32.png",
    48: "icons/icon-off-48.png",
    128: "icons/icon-off-128.png"
  },
  on: {
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png"
  }
};

chrome.runtime.onInstalled.addListener(updateIconFromStorage);
chrome.runtime.onStartup.addListener(updateIconFromStorage);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.enabled) {
    updateIcon(changes.enabled.newValue);
  }
});

function updateIconFromStorage() {
  chrome.storage.sync.get({ enabled: false }, ({ enabled }) => {
    updateIcon(enabled);
  });
}

function updateIcon(enabled) {
  chrome.action.setIcon({
    path: enabled ? ICONS.on : ICONS.off
  });
}
