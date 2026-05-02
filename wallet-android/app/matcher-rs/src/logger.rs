//! Tiny logger init. Off by default; flip the `logging` Cargo feature to
//! enable structured stderr output during native tests.

#[cfg(feature = "logging")]
pub fn init() {
    // Keep this dependency-free for now. Real `log` impl can be added later.
    // The matcher must not depend on a clock or filesystem at runtime.
}

#[cfg(not(feature = "logging"))]
#[inline(always)]
pub fn init() {}
