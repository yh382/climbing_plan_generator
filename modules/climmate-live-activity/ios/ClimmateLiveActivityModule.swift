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
          content: .init(state: state, staleDate: nil),
          pushType: nil
        )
        print("[ClimmateLiveActivity] started activity id=\(activity.id)")
        return activity.id
      } catch {
        print("[ClimmateLiveActivity] start failed: \(error)")
        return nil
      }
    }

    AsyncFunction("update") { (routeCount: Int, sendCount: Int, bestGrade: String, attempts: Int) -> Void in
      guard #available(iOS 16.2, *) else { return }

      for activity in Activity<ClimbingSessionAttributes>.activities {
        let oldState = activity.content.state
        let newState = ClimbingSessionAttributes.ContentState(
          gymName: oldState.gymName,
          discipline: oldState.discipline,
          startTime: oldState.startTime,
          routeCount: routeCount,
          sendCount: sendCount,
          bestGrade: bestGrade,
          attempts: attempts
        )
        await activity.update(.init(state: newState, staleDate: nil))
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
          attempts: attempts
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
