import WidgetKit
import SwiftUI

struct ClimMateStaticWidget: Widget {
  // Must match the name used in createWidget("ClimMateWidget", ...) on the RN side
  let kind: String = "ClimMateWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(
      kind: kind,
      provider: ClimMateTimelineProvider()
    ) { entry in
      if #available(iOS 17.0, *) {
        ClimMateWidgetView(entry: entry)
          .containerBackground(.fill.tertiary, for: .widget)
      } else {
        ClimMateWidgetView(entry: entry)
          .padding()
          .background()
      }
    }
    .configurationDisplayName("ClimMate Stats")
    .description("Your climbing stats at a glance")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
