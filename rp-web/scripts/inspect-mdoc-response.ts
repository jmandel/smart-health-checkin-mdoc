#!/usr/bin/env bun
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  inspectDcapiMdocResponse,
  inspectDeviceResponseBytes,
  type DcapiResponseInspection,
  type DeviceResponseInspection,
} from "../src/protocol/index.ts";

type CliOptions = {
  input: string;
  outDir?: string;
};

type ResponseInspection =
  | {
      kind: "dcapi-response";
      inspection: DcapiResponseInspection;
    }
  | {
      kind: "plaintext-device-response";
      inspection: DeviceResponseInspection;
    };

const options = parseArgs(process.argv.slice(2));
const inspection = await inspectInput(options.input);

if (options.outDir) {
  await writeOutput(options.outDir, inspection);
  console.log(`wrote ${options.outDir}`);
} else {
  console.log(JSON.stringify(inspection, null, 2));
}

function parseArgs(args: string[]): CliOptions {
  const rest: string[] = [];
  let outDir: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--out") {
      outDir = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      rest.push(arg);
    }
  }
  if (rest.length !== 1) usage(1);
  return { input: rest[0]!, outDir };
}

function usage(code: number): never {
  const msg = `Usage:
  bun scripts/inspect-mdoc-response.ts <wallet-response.json|device-response.cbor> [--out <dir>]

Inputs:
  wallet-response.json  DigitalCredential JSON with data.response; decodes only
                        the direct dcapi wrapper. HPKE opening comes later.
  device-response.cbor  Plaintext DeviceResponse bytes, e.g. after HPKE open or
                        a checked-in unencrypted fixture.
`;
  (code === 0 ? console.log : console.error)(msg);
  process.exit(code);
}

async function inspectInput(path: string): Promise<ResponseInspection> {
  const bytes = new Uint8Array(await readFile(path));
  const text = new TextDecoder().decode(bytes);
  if (looksLikeJson(text)) {
    const parsed = JSON.parse(text);
    return {
      kind: "dcapi-response",
      inspection: inspectDcapiMdocResponse(parsed),
    };
  }
  return {
    kind: "plaintext-device-response",
    inspection: await inspectDeviceResponseBytes(bytes),
  };
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

async function writeOutput(dir: string, inspection: ResponseInspection): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "response-inspection.json"), `${JSON.stringify(inspection, null, 2)}\n`);
  if (inspection.kind === "plaintext-device-response") {
    const smart = inspection.inspection.documents
      .flatMap((d) => d.elements)
      .find((e) => e.smartHealthCheckinResponse.present)?.smartHealthCheckinResponse;
    if (smart?.present) {
      await writeFile(join(dir, "smart-response.raw.json"), `${smart.json}\n`);
      if (smart.valid) {
        await writeFile(join(dir, "smart-response.json"), `${JSON.stringify(smart.value, null, 2)}\n`);
      }
    }
  }
}
