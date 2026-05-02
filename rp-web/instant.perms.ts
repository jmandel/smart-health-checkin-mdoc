import type { InstantRules } from "@instantdb/react";

const rules = {
  "$default": {
    allow: {
      "$default": "false",
    },
  },
  attrs: {
    allow: {
      "$default": "false",
    },
  },
  "$files": {
    bind: {
      kioskBlobPath: "data.path.startsWith('submissions/')",
      knownStoragePath:
        "data.path == ruleParams.storagePath && " +
        "data.path.startsWith('submissions/' + ruleParams.requestId + '/')",
    },
    allow: {
      view: "knownStoragePath",
      create: "kioskBlobPath",
      update: "false",
      delete: "false",
    },
  },
  requests: {
    bind: {
      knowsRequest: "data.requestId == ruleParams.requestId",
      allowedFields:
        "request.modifiedFields.all(field, field in [" +
        "'requestId', 'encryptedRequest'" +
        "])",
    },
    allow: {
      view: "knowsRequest",
      create: "knowsRequest && allowedFields",
      update: "false",
      delete: "false",
    },
  },
  submissions: {
    bind: {
      knowsRequest: "data.requestId == ruleParams.requestId",
      allowedFields:
        "request.modifiedFields.all(field, field in [" +
        "'submissionId', 'requestId', 'storagePath', 'storageFileId', " +
        "'iv', 'phoneEphemeralPublicKeyJwk'" +
        "])",
      pathOk:
        "data.storagePath == 'submissions/' + data.requestId + '/' + data.submissionId + '.bin' && " +
        "data.storagePath.startsWith('submissions/' + ruleParams.requestId + '/')",
    },
    allow: {
      view: "knowsRequest",
      create: "knowsRequest && allowedFields && pathOk",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
