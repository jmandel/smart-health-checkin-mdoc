// Paste this into Safari/Web Inspector console before clicking the verifier's
// request button. It records the exact argument passed to navigator.credentials.get
// and then forwards to the real browser API.
//
// If you only want to inspect the request without launching a wallet, change
// FORWARD_TO_BROWSER to false.
(() => {
  const FORWARD_TO_BROWSER = true;

  function safeStringify(value) {
    const seen = new WeakSet();
    return JSON.stringify(
      value,
      (_key, val) => {
        if (val && typeof val === "object") {
          if (seen.has(val)) return "[circular]";
          seen.add(val);
        }
        if (val instanceof ArrayBuffer) return { __arrayBuffer: val.byteLength };
        if (ArrayBuffer.isView && ArrayBuffer.isView(val)) {
          return { __typedArray: val.constructor.name, byteLength: val.byteLength };
        }
        return val;
      },
      2,
    );
  }

  function emit(label, payload) {
    const text = `@@DC-SAFARI-CAPTURE@@${label}@@${safeStringify(payload)}`;
    console.log(text);
    try {
      window.__dcSafariCaptures ||= [];
      window.__dcSafariCaptures.push({ label, payload, at: new Date().toISOString() });
    } catch (_) {}
  }

  emit("env", {
    href: location.href,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor,
    hasCredentials: !!navigator.credentials,
    credentialsGetType: navigator.credentials && typeof navigator.credentials.get,
    digitalCredentialType: typeof window.DigitalCredential,
    identityCredentialType: typeof window.IdentityCredential,
  });

  const original = navigator.credentials && navigator.credentials.get
    ? navigator.credentials.get.bind(navigator.credentials)
    : null;

  if (!navigator.credentials || !original) {
    console.warn("navigator.credentials.get is not available in this Safari context");
    return;
  }

  const replacement = function captureCredentialsGet(arg) {
    emit("credentials.get", arg);
    if (FORWARD_TO_BROWSER) return original.apply(this, arguments);
    return Promise.reject(new DOMException("Captured by manual-safari-hook.js", "AbortError"));
  };

  try {
    Object.defineProperty(navigator.credentials, "get", {
      value: replacement,
      configurable: true,
      writable: true,
    });
  } catch (_) {
    navigator.credentials.get = replacement;
  }

  console.log(
    "Digital Credentials Safari hook installed. After the verifier calls credentials.get, inspect window.__dcSafariCaptures.",
  );
})();
