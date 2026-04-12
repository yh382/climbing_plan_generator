import ActivityKit
import Foundation

// MARK: - ActivityAttributes for climbing session Live Activity.
//
// This file is the SINGLE SOURCE OF TRUTH for the attributes struct.
// It is compiled into the main app target via the ClimmateLiveActivity pod
// (autolinked by `use_expo_modules!`), and it is ALSO copied into
// ios/ExpoWidgetsTarget/ClimbingSessionAttributes.swift by the
// `withCustomWidgetFiles` config plugin so the widget extension target can
// register `ActivityConfiguration(for: ClimbingSessionAttributes.self)`.
//
// At runtime, iOS ActivityKit matches these two compiled copies by type
// name + Codable structure, so both targets must keep the struct identical.

struct ClimbingSessionAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var gymName: String
    var discipline: String
    var startTime: Double       // epoch ms
    var routeCount: Int         // distinct routes logged (breadth)
    var sendCount: Int          // successful sends (flash/onsight/redpoint)
    var bestGrade: String
    var attempts: Int           // sum of item.attemptsTotal across all routes (depth/effort)
  }

  // Static data (set at start, never changes) — empty, all data is in ContentState
}
