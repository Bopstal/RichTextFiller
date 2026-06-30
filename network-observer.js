(function () {
  const notify = () => {
    window.dispatchEvent(new CustomEvent("rtfiller:network-complete"));
  };

  if (window.fetch && !window.fetch.__rtfillerWrapped) {
    const originalFetch = window.fetch;
    const wrappedFetch = function (...args) {
      return originalFetch.apply(this, args).finally(notify);
    };

    wrappedFetch.__rtfillerWrapped = true;
    window.fetch = wrappedFetch;
  }

  if (window.XMLHttpRequest && !window.XMLHttpRequest.__rtfillerWrapped) {
    const originalOpen = window.XMLHttpRequest.prototype.open;
    const originalSend = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.open = function (...args) {
      this.__rtfillerTracked = true;
      return originalOpen.apply(this, args);
    };

    window.XMLHttpRequest.prototype.send = function (...args) {
      if (this.__rtfillerTracked) {
        this.addEventListener("loadend", notify, { once: true });
      }

      return originalSend.apply(this, args);
    };

    window.XMLHttpRequest.__rtfillerWrapped = true;
  }
})();
