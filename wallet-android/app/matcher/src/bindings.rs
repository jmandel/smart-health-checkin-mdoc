//! Raw FFI bindings to the host-provided `credman` / `credman_v2` import
//! modules.
//!
//! Mirrors the canonical `credentialmanager.h` ABI from the upstream
//! digitalcredentialsdev/CMWallet matcher (April 2026 HEAD). We import only
//! the entry points the SMART Check-in matcher actually uses:
//!
//! - **v1 (`credman`)**: legacy single-entry surface. Modern Credential
//!   Manager hosts still accept these calls but the picker UI no longer
//!   renders them — see `lib.rs::run` for why we keep them as the fallback
//!   path only.
//! - **v2 (`credman_v2`)**: credential-set surface. Modern hosts read
//!   entries from here. We probe the host's WASM ABI version with
//!   `GetWasmVersion` and pick the v2 path when available.
//!
//! When the binary targets `wasm32-unknown-unknown`, these symbols are
//! resolved against the host at instantiation time. When running natively
//! (e.g. the `cli` feature or `cargo test`), they're stubbed.

#![allow(non_snake_case)]

use core::ffi::{c_char, c_void};

#[repr(C)]
pub struct CallingAppInfo {
    pub package_name: [u8; 256],
    pub origin: [u8; 512],
}

// ----------------------------------------------------------------------
// v1: `credman`
// ----------------------------------------------------------------------
#[cfg(all(target_arch = "wasm32", target_os = "unknown"))]
#[link(wasm_import_module = "credman")]
unsafe extern "C" {
    pub fn GetWasmVersion(version: *mut u32);

    pub fn GetRequestSize(size: *mut u32);
    pub fn GetRequestBuffer(buffer: *mut c_void);

    pub fn GetCredentialsSize(size: *mut u32);
    pub fn ReadCredentialsBuffer(buffer: *mut c_void, offset: usize, len: usize) -> usize;

    pub fn GetCallingAppInfo(info: *mut CallingAppInfo);

    pub fn AddStringIdEntry(
        cred_id: *const c_char,
        icon: *const c_char,
        icon_len: usize,
        title: *const c_char,
        subtitle: *const c_char,
        disclaimer: *const c_char,
        warning: *const c_char,
    );

    pub fn AddFieldForStringIdEntry(
        cred_id: *const c_char,
        field_display_name: *const c_char,
        field_display_value: *const c_char,
    );
}

// ----------------------------------------------------------------------
// v2: `credman_v2` — credential-set surface used by modern picker UIs
// ----------------------------------------------------------------------
#[cfg(all(target_arch = "wasm32", target_os = "unknown"))]
#[link(wasm_import_module = "credman_v2")]
unsafe extern "C" {
    pub fn AddEntrySet(set_id: *const c_char, set_length: i32);

    pub fn AddEntryToSet(
        cred_id: *const c_char,
        icon: *const c_char,
        icon_len: usize,
        title: *const c_char,
        subtitle: *const c_char,
        disclaimer: *const c_char,
        warning: *const c_char,
        metadata: *const c_char,
        set_id: *const c_char,
        set_index: i32,
    );

    pub fn AddFieldToEntrySet(
        cred_id: *const c_char,
        field_display_name: *const c_char,
        field_display_value: *const c_char,
        set_id: *const c_char,
        set_index: i32,
    );
}

// ----------------------------------------------------------------------
// Native stubs. Used when running tests or the `cli` harness.
// ----------------------------------------------------------------------
#[cfg(not(all(target_arch = "wasm32", target_os = "unknown")))]
pub mod stubs {
    use super::*;
    pub unsafe fn GetWasmVersion(_: *mut u32) {}
    pub unsafe fn GetRequestSize(_: *mut u32) {}
    pub unsafe fn GetRequestBuffer(_: *mut c_void) {}
    pub unsafe fn GetCredentialsSize(_: *mut u32) {}
    pub unsafe fn ReadCredentialsBuffer(_: *mut c_void, _: usize, _: usize) -> usize { 0 }
    pub unsafe fn GetCallingAppInfo(_: *mut CallingAppInfo) {}
    pub unsafe fn AddStringIdEntry(
        _: *const c_char, _: *const c_char, _: usize,
        _: *const c_char, _: *const c_char, _: *const c_char, _: *const c_char,
    ) {}
    pub unsafe fn AddFieldForStringIdEntry(_: *const c_char, _: *const c_char, _: *const c_char) {}
    pub unsafe fn AddEntrySet(_: *const c_char, _: i32) {}
    pub unsafe fn AddEntryToSet(
        _: *const c_char, _: *const c_char, _: usize,
        _: *const c_char, _: *const c_char, _: *const c_char, _: *const c_char,
        _: *const c_char, _: *const c_char, _: i32,
    ) {}
    pub unsafe fn AddFieldToEntrySet(
        _: *const c_char, _: *const c_char, _: *const c_char,
        _: *const c_char, _: i32,
    ) {}
}

#[cfg(not(all(target_arch = "wasm32", target_os = "unknown")))]
pub use stubs::*;
