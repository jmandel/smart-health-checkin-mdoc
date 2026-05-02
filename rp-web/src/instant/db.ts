import { init } from "@instantdb/react";
import { COMMITTED_INSTANT_APP_ID } from "./public-config.ts";
import schema from "./schema.ts";

const env = typeof process === "undefined" ? {} : process.env;

export const INSTANT_APP_ID =
  env.BUN_PUBLIC_INSTANT_APP_ID ??
  env.INSTANT_DB_PUBLIC_ID ??
  env.INSTANT_APP_ID ??
  env.NEXT_PUBLIC_INSTANT_APP_ID ??
  env.VITE_INSTANT_APP_ID ??
  COMMITTED_INSTANT_APP_ID;

export const instantConfigured = INSTANT_APP_ID.length > 0;

export const db = init({
  appId: INSTANT_APP_ID || "00000000-0000-0000-0000-000000000000",
  schema,
  devtool: false,
});
