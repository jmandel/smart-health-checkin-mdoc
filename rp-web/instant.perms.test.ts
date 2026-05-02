import { describe, expect, test } from "bun:test";
import rules from "./instant.perms.ts";

describe("InstantDB kiosk permissions", () => {
  test("requests cannot be enumerated without the exact request pointer", () => {
    expect(rules.requests.allow.view).toBe("knowsRequest");
    expect(rules.requests.bind.knowsRequest).toBe("data.requestId == ruleParams.requestId");

    const request = { requestId: "request-abc" };
    expect(canViewRequest(request, {})).toBe(false);
    expect(canViewRequest(request, { requestId: "request-other" })).toBe(false);
    expect(canViewRequest(request, { requestId: "request-abc" })).toBe(true);
  });

  test("files cannot be enumerated without the exact request and storage path", () => {
    expect(rules.$files.allow.view).toBe("knownStoragePath");
    expect(rules.$files.bind.knownStoragePath).toBe(
      "data.path == ruleParams.storagePath && " +
        "data.path.startsWith('submissions/' + ruleParams.requestId + '/')",
    );

    const file = { path: "submissions/request-abc/submission-123.bin" };
    expect(canViewFile(file, {})).toBe(false);
    expect(canViewFile(file, { requestId: "request-abc" })).toBe(false);
    expect(canViewFile(file, { storagePath: file.path })).toBe(false);
    expect(canViewFile(file, {
      requestId: "request-other",
      storagePath: file.path,
    })).toBe(false);
    expect(canViewFile(file, {
      requestId: "request-abc",
      storagePath: "submissions/request-abc/submission-other.bin",
    })).toBe(false);
    expect(canViewFile(file, {
      requestId: "request-abc",
      storagePath: file.path,
    })).toBe(true);
  });
});

function canViewRequest(
  data: { requestId: string },
  ruleParams: { requestId?: string },
): boolean {
  return data.requestId === ruleParams.requestId;
}

function canViewFile(
  data: { path: string },
  ruleParams: { requestId?: string; storagePath?: string },
): boolean {
  return data.path === ruleParams.storagePath &&
    data.path.startsWith(`submissions/${ruleParams.requestId}/`);
}
