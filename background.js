const DEBUGGER_PROTOCOL_VERSION = "1.3";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "rtfiller:debugger-fill") {
    return false;
  }

  fillWithDebugger(sender.tab && sender.tab.id, message)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.warn("[RTFiller] Debugger fill failed:", error);
      sendResponse({ ok: false, error: String(error && error.message ? error.message : error) });
    });

  return true;
});

async function fillWithDebugger(tabId, message) {
  if (typeof tabId !== "number") {
    throw new Error("Missing tab id");
  }

  const target = { tabId };

  await attachDebugger(target);

  try {
    await selectFocusedText(target);

    await typeText(target, message.text);

    if (message.point) {
      await dispatchTrustedClick(target, message.point);
    }

    await dispatchTab(target);
  } finally {
    setTimeout(() => {
      chrome.debugger.detach(target);
    }, 250);
  }
}

function attachDebugger(target) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach(target, DEBUGGER_PROTOCOL_VERSION, () => {
      const error = chrome.runtime.lastError;

      if (error && !error.message.includes("Another debugger is already attached")) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}

function sendCommand(target, method, params) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand(target, method, params, (result) => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(result);
    });
  });
}

async function dispatchTrustedClick(target, point) {
  const params = {
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1
  };

  await sendCommand(target, "Input.dispatchMouseEvent", {
    ...params,
    type: "mousePressed"
  });

  await sendCommand(target, "Input.dispatchMouseEvent", {
    ...params,
    type: "mouseReleased"
  });
}

async function selectFocusedText(target) {
  const modifier = navigator.platform.includes("Mac") ? 4 : 2;

  await sendCommand(target, "Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
    modifiers: modifier
  });

  await sendCommand(target, "Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
    modifiers: modifier
  });
}

async function dispatchTab(target) {
  await sendCommand(target, "Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9
  });

  await sendCommand(target, "Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9
  });
}

async function typeText(target, text) {
  for (const character of text) {
    await sendCommand(target, "Input.dispatchKeyEvent", {
      type: "keyDown",
      text: character,
      unmodifiedText: character,
      key: character,
      windowsVirtualKeyCode: character.toUpperCase().charCodeAt(0),
      nativeVirtualKeyCode: character.toUpperCase().charCodeAt(0)
    });

    await sendCommand(target, "Input.dispatchKeyEvent", {
      type: "keyUp",
      key: character,
      windowsVirtualKeyCode: character.toUpperCase().charCodeAt(0),
      nativeVirtualKeyCode: character.toUpperCase().charCodeAt(0)
    });
  }
}
