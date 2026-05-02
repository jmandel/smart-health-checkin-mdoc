import {
  PROTOCOL_ID,
  type OrgIsoMdocRequestBundle,
} from "../protocol/index.ts";

export type KioskReturnTransport =
  | { kind: "worker-relay"; relayUrl: string }
  | { kind: "camera-qr-return" }
  | { kind: "local-wss-return"; url: string }
  | { kind: "webrtc-double-qr" };

export type KioskSessionDescriptor = {
  type: "smart-health-checkin-kiosk-session";
  version: "1";
  protocol: typeof PROTOCOL_ID;
  requestId: string;
  returnTransport: KioskReturnTransport;
  deviceRequest: string;
  encryptionInfo: string;
  origin?: string;
  createdAt?: string;
  expiresAt?: string;
};

export function createKioskSessionDescriptor(input: {
  requestId: string;
  requestBundle: OrgIsoMdocRequestBundle;
  returnTransport: KioskReturnTransport;
  origin?: string;
  createdAt?: string;
  expiresAt?: string;
}): KioskSessionDescriptor {
  if (!input.requestId) throw new Error("requestId is required");
  const request = input.requestBundle.navigatorArgument.digital.requests[0];
  return {
    type: "smart-health-checkin-kiosk-session",
    version: "1",
    protocol: PROTOCOL_ID,
    requestId: input.requestId,
    returnTransport: input.returnTransport,
    deviceRequest: request.data.deviceRequest,
    encryptionInfo: request.data.encryptionInfo,
    origin: input.origin,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
  };
}

export function createKioskPortalUrl(baseUrl: string | URL, descriptor: KioskSessionDescriptor): string {
  const url = new URL(String(baseUrl));
  url.hash = encodeKioskSessionFragment(descriptor);
  return url.toString();
}

export function encodeKioskSessionFragment(descriptor: KioskSessionDescriptor): string {
  const params = new URLSearchParams({
    shc: "kiosk",
    v: descriptor.version,
    p: descriptor.protocol,
    r: descriptor.requestId,
    rt: descriptor.returnTransport.kind,
    dr: descriptor.deviceRequest,
    ei: descriptor.encryptionInfo,
  });
  if (descriptor.origin) params.set("o", descriptor.origin);
  if (descriptor.createdAt) params.set("iat", descriptor.createdAt);
  if (descriptor.expiresAt) params.set("exp", descriptor.expiresAt);
  switch (descriptor.returnTransport.kind) {
    case "worker-relay":
      params.set("relay", descriptor.returnTransport.relayUrl);
      break;
    case "local-wss-return":
      params.set("return", descriptor.returnTransport.url);
      break;
    case "camera-qr-return":
    case "webrtc-double-qr":
      break;
  }
  return params.toString();
}

export function decodeKioskSessionFragment(fragment: string): KioskSessionDescriptor {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  if (params.get("shc") !== "kiosk") throw new Error("not a SMART Check-in kiosk fragment");
  if (params.get("v") !== "1") throw new Error("unsupported kiosk fragment version");
  if (params.get("p") !== PROTOCOL_ID) throw new Error(`unsupported kiosk protocol ${params.get("p") ?? ""}`);

  const requestId = requiredParam(params, "r");
  const kind = requiredParam(params, "rt") as KioskReturnTransport["kind"];
  const returnTransport = decodeReturnTransport(kind, params);
  return {
    type: "smart-health-checkin-kiosk-session",
    version: "1",
    protocol: PROTOCOL_ID,
    requestId,
    returnTransport,
    deviceRequest: requiredParam(params, "dr"),
    encryptionInfo: requiredParam(params, "ei"),
    origin: optionalParam(params, "o"),
    createdAt: optionalParam(params, "iat"),
    expiresAt: optionalParam(params, "exp"),
  };
}

function decodeReturnTransport(kind: KioskReturnTransport["kind"], params: URLSearchParams): KioskReturnTransport {
  switch (kind) {
    case "worker-relay":
      return { kind, relayUrl: requiredParam(params, "relay") };
    case "camera-qr-return":
      return { kind };
    case "local-wss-return":
      return { kind, url: requiredParam(params, "return") };
    case "webrtc-double-qr":
      return { kind };
    default:
      throw new Error(`unsupported kiosk return transport: ${String(kind)}`);
  }
}

function requiredParam(params: URLSearchParams, key: string): string {
  const value = params.get(key);
  if (!value) throw new Error(`kiosk fragment missing ${key}`);
  return value;
}

function optionalParam(params: URLSearchParams, key: string): string | undefined {
  return params.get(key) ?? undefined;
}
