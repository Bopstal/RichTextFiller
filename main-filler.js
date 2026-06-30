(function () {
  window.addEventListener("rtfiller:main-fill", (event) => {
    const detail = event.detail;
    if (!detail || !detail.id || typeof detail.text !== "string") {
      return;
    }

    const element = document.querySelector(`[data-rtfiller-id="${detail.id}"]`);
    if (!element) {
      return;
    }

    fillElement(element, detail.text);
  });

  function fillElement(element, text) {
    const previousValue = getElementValue(element);

    focusElement(element);
    selectElementContents(element);
    dispatchInputLifecycleEvent(element, "beforeinput", text);

    if (element.isContentEditable) {
      element.textContent = text;
    } else {
      setNativeValue(element, text);
      element.setAttribute("value", text);
    }

    resetReactValueTracker(element, previousValue);
    dispatchInputLifecycleEvent(element, "input", text);
    dispatchGenericEvent(element, "change");

    if (typeof element.click === "function") {
      element.click();
    }

    window.setTimeout(() => {
      dispatchInputLifecycleEvent(element, "input", text);
      dispatchGenericEvent(element, "change");

      if (typeof element.click === "function") {
        element.click();
      }
    }, 100);
  }

  function getElementValue(element) {
    if ("value" in element) {
      return element.value || "";
    }

    return element.textContent || "";
  }

  function focusElement(element) {
    element.focus({ preventScroll: true });
    dispatchGenericEvent(element, "focus");
    dispatchGenericEvent(element, "focusin");
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

  function setNativeValue(element, value) {
    const prototype = Object.getPrototypeOf(element);
    const prototypeDescriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    const elementDescriptor = Object.getOwnPropertyDescriptor(element, "value");

    if (prototypeDescriptor && prototypeDescriptor.set) {
      prototypeDescriptor.set.call(element, value);
      return;
    }

    if (elementDescriptor && elementDescriptor.set) {
      elementDescriptor.set.call(element, value);
      return;
    }

    element.value = value;
  }

  function resetReactValueTracker(element, previousValue) {
    if (element._valueTracker && typeof element._valueTracker.setValue === "function") {
      element._valueTracker.setValue(previousValue);
    }
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
})();
