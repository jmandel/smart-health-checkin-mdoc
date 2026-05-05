// SPDX-License-Identifier: MIT
import XCTest
@testable import SmartHealthCheckinModel

final class JSONStrictTests: XCTestCase {
    func testRoundTripsObject() throws {
        let src = #"{"a":1,"b":"x","c":[true,false,null,3.5],"d":{"e":2}}"#
        let v = try JSONStrictParser.parse(src)
        let out = JSONStrictWriter.encodeString(v)
        // Member order is preserved.
        XCTAssertTrue(out.contains("\"a\":1"))
        XCTAssertTrue(out.contains("\"d\":{\"e\":2}"))
        // Round-trip stable.
        let v2 = try JSONStrictParser.parse(out)
        XCTAssertEqual(v, v2)
    }

    func testRejectsDuplicateMembers() throws {
        XCTAssertThrowsError(try JSONStrictParser.parse(#"{"a":1,"a":2}"#)) { e in
            guard let je = e as? JSONStrictError, case .duplicateMember(let name, _) = je else {
                return XCTFail("expected duplicateMember, got \(e)")
            }
            XCTAssertEqual(name, "a")
        }
    }

    func testRejectsTrailingData() {
        XCTAssertThrowsError(try JSONStrictParser.parse(#"{"a":1}{}"#))
    }

    func testRejectsTopLevelNonObjectWhenRequired() {
        XCTAssertThrowsError(try JSONStrictParser.parseObject(Data("[]".utf8)))
    }

    func testHandlesUnicodeAndSurrogates() throws {
        // 𝄞 — musical G clef, U+1D11E, surrogate pair \uD834\uDD1E
        let v = try JSONStrictParser.parse(#""\uD834\uDD1E""#)
        XCTAssertEqual(v, .string("\u{1D11E}"))
    }

    func testRejectsInvalidEscape() {
        XCTAssertThrowsError(try JSONStrictParser.parse(#""\q""#))
    }
}

final class RequestModelTests: XCTestCase {
    func testParsesAndRoundTripsCanonicalRequest() throws {
        let json = #"""
        {
          "type": "smart-health-checkin-request",
          "version": "1",
          "id": "demo-1",
          "purpose": "Clinic check-in",
          "fhirVersions": ["4.0.1"],
          "items": [
            {
              "id": "patient",
              "title": "Patient demographics",
              "required": true,
              "content": {
                "kind": "selection.fhir",
                "profiles": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]
              },
              "accept": ["application/fhir+json"]
            },
            {
              "id": "intake",
              "title": "Intake",
              "content": {
                "kind": "form.fhir",
                "questionnaire": {
                  "resourceType": "Questionnaire",
                  "title": "Intake"
                }
              },
              "accept": ["application/fhir+json"]
            }
          ]
        }
        """#
        let req = try SmartHealthCheckinRequest.parse(json)
        XCTAssertEqual(req.id, "demo-1")
        XCTAssertEqual(req.items.count, 2)
        XCTAssertEqual(req.items[0].id, "patient")
        if case .selectionFhir(let s) = req.items[0].content {
            XCTAssertEqual(s.profiles?.first, "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient")
        } else { XCTFail("expected selection.fhir") }
        if case .formFhir(let f) = req.items[1].content {
            XCTAssertNotNil(f.questionnaire)
        } else { XCTFail("expected form.fhir") }

        let out = req.toJSONString()
        let req2 = try SmartHealthCheckinRequest.parse(out)
        XCTAssertEqual(req, req2)
    }

    func testRejectsConflictingSelectorMembers() {
        let json = #"{"type":"smart-health-checkin-request","version":"1","id":"x","items":[{"id":"a","title":"A","content":{"kind":"selection.fhir","questionnaire":{}},"accept":["application/fhir+json"]}]}"#
        XCTAssertThrowsError(try SmartHealthCheckinRequest.parse(json))
    }

    func testValidationFlagsDuplicateItemIds() throws {
        let req = SmartHealthCheckinRequest(
            id: "r1",
            items: [
                .init(id: "a", title: "A", content: .selectionFhir(.init()), accept: ["application/fhir+json"]),
                .init(id: "a", title: "B", content: .selectionFhir(.init()), accept: ["application/fhir+json"])
            ]
        )
        let report = SmartHealthCheckinValidator.validate(request: req)
        XCTAssertTrue(report.hasErrors)
        XCTAssertTrue(report.errors.contains { $0.message.contains("duplicate item id") })
    }
}

final class ResponseModelTests: XCTestCase {
    func testParsesFhirAndShcArtifacts() throws {
        let json = #"""
        {
          "type":"smart-health-checkin-response",
          "version":"1",
          "requestId":"r-1",
          "artifacts":[
            {
              "id":"a1",
              "mediaType":"application/fhir+json",
              "fhirVersion":"4.0.1",
              "fulfills":["x"],
              "value":{"resourceType":"Patient"}
            },
            {
              "id":"a2",
              "mediaType":"application/smart-health-card",
              "fulfills":["y"],
              "value":{"verifiableCredential":["shc:/567"]}
            }
          ],
          "requestStatus":[
            {"item":"x","status":"fulfilled"},
            {"item":"y","status":"partial","message":"only labs"}
          ]
        }
        """#
        let resp = try SmartHealthCheckinResponse.parse(json)
        XCTAssertEqual(resp.artifacts.count, 2)
        XCTAssertEqual(resp.artifacts[0].mediaType, "application/fhir+json")
        XCTAssertEqual(resp.artifacts[1].fulfills, ["y"])
        XCTAssertEqual(resp.requestStatus[1].status, .partial)

        let s = resp.toJSONString()
        XCTAssertEqual(try SmartHealthCheckinResponse.parse(s), resp)
    }

    func testShcArtifactRejectsOuterFhirVersion() {
        let json = #"""
        {"type":"smart-health-checkin-response","version":"1","requestId":"r-1","artifacts":[
          {"id":"a","mediaType":"application/smart-health-card","fhirVersion":"4.0.1","fulfills":["x"],"value":{"verifiableCredential":["shc:/1"]}}
        ],"requestStatus":[{"item":"x","status":"fulfilled"}]}
        """#
        XCTAssertThrowsError(try SmartHealthCheckinResponse.parse(json))
    }
}

final class CrossValidationTests: XCTestCase {
    func makeRequest() -> SmartHealthCheckinRequest {
        SmartHealthCheckinRequest(
            id: "demo-1",
            items: [
                .init(id: "patient", title: "Patient demographics",
                      content: .selectionFhir(.init(profilesFrom: ["http://hl7.org/fhir/us/core"])),
                      accept: ["application/fhir+json"]),
                .init(id: "intake", title: "Intake",
                      content: .formFhir(.init(questionnaireCanonical: "https://example.org/Q/intake|1")),
                      accept: ["application/fhir+json"]),
                .init(id: "summary", title: "Summary",
                      content: .selectionFhir(.init(profilesFrom: ["http://hl7.org/fhir/us/core"])),
                      accept: ["application/fhir+json", "application/smart-health-card"])
            ]
        )
    }

    func testHappyPath() {
        let req = makeRequest()
        let resp = SmartHealthCheckinResponse(
            requestId: "demo-1",
            artifacts: [
                .fhirJson(.init(id: "art-1", fulfills: ["patient"], fhirVersion: "4.0.1",
                                value: .object([("resourceType", .string("Patient"))]))),
                .smartHealthCard(.init(id: "art-2", fulfills: ["summary"], verifiableCredentials: ["shc:/567"]))
            ],
            requestStatus: [
                .init(item: "patient", status: .fulfilled),
                .init(item: "intake", status: .declined),
                .init(item: "summary", status: .fulfilled)
            ]
        )
        let r = SmartHealthCheckinValidator.crossValidate(request: req, response: resp)
        XCTAssertFalse(r.hasErrors, "got: \(r)")
    }

    func testRejectsRequestIdMismatch() {
        let req = makeRequest()
        let resp = SmartHealthCheckinResponse(
            requestId: "WRONG", artifacts: [],
            requestStatus: req.items.map { .init(item: $0.id, status: .declined) }
        )
        let r = SmartHealthCheckinValidator.crossValidate(request: req, response: resp)
        XCTAssertTrue(r.errors.contains { $0.path == "$.requestId" })
    }

    func testRejectsArtifactMediaTypeNotInAccept() {
        let req = makeRequest()
        let resp = SmartHealthCheckinResponse(
            requestId: "demo-1",
            artifacts: [
                // patient does not accept smart-health-card
                .smartHealthCard(.init(id: "a", fulfills: ["patient"], verifiableCredentials: ["shc:/x"]))
            ],
            requestStatus: req.items.map { .init(item: $0.id, status: .declined) }
        )
        let r = SmartHealthCheckinValidator.crossValidate(request: req, response: resp)
        XCTAssertTrue(r.errors.contains { $0.message.contains("not in accept[]") })
    }

    func testRejectsMissingStatusEntry() {
        let req = makeRequest()
        let resp = SmartHealthCheckinResponse(
            requestId: "demo-1", artifacts: [],
            requestStatus: [ .init(item: "patient", status: .declined) ] // missing intake + summary
        )
        let r = SmartHealthCheckinValidator.crossValidate(request: req, response: resp)
        XCTAssertEqual(r.errors.filter { $0.path == "$.requestStatus" }.count, 2)
    }

    func testRejectsDuplicateStatusEntry() {
        let req = makeRequest()
        let resp = SmartHealthCheckinResponse(
            requestId: "demo-1", artifacts: [],
            requestStatus: [
                .init(item: "patient", status: .declined),
                .init(item: "patient", status: .fulfilled),
                .init(item: "intake", status: .declined),
                .init(item: "summary", status: .declined)
            ]
        )
        let r = SmartHealthCheckinValidator.crossValidate(request: req, response: resp)
        XCTAssertTrue(r.errors.contains { $0.message.contains("duplicate status entry") })
    }

    func testFulfillsMustReferenceRealItem() {
        let req = makeRequest()
        let resp = SmartHealthCheckinResponse(
            requestId: "demo-1",
            artifacts: [.fhirJson(.init(id: "x", fulfills: ["does-not-exist"], fhirVersion: "4.0.1",
                                        value: .object([("resourceType", .string("Patient"))])))],
            requestStatus: req.items.map { .init(item: $0.id, status: .declined) }
        )
        let r = SmartHealthCheckinValidator.crossValidate(request: req, response: resp)
        XCTAssertTrue(r.errors.contains { $0.message.contains("no request item with id") })
    }
}
