#![cfg_attr(all(target_arch = "wasm32", target_os = "unknown"), no_main)]

//! Diagnostic-only matcher: always emits one entry, no inspection.
//!
//! Use this to disambiguate "Your info wasn't found" failures:
//!
//!   1. Build:  bash matcher/build.sh yes
//!   2. Swap:   cp matcher/target/wasm32-unknown-unknown/release/yes.wasm \
//!                wallet-android/app/src/main/assets/matcher.wasm
//!   3. Build the app, register, trigger a request.
//!
//! - Entry **does** appear → the request shape was rejected by the real
//!   matcher's eligibility logic in `lib.rs::request_is_eligible`. Capture
//!   the request bytes from the wallet's debug bundle and tighten the
//!   eligibility loop.
//! - Entry **still missing** → the failure is upstream: registration didn't
//!   activate, the host isn't invoking us for this protocol, or the WASM
//!   isn't being loaded at all. Verify the home-screen "Registered" status
//!   and check the verifier's actual `protocol` value.
//!
//! Like `checkin.rs`, exports both `_start` and `main` to dodge cross-version
//! Credential Manager entry-point drift.

use shc_matcher::credman::CredmanApiImpl;

fn run_matcher() {
    shc_matcher::logger::init();
    shc_matcher::always_emit(&mut CredmanApiImpl);
}

#[cfg(not(all(target_arch = "wasm32", target_os = "unknown")))]
fn main() {
    run_matcher();
}

#[cfg(all(target_arch = "wasm32", target_os = "unknown"))]
#[unsafe(no_mangle)]
pub extern "C" fn main() {
    run_matcher();
}

#[cfg(all(target_arch = "wasm32", target_os = "unknown"))]
#[unsafe(no_mangle)]
pub extern "C" fn _start() {
    run_matcher();
}
