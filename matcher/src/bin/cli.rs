//! Native test harness for the SMART Check-in matcher.
//!
//! Runs the matcher with on-disk fixture inputs and prints the entries it
//! would emit, instead of calling out to a real `credman` host. Build with:
//!
//!   cargo build --release --bin checkin-cli --features cli
//!
//! Usage:
//!
//!   checkin-cli <request.json> <credentials.json>
//!
//! Example:
//!
//!   checkin-cli fixtures/smart-checkin-request.json fixtures/credentials-blob.json

use std::env;
use std::ffi::CStr;
use std::fs;
use std::process;

use shc_matcher::credman::{CallingAppInfoSummary, CredmanApi};

struct FixtureApi {
    request: Vec<u8>,
    credentials: Vec<u8>,
    entries: Vec<EmittedEntry>,
}

#[derive(Debug)]
struct EmittedEntry {
    id: String,
    title: Option<String>,
    subtitle: Option<String>,
    fields: Vec<(String, Option<String>)>,
}

impl CredmanApi for FixtureApi {
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
        self.entries.push(EmittedEntry {
            id: cstr_to_string(cred_id),
            title: title.map(cstr_to_string),
            subtitle: subtitle.map(cstr_to_string),
            fields: Vec::new(),
        });
    }
    fn add_field(&mut self, cred_id: &CStr, name: &CStr, value: Option<&CStr>) {
        let id = cstr_to_string(cred_id);
        if let Some(entry) = self.entries.iter_mut().rev().find(|e| e.id == id) {
            entry.fields.push((cstr_to_string(name), value.map(cstr_to_string)));
        }
    }
}

fn cstr_to_string(s: &CStr) -> String {
    s.to_string_lossy().into_owned()
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 3 {
        eprintln!("usage: {} <request.json> <credentials.json>", args[0]);
        process::exit(2);
    }
    let request = fs::read(&args[1]).expect("read request");
    let credentials = fs::read(&args[2]).expect("read credentials");
    let mut api = FixtureApi { request, credentials, entries: Vec::new() };
    let outcome = shc_matcher::run(&mut api);
    println!("outcome: {:?}", outcome);
    println!("entries emitted: {}", api.entries.len());
    for (i, e) in api.entries.iter().enumerate() {
        println!("  [{}] id={} title={:?} subtitle={:?}", i, e.id, e.title, e.subtitle);
        for (name, value) in &e.fields {
            println!("       field {}={:?}", name, value);
        }
    }
}
