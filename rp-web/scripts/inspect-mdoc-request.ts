#!/usr/bin/env bun
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  base64UrlDecodeBytes,
  buildDcapiSessionTranscript,
  cborDecode,
  cborDiagnostic,
  hex,
  inspectDeviceRequestBytes,
  inspectEncryptionInfoBytes,
  inspectOrgIsoMdocNavigatorArgument,
  PROTOCOL_ID,
  SMART_REQUEST_INFO_KEY,
  type OrgIsoMdocInspection,
} from "../src/protocol/index.ts";

type CliOptions = {
  input: string;
  outDir?: string;
  origin?: string;
};

type RawArtifacts = {
  navigatorArgument?: unknown;
  deviceRequestBytes?: Uint8Array;
  encryptionInfoBytes?: Uint8Array;
  sessionTranscriptBytes?: Uint8Array;
};

const options = parseArgs(process.argv.slice(2));
const { inspection, raw } = await inspectInput(options);

if (options.outDir) {
  await writeInspectionBundle(options.outDir, inspection, raw);
  console.log(`wrote ${options.outDir}`);
} else {
  console.log(JSON.stringify(inspection, null, 2));
}

function parseArgs(args: string[]): CliOptions {
  const rest: string[] = [];
  let outDir: string | undefined;
  let origin: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--out") {
      outDir = args[++i];
    } else if (arg === "--origin") {
      origin = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      rest.push(arg);
    }
  }
  if (rest.length !== 1) usage(1);
  return { input: rest[0]!, outDir, origin };
}

function usage(code: number): never {
  const msg = `Usage:
  bun scripts/inspect-mdoc-request.ts <navigator-arg.json|fixture-dir> [--out <dir>] [--origin <origin>]

Inputs:
  navigator-arg.json  JSON argument passed to navigator.credentials.get
  fixture-dir         Directory with navigator-credentials-get.arg.json, or
                      device-request.cbor plus optional encryption-info.cbor
`;
  (code === 0 ? console.log : console.error)(msg);
  process.exit(code);
}

async function inspectInput(
  options: CliOptions,
): Promise<{ inspection: OrgIsoMdocInspection; raw: RawArtifacts }> {
  const inputStat = await stat(options.input);
  if (inputStat.isDirectory()) {
    return inspectDirectory(options.input, options.origin);
  }
  const navigatorArgument = JSON.parse(await readFile(options.input, "utf8"));
  return inspectNavigatorArgument(navigatorArgument, options.origin);
}

