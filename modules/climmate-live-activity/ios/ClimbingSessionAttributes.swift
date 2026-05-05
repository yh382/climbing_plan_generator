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

    // B2: when true, timer renders gray + "Paused" chip + yellow dot.
    // Optional w/ default decoder so an old-style activity (started before B2)
    // gracefully renders as active during the rare crossover.
    var paused: Bool = false

    enum CodingKeys: String, CodingKey {
      case gymName, discipline, startTime, routeCount, sendCount, bestGrade, attempts, paused
    }

    init(gymName: String, discipline: String, startTime: Double, routeCount: Int, sendCount: Int, bestGrade: String, attempts: Int, paused: Bool = false) {
      self.gymName = gymName
      self.discipline = discipline
      self.startTime = startTime
      self.routeCount = routeCount
      self.sendCount = sendCount
      self.bestGrade = bestGrade
      self.attempts = attempts
      self.paused = paused
    }

    init(from decoder: Decoder) throws {
      let c = try decoder.container(keyedBy: CodingKeys.self)
      self.gymName = try c.decode(String.self, forKey: .gymName)
      self.discipline = try c.decode(String.self, forKey: .discipline)
      self.startTime = try c.decode(Double.self, forKey: .startTime)
      self.routeCount = try c.decode(Int.self, forKey: .routeCount)
      self.sendCount = try c.decode(Int.self, forKey: .sendCount)
      self.bestGrade = try c.decode(String.self, forKey: .bestGrade)
      self.attempts = try c.decode(Int.self, forKey: .attempts)
      self.paused = try c.decodeIfPresent(Bool.self, forKey: .paused) ?? false
    }
  }

  // Static data (set at start, never changes) — empty, all data is in ContentState
}
