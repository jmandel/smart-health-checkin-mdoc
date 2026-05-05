// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SmartHealthCheckin",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
        .macCatalyst(.v17),
        .tvOS(.v17),
        .watchOS(.v10),
        .visionOS(.v1)
    ],
    products: [
        .library(name: "SmartHealthCheckin", targets: ["SmartHealthCheckin"]),
        .library(name: "SmartHealthCheckinModel", targets: ["SmartHealthCheckinModel"]),
        .library(name: "SmartHealthCheckinCBOR", targets: ["SmartHealthCheckinCBOR"]),
        .library(name: "SmartHealthCheckinMdoc", targets: ["SmartHealthCheckinMdoc"]),
    ],
    dependencies: [
        // swift-crypto re-exports CryptoKit on Apple platforms; provides HPKE, P256,
        // HKDF, AES-GCM, SHA-256 on Linux too so the test suite is portable.
        .package(url: "https://github.com/apple/swift-crypto.git", from: "3.7.0"),
        // swift-certificates lets us pull the P-256 public key out of an
        // x5chain leaf certificate without hand-rolling DER parsing.
        .package(url: "https://github.com/apple/swift-certificates.git", from: "1.5.0"),
    ],
    targets: [
        .target(
            name: "SmartHealthCheckinModel",
            path: "Sources/SmartHealthCheckinModel"
        ),
        .target(
            name: "SmartHealthCheckinCBOR",
            path: "Sources/SmartHealthCheckinCBOR"
        ),
        .target(
            name: "SmartHealthCheckinMdoc",
            dependencies: [
                "SmartHealthCheckinCBOR",
                .product(name: "Crypto", package: "swift-crypto"),
                .product(name: "_CryptoExtras", package: "swift-crypto"),
                .product(name: "X509", package: "swift-certificates"),
            ],
            path: "Sources/SmartHealthCheckinMdoc"
        ),
        .target(
            name: "SmartHealthCheckin",
            dependencies: [
                "SmartHealthCheckinModel",
                "SmartHealthCheckinCBOR",
                "SmartHealthCheckinMdoc",
            ],
            path: "Sources/SmartHealthCheckin"
        ),
        .testTarget(
            name: "SmartHealthCheckinModelTests",
            dependencies: ["SmartHealthCheckinModel"],
            path: "Tests/SmartHealthCheckinModelTests"
        ),
        .testTarget(
            name: "SmartHealthCheckinCBORTests",
            dependencies: ["SmartHealthCheckinCBOR"],
            path: "Tests/SmartHealthCheckinCBORTests"
        ),
        .testTarget(
            name: "SmartHealthCheckinMdocTests",
            dependencies: ["SmartHealthCheckinMdoc"],
            path: "Tests/SmartHealthCheckinMdocTests"
        ),
        .testTarget(
            name: "SmartHealthCheckinTests",
            dependencies: ["SmartHealthCheckin"],
            path: "Tests/SmartHealthCheckinTests",
            resources: [.copy("Fixtures")]
        ),
    ]
)
