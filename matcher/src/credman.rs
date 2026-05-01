//! Testable wrapper around the `credman` / `credman_v2` host imports.
//!
//! All matcher code talks to the host through `CredmanApi`, never to the
//! raw `bindings::*` symbols. That lets us substitute an in-memory mock in
//! unit tests and a native fixture-backed harness in the `cli` feature.
//!
//! The trait covers both v1 (single-entry) and v2 (credential-set)
//! surfaces. v2 methods have default no-op implementations so existing
//! mocks don't have to be updated when only the v1 path is exercised.

use core::ffi::{c_char, c_void};
use std::ffi::CStr;

use crate::bindings::{
    self, CallingAppInfo, GetCallingAppInfo, GetCredentialsSize, GetRequestBuffer, GetRequestSize,
    GetWasmVersion, ReadCredentialsBuffer,
};

/// Seam against the host `credman` ABI. v1 calls are required; v2 calls
/// have default no-op implementations so existing tests still compile.
pub trait CredmanApi {
    fn get_request_buffer(&self) -> Vec<u8>;
    fn get_registered_data(&self) -> Vec<u8>;
    fn get_calling_app_info(&self) -> CallingAppInfoSummary;

    /// Probe the host's WASM ABI version. 0 / 1 → v1 only; ≥ 2 → can use
    /// the `credman_v2` credential-set surface. Default returns 0 so test
    /// mocks exercise the v1 path unless they opt in.
    fn get_wasm_version(&self) -> u32 { 0 }

    // --- v1 (legacy single-entry surface) ---

    fn add_string_id_entry(
        &mut self,
        cred_id: &CStr,
        icon: Option<&[u8]>,
        title: Option<&CStr>,
        subtitle: Option<&CStr>,
        disclaimer: Option<&CStr>,
        warning: Option<&CStr>,
    );

    fn add_field(&mut self, cred_id: &CStr, name: &CStr, value: Option<&CStr>);

    // --- v2 (credential-set surface) ---

    fn add_entry_set(&mut self, _set_id: &CStr, _length: i32) {}

    #[allow(clippy::too_many_arguments)]
    fn add_entry_to_set(
        &mut self,
        _cred_id: &CStr,
        _icon: Option<&[u8]>,
        _title: Option<&CStr>,
        _subtitle: Option<&CStr>,
        _disclaimer: Option<&CStr>,
        _warning: Option<&CStr>,
        _metadata: Option<&CStr>,
        _set_id: &CStr,
        _set_index: i32,
    ) {}

    fn add_field_to_entry_set(
        &mut self,
        _cred_id: &CStr,
        _name: &CStr,
        _value: Option<&CStr>,
        _set_id: &CStr,
        _set_index: i32,
    ) {}
}

/// CallingAppInfo decoded into Rust strings. The raw [u8; 256] / [u8; 512]
/// fields are inconvenient; this is what the matcher logic actually wants.
#[derive(Debug, Default, Clone)]
pub struct CallingAppInfoSummary {
    pub package_name: String,
    pub origin: String,
}

/// Real host-backed implementation. Used when the matcher runs inside the
/// Credential Manager WASM sandbox.
pub struct CredmanApiImpl;

impl CredmanApi for CredmanApiImpl {
    fn get_request_buffer(&self) -> Vec<u8> {
        let mut size: u32 = 0;
        unsafe { GetRequestSize(&mut size); }
        let mut buf = vec![0u8; size as usize];
        if size > 0 {
            unsafe { GetRequestBuffer(buf.as_mut_ptr() as *mut c_void); }
        }
        buf
    }

    fn get_registered_data(&self) -> Vec<u8> {
        let mut size: u32 = 0;
        unsafe { GetCredentialsSize(&mut size); }
        let mut buf = vec![0u8; size as usize];
        if size > 0 {
            let _ = unsafe {
                ReadCredentialsBuffer(buf.as_mut_ptr() as *mut c_void, 0, size as usize)
            };
        }
        buf
    }

