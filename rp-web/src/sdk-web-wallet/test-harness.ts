// Common harness for credential-getter tests: a fake popup, a fake window
// listener registry, and a helper to fire postMessage events. This lives
// alongside popup-credential-getter.ts so it does not pollute the SDK.

export type FakePopup = {
  closed: boolean;
  location: { href: string };
  close: () => void;
  postMessage: (msg: unknown, target: string) => void;
};

export type FakeMessageEvent = {
  data: unknown;
  origin: string;
  source: unknown;
};

export type Harness = {
  fakePopup: FakePopup;
  postedToPopup: Array<{ msg: unknown; target: string }>;
  messageHost: {
    addEventListener: (type: "message", listener: (ev: MessageEvent) => void) => void;
    removeEventListener: (type: "message", listener: (ev: MessageEvent) => void) => void;
  };
  fireFromPopup: (data: unknown, origin: string) => void;
};

export function makeHarness(): Harness {
  const postedToPopup: Array<{ msg: unknown; target: string }> = [];
  const fakePopup: FakePopup = {
    closed: false,
    location: { href: "about:blank" },
    close() {
      this.closed = true;
    },
    postMessage(msg, target) {
      postedToPopup.push({ msg, target });
    },
  };
  const listeners: Array<(ev: MessageEvent) => void> = [];
  return {
    fakePopup,
    postedToPopup,
    messageHost: {
      addEventListener(_type, listener) {
        listeners.push(listener);
      },
      removeEventListener(_type, listener) {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      },
    },
    fireFromPopup(data, origin) {
      const event = {
        data,
        origin,
        source: fakePopup as unknown as MessageEventSource,
      } as unknown as MessageEvent;
      for (const listener of [...listeners]) listener(event);
    },
  };
}
