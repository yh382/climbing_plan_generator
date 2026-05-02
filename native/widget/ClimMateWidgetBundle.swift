import WidgetKit
import SwiftUI

@main
struct ClimMateWidgetBundle: WidgetBundle {
  // Each Live Activity gets its OWN `if #available` block. Stacking multiple
  // widgets inside a single `if` branch makes `@WidgetBundleBuilder` silently
  // drop all but the first — symptom: `liveactivitiesd` logs "Received an
  // update for an activity with no subscribers" because the second activity's
  // `ActivityConfiguration` was never registered with the system.
  var body: some Widget {
    ClimMateStaticWidget()
    if #available(iOS 16.2, *) {
      ClimbingSessionLiveActivity()
    }
    if #available(iOS 16.2, *) {
      UploadLiveActivity()
    }
  }
}
