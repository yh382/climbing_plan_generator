import SwiftUI
import WidgetKit
import ActivityKit

@available(iOS 16.2, *)
struct ClimbingSessionLiveActivity: Widget {
  let kind = "ClimbingSession"   // must match createLiveActivity("ClimbingSession", ...)

  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ClimbingSessionAttributes.self) { context in
      // Lock Screen banner
      lockScreenBanner(context: context)
    } dynamicIsland: { context in
      DynamicIsland {
        // Expanded regions
        DynamicIslandExpandedRegion(.leading) {
          expandedLeading(context: context)
        }
        DynamicIslandExpandedRegion(.trailing) {
          expandedTrailing(context: context)
        }
        DynamicIslandExpandedRegion(.bottom) {
          expandedBottom(context: context)
        }
      } compactLeading: {
        Text("\(context.state.routeCount)")
          .font(.system(size: 14, weight: .bold))
          .foregroundColor(accent)
      } compactTrailing: {
        Text(context.state.bestGrade.isEmpty ? "-" : context.state.bestGrade)
          .font(.system(size: 14, weight: .medium))
      } minimal: {
        Text("\(context.state.routeCount)")
          .font(.system(size: 14, weight: .bold))
          .foregroundColor(accent)
      }
    }
  }

  // MARK: - Colors
  private var accent: Color {
    Color(red: 0x30/255, green: 0x6E/255, blue: 0x6F/255)
  }
  private var secondaryText: Color {
    Color(red: 0x8E/255, green: 0x8E/255, blue: 0x93/255)
  }

  // MARK: - Lock Screen Banner
  @ViewBuilder
  private func lockScreenBanner(context: ActivityViewContext<ClimbingSessionAttributes>) -> some View {
    HStack {
      VStack(alignment: .leading, spacing: 4) {
        Text(context.state.gymName)
          .font(.system(size: 16, weight: .bold))
        Text(context.state.discipline)
          .font(.system(size: 12))
          .foregroundColor(secondaryText)
      }
      Spacer()
      VStack(alignment: .trailing, spacing: 2) {
        Text("\(context.state.routeCount)")
          .font(.system(size: 24, weight: .bold))
          .foregroundColor(accent)
        Text("routes")
          .font(.system(size: 10))
          .foregroundColor(secondaryText)
      }
    }
    .padding(12)
  }

  // MARK: - Dynamic Island Expanded
  @ViewBuilder
  private func expandedLeading(context: ActivityViewContext<ClimbingSessionAttributes>) -> some View {
    VStack(spacing: 4) {
      Image(systemName: "figure.climbing")
        .foregroundColor(accent)
      Text(context.state.discipline)
        .font(.system(size: 10))
    }
    .padding(8)
  }

  @ViewBuilder
  private func expandedTrailing(context: ActivityViewContext<ClimbingSessionAttributes>) -> some View {
    VStack(spacing: 2) {
      Text(context.state.bestGrade.isEmpty ? "-" : context.state.bestGrade)
        .font(.system(size: 20, weight: .bold))
      Text("best")
        .font(.system(size: 10))
    }
    .padding(8)
  }

  @ViewBuilder
  private func expandedBottom(context: ActivityViewContext<ClimbingSessionAttributes>) -> some View {
    HStack {
      Text(context.state.gymName)
        .font(.system(size: 12))
      Spacer()
      Text("\(context.state.sendCount) sends \u{00B7} \(context.state.routeCount) routes")
        .font(.system(size: 12))
    }
    .padding(.horizontal, 12)
    .padding(.bottom, 8)
  }
}
