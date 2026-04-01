import ActivityKit
import Foundation

// MARK: - ActivityAttributes (matches ClimbingSessionProps in ClimbingSession.tsx)

struct ClimbingSessionAttributes: ActivityAttributes {
  // ContentState = dynamic data (updated on each JS update() call)
  public struct ContentState: Codable, Hashable {
    var gymName: String
    var discipline: String
    var startTime: Double       // epoch ms
    var routeCount: Int
    var sendCount: Int
    var bestGrade: String
  }

  // Static data (set at start, never changes) — empty, all data is in ContentState
}