async function inspectDirectory(
  dir: string,
  origin?: string,
): Promise<{ inspection: OrgIsoMdocInspection; raw: RawArtifacts }> {
  const argPath = join(dir, "navigator-credentials-get.arg.json");
  for (const candidate of [
    argPath,
    join(dir, "credential-manager-request.json"),
    join(dir, "request.json"),
  ]) {
    try {
      const navigatorArgument = JSON.parse(await readFile(candidate, "utf8"));
      return inspectNavigatorArgument(navigatorArgument, origin);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }

  const deviceRequestBytes = await readCborOrBase64Url(dir, "device-request");
  let encryptionInfoBytes: Uint8Array | undefined;
  try {
    encryptionInfoBytes = await readCborOrBase64Url(dir, "encryption-info");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }

  const inspection: OrgIsoMdocInspection = {
    protocol: PROTOCOL_ID,
    deviceRequest: inspectDeviceRequestBytes(deviceRequestBytes),
  };
  if (encryptionInfoBytes) {
    inspection.encryptionInfo = inspectEncryptionInfoBytes(encryptionInfoBytes);
    if (origin) {
      const sessionTranscriptBytes = await buildDcapiSessionTranscript({
        origin,
        encryptionInfo: encryptionInfoBytes,
      });
      inspection.sessionTranscript = {
        origin,
        hex: hex(sessionTranscriptBytes),
        diagnostic: cborDiagnostic(cborDecode(sessionTranscriptBytes)),
      };
      return { inspection, raw: { deviceRequestBytes, encryptionInfoBytes, sessionTranscriptBytes } };
    }
  }
  return { inspection, raw: { deviceRequestBytes, encryptionInfoBytes } };
}

async function readCborOrBase64Url(dir: string, stem: string): Promise<Uint8Array> {
  try {
    return new Uint8Array(await readFile(join(dir, `${stem}.cbor`)));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  return base64UrlDecodeBytes((await readFile(join(dir, `${stem}.b64u`), "utf8")).trim());
}

async function inspectNavigatorArgument(
  navigatorArgument: unknown,
  origin?: string,
): Promise<{ inspection: OrgIsoMdocInspection; raw: RawArtifacts }> {
  const fields = extractRequestFields(navigatorArgument);
  const deviceRequestBytes = base64UrlDecodeBytes(fields.deviceRequest);
  const encryptionInfoBytes = fields.encryptionInfo
    ? base64UrlDecodeBytes(fields.encryptionInfo)
    : undefined;
  const inspection = await inspectOrgIsoMdocNavigatorArgument(navigatorArgument, { origin });
  const sessionTranscriptBytes =
    origin && encryptionInfoBytes
      ? await buildDcapiSessionTranscript({ origin, encryptionInfo: encryptionInfoBytes })
      : undefined;
  return {
    inspection,
    raw: {
      navigatorArgument,
      deviceRequestBytes,
      encryptionInfoBytes,
      sessionTranscriptBytes,
    },
  };
}

function extractRequestFields(arg: unknown): { deviceRequest: string; encryptionInfo?: string } {
  const requests =
    (arg as { digital?: { requests?: unknown[] } })?.digital?.requests ??
    (arg as { requests?: unknown[] })?.requests;
  if (!Array.isArray(requests)) throw new Error("missing digital.requests[] or requests[]");
  const request = requests.find((r) => (r as { protocol?: unknown })?.protocol === PROTOCOL_ID);
  const data = (request as { data?: { deviceRequest?: unknown; encryptionInfo?: unknown } })?.data;
  if (!data || typeof data.deviceRequest !== "string") {
    throw new Error(`missing ${PROTOCOL_ID} data.deviceRequest`);
  }
  if (data.encryptionInfo !== undefined && typeof data.encryptionInfo !== "string") {
    throw new Error(`invalid ${PROTOCOL_ID} data.encryptionInfo`);
  }
  return { deviceRequest: data.deviceRequest, encryptionInfo: data.encryptionInfo };
}

async function writeInspectionBundle(
  dir: string,
  inspection: OrgIsoMdocInspection,
  raw: RawArtifacts,
): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "inspection.json"), `${JSON.stringify(inspection, null, 2)}\n`);

  if (raw.navigatorArgument !== undefined) {
    await writeFile(
      join(dir, "navigator-credentials-get.arg.json"),
      `${JSON.stringify(raw.navigatorArgument, null, 2)}\n`,
    );
  }
  if (raw.deviceRequestBytes) {
    await writeBinaryArtifact(dir, "device-request", raw.deviceRequestBytes, inspection.deviceRequest.deviceRequestDiagnostic);
  }
  const firstDocRequest = inspection.deviceRequest.docRequests[0];
  if (firstDocRequest) {
    const itemsRequestBytes = hexToBytes(firstDocRequest.itemsRequestHex);
    await writeBinaryArtifact(dir, "items-request", itemsRequestBytes, firstDocRequest.itemsRequestDiagnostic);
    await writeFile(
      join(dir, "items-request.decoded.json"),
      `${JSON.stringify(firstDocRequest.itemsRequest, null, 2)}\n`,
    );
    await writeFile(
      join(dir, "requested-element.txt"),
      `${firstDocRequest.requestedElements
        .map((e) => `${e.namespace}/${e.elementIdentifier} intentToRetain=${e.intentToRetain}`)
        .join("\n")}\n`,
    );
    if (firstDocRequest.requestInfo !== undefined) {
      await writeFile(
        join(dir, "request-info.json"),
        `${JSON.stringify(firstDocRequest.requestInfo, null, 2)}\n`,
      );
    }
    if (firstDocRequest.smartHealthCheckin.present) {
      await writeFile(join(dir, "smart-request.raw.json"), `${firstDocRequest.smartHealthCheckin.json}\n`);
      if (firstDocRequest.smartHealthCheckin.valid) {
        await writeFile(
          join(dir, "smart-request.json"),
          `${JSON.stringify(firstDocRequest.smartHealthCheckin.value, null, 2)}\n`,
        );
      }
    }
  }
  if (raw.encryptionInfoBytes && inspection.encryptionInfo) {
    await writeBinaryArtifact(
      dir,
      "encryption-info",
      raw.encryptionInfoBytes,
      inspection.encryptionInfo.encryptionInfoDiagnostic,
    );
  }
  if (raw.sessionTranscriptBytes && inspection.sessionTranscript) {
    await writeBinaryArtifact(
      dir,
      "session-transcript",
      raw.sessionTranscriptBytes,
      inspection.sessionTranscript.diagnostic,
    );
  }
}

async function writeBinaryArtifact(
  dir: string,
  stem: string,
  bytes: Uint8Array,
  diagnostic: string,
): Promise<void> {
  await writeFile(join(dir, `${stem}.cbor`), bytes);
  await writeFile(join(dir, `${stem}.cbor.hex`), `${hex(bytes)}\n`);
  await writeFile(join(dir, `${stem}.diag`), `${diagnostic}\n`);
}

function hexToBytes(s: string): Uint8Array {
  if (s.length % 2 !== 0) throw new Error("hex string must have even length");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
