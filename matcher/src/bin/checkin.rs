#![cfg_attr(all(target_arch = "wasm32", target_os = "unknown"), no_main)]

//! WASM matcher entry point for the SMART Health Check-in credential.
//!
//! The Credential Manager host has used both `main` and `_start` across
//! versions. Export both as no-arg functions for the wasm target; do not export
//! Rust's generated command-style `main(argc, argv) -> i32` shim.

use shc_matcher::credman::CredmanApiImpl;

fn run_matcher() {
    shc_matcher::logger::init();
    let _ = shc_matcher::run(&mut CredmanApiImpl);
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
