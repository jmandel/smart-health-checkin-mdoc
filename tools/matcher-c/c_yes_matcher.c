// Always-yes C matcher.
//
// Modeled directly on digitalcredentialsdev/CMWallet's matcher/openid4vp1_0.c
// pattern: include credentialmanager.h verbatim from upstream, define
// `int main()`, emit one entry. No JSON, no base64. No allocations, so no
// libc needed — we build with `-nostdlib`.
//
// Sister to the Rust always-yes matcher at wallet-android/app/matcher/src/bin/yes.rs. If C
// works and Rust doesn't, suspect Rust toolchain issues (target choice,
// build-std, panic-immediate-abort) tripping the host's WASM sandbox.

#include "credentialmanager.h"
#include "smart_icon_96_png.h"

static const char* const ENTRY_ID = "checkin-default";
static const char* const ENTRY_SET_ID = "smart-health-checkin-set";
static const char* const ENTRY_TITLE = "SMART Health Check-in";
static const char* const ENTRY_SUBTITLE = "Choose what to share before anything is sent";
static const char* const ENTRY_DISCLAIMER =
    "Continue to review the requested health information in the SMART app.";
static const char* const FIELD_NAME = "Your health info";
static const char* const FIELD_VALUE =
    "You choose what to share. Continue to review details in SMART Health Check-in.";

static void emit_entry(void) {
    uint32_t wasm_version = 0;
    GetWasmVersion(&wasm_version);

    if (wasm_version > 1) {
        AddEntrySet(ENTRY_SET_ID, 1);
        AddEntryToSet(
            ENTRY_ID,
            (const char*)smart_icon_png, smart_icon_png_len,
            ENTRY_TITLE,
            ENTRY_SUBTITLE,
            ENTRY_DISCLAIMER,
            NULL,
            "{\"id\":\"checkin-default\",\"provider_idx\":0}",
            ENTRY_SET_ID,
            0);
        AddFieldToEntrySet(
            ENTRY_ID,
            FIELD_NAME,
            FIELD_VALUE,
            ENTRY_SET_ID,
            0);
    } else {
        AddStringIdEntry(
            ENTRY_ID,
            (const char*)smart_icon_png, smart_icon_png_len,
            ENTRY_TITLE,
            ENTRY_SUBTITLE,
            ENTRY_DISCLAIMER,
            NULL);
        AddFieldForStringIdEntry(ENTRY_ID, FIELD_NAME, FIELD_VALUE);
    }
}

int main(void) {
    emit_entry();
    return 0;
}

// Some Credential Manager versions invoke `_start` instead of `main`.
// Export both as zero-arg entry points pointing at the same code, mirroring
// the Rust matcher's `bin/yes.rs`.
__attribute__((export_name("_start")))
void shc_start(void) {
    emit_entry();
}
