import ExpoModulesCore
import ActivityKit

public class ClimmateUploadActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClimmateUploadActivity")

    AsyncFunction("start") { (label: String) -> Void in
      guard #available(iOS 16.2, *) else {
        print("[ClimmateUploadActivity] iOS < 16.2, skipping start")
        return
      }
      // MVP: only one upload activity at a time. New uploads supersede old ones.
      // Multiple concurrent activities require attribute-level upload IDs and
      // id-keyed lookup in update/end (logged in roadmap as future work).
      for existing in Activity<UploadAttributes>.activities {
        await existing.end(nil, dismissalPolicy: .immediate)
      }

      let state = UploadAttributes.ContentState(
        label: label,
        progress: 0,
        status: "uploading"
      )
      do {
        _ = try Activity.request(
          attributes: UploadAttributes(),
          content: .init(state: state, staleDate: Date().addingTimeInterval(15 * 60)),
          pushType: nil
        )
      } catch {
        print("[ClimmateUploadActivity] start failed: \(error)")
      }
    }

    AsyncFunction("update") { (progress: Double, status: String) -> Void in
      guard #available(iOS 16.2, *) else { return }
      for activity in Activity<UploadAttributes>.activities {
        let oldState = activity.content.state
        let newState = UploadAttributes.ContentState(
          label: oldState.label,
          progress: progress,
          status: status
        )
        await activity.update(.init(
          state: newState,
          staleDate: Date().addingTimeInterval(15 * 60)
        ))
      }
    }

    AsyncFunction("end") { (finalStatus: String) -> Void in
      guard #available(iOS 16.2, *) else { return }
      for activity in Activity<UploadAttributes>.activities {
        let oldState = activity.content.state
        let finalState = UploadAttributes.ContentState(
          label: oldState.label,
          progress: finalStatus == "success" ? 1.0 : oldState.progress,
          status: finalStatus
        )
        // Show terminal state briefly then dismiss
        await activity.end(
          .init(state: finalState, staleDate: nil),
          dismissalPolicy: .after(Date().addingTimeInterval(1.5))
        )
      }
    }

    AsyncFunction("endAll") { () -> Void in
      guard #available(iOS 16.2, *) else { return }
      for activity in Activity<UploadAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}
