import SwiftUI
import WidgetKit
import ActivityKit

// MARK: - Live Activity for an active climbing session
//
// Information hierarchy (decided in Window T plan):
//   🥇 Timer (live, native auto-tick — no JS update needed)
//   🥈 routes (breadth)
//   🥉 sends + best grade (achievement)
//   4️⃣ attempts (effort/depth — only on Lock Screen banner)
//
// Each surface is space-budgeted differently:
//   - Minimal DI:    icon only (1-glyph identity marker)
//   - Compact DI:    icon leading + auto-format timer trailing
//   - Expanded DI:   discipline icon/label + best grade + (timer + routes·sends)
//   - Lock Screen:   meta row + big timer + 2x2 stats grid + End Session button
//
// Timer rendering uses SwiftUI's native `Text(timerInterval:...)` so it
// auto-ticks without requiring JS to update the activity every second.
@available(iOS 16.2, *)
struct ClimbingSessionLiveActivity: Widget {
  let kind = "ClimbingSession"   // must match createLiveActivity("ClimbingSession", ...)

  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ClimbingSessionAttributes.self) { context in
      // Lock Screen / Notification Center banner
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
        // Identity marker — keep minimal so the pill stays as narrow as
        // possible (comparable to Apple Music's compact DI width).
        Image(systemName: "figure.climbing")
          .font(.system(size: 12))
          .foregroundColor(accent)
      } compactTrailing: {
        // Green dot — "session active" indicator. Keeps the pill as narrow
        // as possible (like Apple Music). Detailed stats are available via
        // long-press (Expanded DI) or the Lock Screen banner.
        Circle()
          .fill(Color.green)
          .frame(width: 8, height: 8)
      } minimal: {
        // Multi-LA scenario — just identity, no data
        Image(systemName: "figure.climbing")
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

  // MARK: - Helpers

  /// Convert epoch ms (passed from JS) to a Swift `Date`.
  static func startDate(_ epochMs: Double) -> Date {
    Date(timeIntervalSince1970: epochMs / 1000)
  }

  /// Render a live h:mm:ss timer that always shows hours.
  /// Used in surfaces with ample space (Expanded DI bottom, Lock Screen).
  @ViewBuilder
  private func fixedTimer(start: Date, size: CGFloat, weight: Font.Weight) -> some View {
    Text(timerInterval: start...Date.distantFuture,
         pauseTime: nil,
         countsDown: false,
         showsHours: true)
      .font(.system(size: size, weight: weight))
      .monospacedDigit()
      .foregroundColor(accent)
  }

  /// Display a grade with a fallback dash for empty/initial state.
  private func gradeDisplay(_ grade: String) -> String {
    grade.isEmpty ? "—" : grade
  }

  // MARK: - Lock Screen Banner
  //
  // Compact 3-row layout designed to fit within the iOS Lock Screen LA
  // height budget (which previously clipped our 4-row version). The End
  // button is a circular stop icon on the right side of the timer row,
  // parallel with the timer, rather than a full-width bottom bar.

  @ViewBuilder
  private func lockScreenBanner(context: ActivityViewContext<ClimbingSessionAttributes>) -> some View {
    let state = context.state
    let start = Self.startDate(state.startTime)

    VStack(alignment: .leading, spacing: 10) {
      // Row 1: meta — gym name · discipline
      Text("\(state.gymName) · \(state.discipline)")
        .font(.system(size: 13, weight: .medium))
        .foregroundColor(secondaryText)
        .lineLimit(1)

      // Row 2: live timer (left) + circular End button (right)
      HStack {
        HStack(spacing: 6) {
          Image(systemName: "timer")
            .font(.system(size: 18, weight: .semibold))
            .foregroundColor(accent)
          fixedTimer(start: start, size: 26, weight: .bold)
        }
        Spacer()
        // Circular End button — opens app via deep link, shows confirmation
        Link(destination: URL(string: "climMate://end-session")!) {
          Image(systemName: "stop.fill")
            .font(.system(size: 14))
            .foregroundColor(.white)
            .frame(width: 36, height: 36)
            .background(Circle().fill(Color.red.opacity(0.85)))
        }
      }

      // Row 3: stats — compact one-line with icon-only labels
      HStack(spacing: 16) {
        statCell(icon: "figure.climbing", value: "\(state.routeCount)", label: "routes")
        statCell(icon: "checkmark.circle.fill", value: "\(state.sendCount)", label: "sends")
        statCell(icon: "arrow.triangle.2.circlepath", value: "\(state.attempts)", label: "att")
        statCell(icon: "trophy.fill", value: gradeDisplay(state.bestGrade), label: nil)
      }
    }
    .padding(12)
  }

  /// One cell in the Lock Screen stats row: icon + number + optional short label.
  @ViewBuilder
  private func statCell(icon: String, value: String, label: String?) -> some View {
    HStack(spacing: 4) {
      Image(systemName: icon)
        .font(.system(size: 11, weight: .semibold))
        .foregroundColor(accent)
      Text(value)
        .font(.system(size: 13, weight: .semibold))
        .foregroundColor(.primary)
      if let label = label {
        Text(label)
          .font(.system(size: 11))
          .foregroundColor(secondaryText)
      }
    }
  }

  // MARK: - Dynamic Island Expanded

  @ViewBuilder
  private func expandedLeading(context: ActivityViewContext<ClimbingSessionAttributes>) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Image(systemName: "figure.climbing")
        .font(.system(size: 18, weight: .semibold))
        .foregroundColor(accent)
      Text(context.state.discipline)
        .font(.system(size: 11))
        .foregroundColor(secondaryText)
    }
    .padding(.leading, 8)
  }

  @ViewBuilder
  private func expandedTrailing(context: ActivityViewContext<ClimbingSessionAttributes>) -> some View {
    VStack(alignment: .trailing, spacing: 2) {
      Text(gradeDisplay(context.state.bestGrade))
        .font(.system(size: 22, weight: .bold))
        .foregroundColor(accent)
      Text("best")
        .font(.system(size: 10))
        .foregroundColor(secondaryText)
    }
    .padding(.trailing, 8)
  }

  @ViewBuilder
  private func expandedBottom(context: ActivityViewContext<ClimbingSessionAttributes>) -> some View {
    let state = context.state
    let start = Self.startDate(state.startTime)

    HStack {
      // Live timer on the left (h:mm:ss fixed)
      fixedTimer(start: start, size: 18, weight: .semibold)
      Spacer()
      // routes · sends on the right
      Text("\(state.routeCount) routes · \(state.sendCount) sends")
        .font(.system(size: 13, weight: .medium))
        .foregroundColor(secondaryText)
    }
    .padding(.horizontal, 12)
    .padding(.bottom, 6)
  }
}
