import WidgetKit
import SwiftUI

@main
struct ClimMateWidgetBundle: WidgetBundle {
  var body: some Widget {
    ClimMateStaticWidget()
    if #available(iOS 16.2, *) {
      ClimbingSessionLiveActivity()
    }
  }
}
