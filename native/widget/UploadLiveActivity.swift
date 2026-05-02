import SwiftUI
import WidgetKit
import ActivityKit

// MARK: - Live Activity for media uploads
//
// Surface budget (compact-first design, similar to Apple Music):
//   - Compact DI:    primary surface — left icon + right circular progress
//   - Minimal DI:    just a status icon when stacked behind another LA
//   - Expanded DI:   long-press detail — label + percent + linear progress
//   - Lock Screen:   simple 1-row banner (icon + label + bar + %)
//
// State drives one of four statuses ("compressing"/"uploading"/"success"/"error")
// which the widget maps to icons and tint colors.
//
// NOTE: iOS by design does NOT show a compact Dynamic Island for an app's own
// Live Activity while that app is foreground active — it would be redundant
// with the app UI itself. The LA appears the moment the user backgrounds the
// app or locks the device. That is system policy, not a bug.

@available(iOS 16.2, *)
struct UploadLiveActivity: Widget {
  let kind = "Upload"

  var body: some WidgetConfiguration {
    ActivityConfiguration(for: UploadAttributes.self) { context in
      lockScreenBanner(context: context)
    } dynamicIsland: { context in
      DynamicIsland {
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
        compactLeadingView(context: context)
      } compactTrailing: {
        compactTrailingView(context: context)
      } minimal: {
        minimalView(context: context)
      }
    }
  }

  // MARK: - Colors

  private var accent: Color {
    Color(red: 0x30/255, green: 0x6E/255, blue: 0x6F/255)
  }

  private func iconForStatus(_ status: String) -> String {
    switch status {
    case "compressing": return "wand.and.stars"
    case "success":     return "checkmark.circle.fill"
    case "error":       return "exclamationmark.circle.fill"
    default:            return "arrow.up.circle.fill"
    }
  }

  private func colorForStatus(_ status: String) -> Color {
    switch status {
    case "success": return .green
    case "error":   return .red
    default:        return accent
    }
  }

  // MARK: - Compact DI (primary surface)

  @ViewBuilder
  private func compactLeadingView(
    context: ActivityViewContext<UploadAttributes>
  ) -> some View {
    Image(systemName: iconForStatus(context.state.status))
      .font(.system(size: 14, weight: .medium))
      .foregroundColor(colorForStatus(context.state.status))
  }

  @ViewBuilder
  private func compactTrailingView(
    context: ActivityViewContext<UploadAttributes>
  ) -> some View {
    let state = context.state
    if state.status == "success" {
      Image(systemName: "checkmark.circle.fill")
        .font(.system(size: 14))
        .foregroundColor(.green)
    } else if state.status == "error" {
      Image(systemName: "exclamationmark.circle.fill")
        .font(.system(size: 14))
        .foregroundColor(.red)
    } else {
      // Hand-drawn ring; SwiftUI's `.progressViewStyle(.circular)` on iOS is
      // an indeterminate spinner regardless of `value:total:`.
      ProgressRing(progress: state.progress, color: accent)
        .frame(width: 16, height: 16)
    }
  }

  // MARK: - Minimal DI (multi-LA stacked state)

  @ViewBuilder
  private func minimalView(
    context: ActivityViewContext<UploadAttributes>
  ) -> some View {
    Image(systemName: iconForStatus(context.state.status))
      .foregroundColor(colorForStatus(context.state.status))
  }

  // MARK: - Expanded DI (long-press detail)

  @ViewBuilder
  private func expandedLeading(
    context: ActivityViewContext<UploadAttributes>
  ) -> some View {
    Image(systemName: iconForStatus(context.state.status))
      .font(.system(size: 22, weight: .semibold))
      .foregroundColor(colorForStatus(context.state.status))
      .padding(.leading, 8)
  }

  @ViewBuilder
  private func expandedTrailing(
    context: ActivityViewContext<UploadAttributes>
  ) -> some View {
    Text("\(Int(context.state.progress * 100))%")
      .font(.system(size: 18, weight: .bold))
      .monospacedDigit()
      .foregroundColor(accent)
      .padding(.trailing, 8)
  }

  @ViewBuilder
  private func expandedBottom(
    context: ActivityViewContext<UploadAttributes>
  ) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(context.state.label)
        .font(.system(size: 13, weight: .medium))
        .foregroundColor(.secondary)
        .lineLimit(1)
      ProgressView(value: context.state.progress, total: 1.0)
        .tint(accent)
    }
    .padding(.horizontal, 12)
    .padding(.bottom, 6)
  }

  // MARK: - Lock Screen Banner

  @ViewBuilder
  private func lockScreenBanner(
    context: ActivityViewContext<UploadAttributes>
  ) -> some View {
    HStack(spacing: 10) {
      Image(systemName: iconForStatus(context.state.status))
        .font(.system(size: 18))
        .foregroundColor(colorForStatus(context.state.status))
      VStack(alignment: .leading, spacing: 4) {
        Text(context.state.label)
          .font(.system(size: 14, weight: .medium))
          .lineLimit(1)
        ProgressView(value: context.state.progress, total: 1.0)
          .tint(accent)
      }
      Text("\(Int(context.state.progress * 100))%")
        .font(.system(size: 13, weight: .semibold))
        .monospacedDigit()
        .foregroundColor(.secondary)
    }
    .padding(12)
  }
}

// MARK: - ProgressRing
//
// Static stroked ring. Pure shape — no `.animation(...)` declared, no
// indeterminate ProgressView. The system animates content state transitions
// for us when we re-render with a new `progress`.

@available(iOS 16.2, *)
private struct ProgressRing: View {
  let progress: Double
  let color: Color

  var body: some View {
    let clamped = max(0, min(1, progress))
    ZStack {
      Circle()
        .stroke(Color.white.opacity(0.2), lineWidth: 2.5)
      Circle()
        .trim(from: 0, to: clamped)
        .stroke(color, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
        .rotationEffect(.degrees(-90))
    }
  }
}
