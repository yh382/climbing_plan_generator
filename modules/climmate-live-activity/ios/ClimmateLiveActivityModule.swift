import ExpoModulesCore
import ActivityKit

public class ClimmateLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClimmateLiveActivity")

    AsyncFunction("start") { (gymName: String, discipline: String, startTime: Double) -> String? in
      guard #available(iOS 16.2, *) else {
        print("[ClimmateLiveActivity] iOS < 16.2, skipping start")
        return nil
      }

      // End any lingering activities first (defensive)
      for existing in Activity<ClimbingSessionAttributes>.activities {
        await existing.end(nil, dismissalPolicy: .immediate)
      }

      let state = ClimbingSessionAttributes.ContentState(
        gymName: gymName,
        discipline: discipline,
        startTime: startTime,
        routeCount: 0,
        sendCount: 0,
        bestGrade: "",
        attempts: 0
      )

      do {
        let activity = try Activity.request(
          attributes: ClimbingSessionAttributes(),
          content: .init(state: state, staleDate: Date().addingTimeInterval(8 * 3600)),
          pushType: nil
        )
        print("[ClimmateLiveActivity] started activity id=\(activity.id)")
        return activity.id
      } catch {
        print("[ClimmateLiveActivity] start failed: \(error)")
        return nil
      }
    }

    // B2: `paused` arg drives the paused render path in
    // ClimbingSessionLiveActivity.swift — JS calls update with paused=true
    // immediately when pauseSession() is invoked, paused=false on resume.
    // Pass-through stat args (routeCount/sendCount/etc) — when JS only wants
    // to flip paused (e.g. pauseSession's stub call), it sends 0/"" and we
    // preserve the existing values from oldState so the UI doesn't blank out.
    AsyncFunction("update") { (routeCount: Int, sendCount: Int, bestGrade: String, attempts: Int, paused: Bool) -> Void in
      guard #available(iOS 16.2, *) else { return }

      for activity in Activity<ClimbingSessionAttributes>.activities {
        let oldState = activity.content.state
        // If caller passed all-zeros + empty grade, treat as a "paused-only"
        // update and keep existing stats. Otherwise overwrite with new stats.
        let isStatsOnlyToggle = (routeCount == 0 && sendCount == 0 && bestGrade.isEmpty && attempts == 0)
        let newState = ClimbingSessionAttributes.ContentState(
          gymName: oldState.gymName,
          discipline: oldState.discipline,
          startTime: oldState.startTime,
          routeCount: isStatsOnlyToggle ? oldState.routeCount : routeCount,
          sendCount: isStatsOnlyToggle ? oldState.sendCount : sendCount,
          bestGrade: isStatsOnlyToggle ? oldState.bestGrade : bestGrade,
          attempts: isStatsOnlyToggle ? oldState.attempts : attempts,
          paused: paused
        )
        await activity.update(.init(state: newState, staleDate: Date().addingTimeInterval(8 * 3600)))
      }
    }

    AsyncFunction("end") { (routeCount: Int, sendCount: Int, bestGrade: String, attempts: Int) -> Void in
      guard #available(iOS 16.2, *) else { return }

      for activity in Activity<ClimbingSessionAttributes>.activities {
        let oldState = activity.content.state
        let finalState = ClimbingSessionAttributes.ContentState(
          gymName: oldState.gymName,
          discipline: oldState.discipline,
          startTime: oldState.startTime,
          routeCount: routeCount,
          sendCount: sendCount,
          bestGrade: bestGrade,
          attempts: attempts,
          paused: false
        )
        await activity.end(.init(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
      }
    }

    AsyncFunction("endAll") { () -> Void in
      guard #available(iOS 16.2, *) else { return }
      for activity in Activity<ClimbingSessionAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}
