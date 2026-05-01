//! Run the matcher with real fixture inputs and assert the eligibility
//! decision + emitted entry. This is the most important regression net for
//! the matcher — it covers both:
//!
//! - the synthetic SMART Check-in request the verifier should produce, and
//! - the captured Mattr Safari mDL request, which uses the same
//!   `org-iso-mdoc` protocol but a different doctype.

use std::ffi::CStr;
use std::fs;
use std::path::PathBuf;

use shc_matcher::credman::{CallingAppInfoSummary, CredmanApi};
use shc_matcher::MatchOutcome;

fn fixture(name: &str) -> Vec<u8> {
    let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    p.push("fixtures");
    p.push(name);
    fs::read(&p).unwrap_or_else(|e| panic!("read {:?}: {}", p, e))
}

fn project_fixture(path: &[&str]) -> Vec<u8> {
    let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    p.push("..");
    for segment in path {
        p.push(segment);
    }
    fs::read(&p).unwrap_or_else(|e| panic!("read {:?}: {}", p, e))
}

#[derive(Default)]
struct Recorder {
    request: Vec<u8>,
    credentials: Vec<u8>,
    entries: Vec<(String, Option<String>, Option<String>)>,
}

impl CredmanApi for Recorder {
    fn get_request_buffer(&self) -> Vec<u8> { self.request.clone() }
    fn get_registered_data(&self) -> Vec<u8> { self.credentials.clone() }
    fn get_calling_app_info(&self) -> CallingAppInfoSummary { CallingAppInfoSummary::default() }
    fn add_string_id_entry(
        &mut self,
        cred_id: &CStr,
        _icon: Option<&[u8]>,
        title: Option<&CStr>,
        subtitle: Option<&CStr>,
        _disclaimer: Option<&CStr>,
        _warning: Option<&CStr>,
    ) {
        self.entries.push((
            cred_id.to_string_lossy().into_owned(),
            title.map(|s| s.to_string_lossy().into_owned()),
            subtitle.map(|s| s.to_string_lossy().into_owned()),
        ));
    }
    fn add_field(&mut self, _: &CStr, _: &CStr, _: Option<&CStr>) {}
}

#[test]
fn matches_smart_checkin_request_and_emits_entry() {
    let mut api = Recorder {
        request: fixture("smart-checkin-request.json"),
        credentials: fixture("credentials-blob.json"),
        entries: Vec::new(),
    };
    let outcome = shc_matcher::run(&mut api);
    assert_eq!(outcome, MatchOutcome::Eligible);
    assert_eq!(api.entries.len(), 1);
    let (id, title, subtitle) = &api.entries[0];
    assert_eq!(id, "checkin-default");
    assert_eq!(title.as_deref(), Some("SMART Health Check-in"));
    assert_eq!(subtitle.as_deref(), Some("Choose what health information to share"));
}

#[test]
fn matches_shared_ts_smart_checkin_fixture() {
    let mut api = Recorder {
        request: project_fixture(&["fixtures", "dcapi-requests", "ts-smart-checkin-basic", "request.json"]),
        credentials: fixture("credentials-blob.json"),
        entries: Vec::new(),
    };
    let outcome = shc_matcher::run(&mut api);
    assert_eq!(outcome, MatchOutcome::Eligible);
    assert_eq!(api.entries.len(), 1);
}

#[test]
fn matches_escaped_request_json_wrapper() {
    let request_json = String::from_utf8(
        project_fixture(&["fixtures", "dcapi-requests", "ts-smart-checkin-basic", "request.json"]),
    )
    .expect("fixture is utf-8 JSON");
    let escaped = request_json.replace('\\', "\\\\").replace('"', "\\\"");
    let mut api = Recorder {
        request: format!(r#"{{"requestJson":"{}"}}"#, escaped).into_bytes(),
        credentials: fixture("credentials-blob.json"),
        entries: Vec::new(),
    };
    let outcome = shc_matcher::run(&mut api);
    assert_eq!(outcome, MatchOutcome::Eligible);
    assert_eq!(api.entries.len(), 1);
}

#[test]
fn rejects_mattr_safari_mdl_request() {
    // Real captured Safari-UA Mattr request asking for org.iso.18013.5.1.mDL.
    // The matcher must NOT emit an entry — wrong doctype.
    let mut api = Recorder {
        request: fixture("mattr-safari-mdl-request.json"),
        credentials: fixture("credentials-blob.json"),
        entries: Vec::new(),
    };
    let outcome = shc_matcher::run(&mut api);
    assert_eq!(outcome, MatchOutcome::NotApplicable);
    assert!(api.entries.is_empty());
}

#[test]
fn rejects_request_with_wrong_protocol() {
    // openid4vp wrapper around an empty payload. The AndroidX registry path
    // doesn't pre-filter matchers by protocol (it forwards an empty
    // `protocolTypes` list to GMS), so OUR matcher will be invoked for
    // openid4vp requests too — and must self-filter. This is the test that
    // proves we do.
    let request = br#"{"requests":[{"protocol":"openid4vp","data":{}}]}"#.to_vec();
    let mut api = Recorder {
        request,
        credentials: fixture("credentials-blob.json"),
        entries: Vec::new(),
    };
    let outcome = shc_matcher::run(&mut api);
    assert_eq!(outcome, MatchOutcome::NotApplicable);
    assert!(api.entries.is_empty());
}

#[test]
fn malformed_device_request_base64_does_not_match() {
    let request = br#"{"requests":[{"protocol":"org-iso-mdoc","data":{"deviceRequest":"%%%not-base64%%%"}}]}"#.to_vec();
    let mut api = Recorder {
        request,
        credentials: fixture("credentials-blob.json"),
        entries: Vec::new(),
    };
    let outcome = shc_matcher::run(&mut api);
    assert_eq!(outcome, MatchOutcome::NotApplicable);
    assert!(api.entries.is_empty());
}

#[test]
fn empty_credentials_blob_falls_back_to_compiled_defaults() {
    let mut api = Recorder {
        request: fixture("smart-checkin-request.json"),
        credentials: Vec::new(),
        entries: Vec::new(),
    };
    shc_matcher::run(&mut api);
    let (id, title, _subtitle) = &api.entries[0];
    assert_eq!(id, "checkin-default");
    assert_eq!(title.as_deref(), Some("SMART Health Check-in"));
}
