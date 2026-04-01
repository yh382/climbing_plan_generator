import WidgetKit
import Foundation

// MARK: - Data model (matches WidgetData in widgetBridge.ts)

struct ClimMateData {
  let weekClimbDays: Int
  let weekSends: Int
  let streak: Int
  let lastSessionGym: String
  let lastSessionDate: String
  let lastSessionBest: String
  let lastSessionDuration: String
  let hasActiveSession: Bool

  static let empty = ClimMateData(
    weekClimbDays: 0, weekSends: 0, streak: 0,
    lastSessionGym: "", lastSessionDate: "", lastSessionBest: "",
    lastSessionDuration: "", hasActiveSession: false
  )

  init(weekClimbDays: Int, weekSends: Int, streak: Int,
       lastSessionGym: String, lastSessionDate: String,
       lastSessionBest: String, lastSessionDuration: String,
       hasActiveSession: Bool) {
    self.weekClimbDays = weekClimbDays
    self.weekSends = weekSends
    self.streak = streak
    self.lastSessionGym = lastSessionGym
    self.lastSessionDate = lastSessionDate
    self.lastSessionBest = lastSessionBest
    self.lastSessionDuration = lastSessionDuration
    self.hasActiveSession = hasActiveSession
  }

  init(from dict: [String: Any]) {
    self.weekClimbDays = dict["weekClimbDays"] as? Int ?? 0
    self.weekSends = dict["weekSends"] as? Int ?? 0
    self.streak = dict["streak"] as? Int ?? 0
    self.lastSessionGym = dict["lastSessionGym"] as? String ?? ""
    self.lastSessionDate = dict["lastSessionDate"] as? String ?? ""
    self.lastSessionBest = dict["lastSessionBest"] as? String ?? ""
    self.lastSessionDuration = dict["lastSessionDuration"] as? String ?? ""
    self.hasActiveSession = dict["hasActiveSession"] as? Bool ?? false
  }
}

// MARK: - Timeline Entry

struct ClimMateTimelineEntry: TimelineEntry {
  let date: Date
  let data: ClimMateData
  let isPlaceholder: Bool

  static func placeholder() -> ClimMateTimelineEntry {
    ClimMateTimelineEntry(
      date: Date(),
      data: ClimMateData(
        weekClimbDays: 3, weekSends: 15, streak: 5,
        lastSessionGym: "Beta Bloc", lastSessionDate: "2024-03-20",
        lastSessionBest: "V5", lastSessionDuration: "1h 30m",
        hasActiveSession: false
      ),
      isPlaceholder: true
    )
  }
}

// MARK: - Timeline Provider

struct ClimMateTimelineProvider: TimelineProvider {
  typealias Entry = ClimMateTimelineEntry

  private var groupIdentifier: String {
    Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String
      ?? "group.com.yh382.climmate"
  }

  func placeholder(in context: Context) -> ClimMateTimelineEntry {
    .placeholder()
  }

  func getSnapshot(in context: Context, completion: @escaping (ClimMateTimelineEntry) -> Void) {
    if context.isPreview {
      completion(.placeholder())
      return
    }
    completion(readLatestEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ClimMateTimelineEntry>) -> Void) {
    let entry = readLatestEntry()
    let timeline = Timeline(entries: [entry], policy: .atEnd)
    completion(timeline)
  }

  // Read data from shared UserDefaults (same key expo-widgets writes to)
  private func readLatestEntry() -> ClimMateTimelineEntry {
    guard let defaults = UserDefaults(suiteName: groupIdentifier),
          let timeline = defaults.array(forKey: "__expo_widgets_ClimMateWidget_timeline") as? [[String: Any]],
          let latest = timeline.last,
          let props = latest["props"] as? [String: Any] else {
      return ClimMateTimelineEntry(date: Date(), data: .empty, isPlaceholder: false)
    }

    let timestamp = latest["timestamp"] as? Double ?? Date().timeIntervalSince1970 * 1000
    let date = Date(timeIntervalSince1970: timestamp / 1000)
    return ClimMateTimelineEntry(date: date, data: ClimMateData(from: props), isPlaceholder: false)
  }
}