    fn get_calling_app_info(&self) -> CallingAppInfoSummary {
        let mut info = CallingAppInfo {
            package_name: [0u8; 256],
            origin: [0u8; 512],
        };
        unsafe { GetCallingAppInfo(&mut info as *mut CallingAppInfo); }
        CallingAppInfoSummary {
            package_name: cstr_array_to_string(&info.package_name),
            origin: cstr_array_to_string(&info.origin),
        }
    }

    fn get_wasm_version(&self) -> u32 {
        let mut v: u32 = 0;
        unsafe { GetWasmVersion(&mut v); }
        v
    }

    fn add_string_id_entry(
        &mut self,
        cred_id: &CStr,
        icon: Option<&[u8]>,
        title: Option<&CStr>,
        subtitle: Option<&CStr>,
        disclaimer: Option<&CStr>,
        warning: Option<&CStr>,
    ) {
        let icon_ptr = icon.map_or(core::ptr::null::<c_char>(), |x| x.as_ptr() as *const c_char);
        let icon_len = icon.map_or(0usize, |x| x.len());
        unsafe {
            bindings::AddStringIdEntry(
                cred_id.as_ptr(),
                icon_ptr,
                icon_len,
                title.map_or(core::ptr::null(), |x| x.as_ptr()),
                subtitle.map_or(core::ptr::null(), |x| x.as_ptr()),
                disclaimer.map_or(core::ptr::null(), |x| x.as_ptr()),
                warning.map_or(core::ptr::null(), |x| x.as_ptr()),
            );
        }
    }

    fn add_field(&mut self, cred_id: &CStr, name: &CStr, value: Option<&CStr>) {
        unsafe {
            bindings::AddFieldForStringIdEntry(
                cred_id.as_ptr(),
                name.as_ptr(),
                value.map_or(core::ptr::null(), |x| x.as_ptr()),
            );
        }
    }

    fn add_entry_set(&mut self, set_id: &CStr, length: i32) {
        unsafe { bindings::AddEntrySet(set_id.as_ptr(), length); }
    }

    fn add_entry_to_set(
        &mut self,
        cred_id: &CStr,
        icon: Option<&[u8]>,
        title: Option<&CStr>,
        subtitle: Option<&CStr>,
        disclaimer: Option<&CStr>,
        warning: Option<&CStr>,
        metadata: Option<&CStr>,
        set_id: &CStr,
        set_index: i32,
    ) {
        let icon_ptr = icon.map_or(core::ptr::null::<c_char>(), |x| x.as_ptr() as *const c_char);
        let icon_len = icon.map_or(0usize, |x| x.len());
        unsafe {
            bindings::AddEntryToSet(
                cred_id.as_ptr(),
                icon_ptr,
                icon_len,
                title.map_or(core::ptr::null(), |x| x.as_ptr()),
                subtitle.map_or(core::ptr::null(), |x| x.as_ptr()),
                disclaimer.map_or(core::ptr::null(), |x| x.as_ptr()),
                warning.map_or(core::ptr::null(), |x| x.as_ptr()),
                metadata.map_or(core::ptr::null(), |x| x.as_ptr()),
                set_id.as_ptr(),
                set_index,
            );
        }
    }

    fn add_field_to_entry_set(
        &mut self,
        cred_id: &CStr,
        name: &CStr,
        value: Option<&CStr>,
        set_id: &CStr,
        set_index: i32,
    ) {
        unsafe {
            bindings::AddFieldToEntrySet(
                cred_id.as_ptr(),
                name.as_ptr(),
                value.map_or(core::ptr::null(), |x| x.as_ptr()),
                set_id.as_ptr(),
                set_index,
            );
        }
    }
}

fn cstr_array_to_string(buf: &[u8]) -> String {
    let len = buf.iter().position(|b| *b == 0).unwrap_or(buf.len());
    String::from_utf8_lossy(&buf[..len]).into_owned()
}
