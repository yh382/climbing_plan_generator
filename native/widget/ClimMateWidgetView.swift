import SwiftUI
import WidgetKit

struct ClimMateWidgetView: View {
  let entry: ClimMateTimelineEntry
  @Environment(\.widgetFamily) var family

  private let accent = Color(red: 0x30/255, green: 0x6E/255, blue: 0x6F/255)
  private let secondaryText = Color(red: 0x8E/255, green: 0x8E/255, blue: 0x93/255)
  private let activeRed = Color(red: 0xFF/255, green: 0x3B/255, blue: 0x30/255)

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        smallWidget
      case .systemMedium:
        mediumWidget
      default:
        smallWidget
      }
    }
  }

  // MARK: - systemSmall

  private var smallWidget: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("\(entry.data.streak)")
        .font(.system(size: 32, weight: .bold))
        .foregroundColor(accent)
      Text("day streak")
        .font(.system(size: 12))
        .foregroundColor(secondaryText)

      Spacer()

      HStack {
        VStack(alignment: .leading) {
          Text("\(entry.data.monthClimbDays)")
            .font(.system(size: 16, weight: .semibold))
          Text("days")
            .font(.system(size: 10))
            .foregroundColor(secondaryText)
        }
        Spacer()
        VStack(alignment: .trailing) {
          Text("\(entry.data.monthSends)")
            .font(.system(size: 16, weight: .semibold))
          Text("sends")
            .font(.system(size: 10))
            .foregroundColor(secondaryText)
        }
      }

      if entry.data.hasActiveSession {
        Text("Session Active")
          .font(.system(size: 10, weight: .bold))
          .foregroundColor(activeRed)
      }
    }
    .padding(12)
  }

  // MARK: - systemMedium

  private var mediumWidget: some View {
    HStack(alignment: .top, spacing: 0) {
      // Left: streak + monthly stats
      VStack(alignment: .leading, spacing: 4) {
        Text("\(entry.data.streak)")
          .font(.system(size: 36, weight: .bold))
          .foregroundColor(accent)
        Text("day streak")
          .font(.system(size: 12))
          .foregroundColor(secondaryText)

        Spacer()

        Text("\(entry.data.monthClimbDays) days \u{00B7} \(entry.data.monthSends) sends")
          .font(.system(size: 14, weight: .semibold))
        Text("this month")
          .font(.system(size: 11))
          .foregroundColor(secondaryText)
      }
      .frame(maxWidth: 120, alignment: .leading)

      Spacer()

      // Right: last session
      VStack(alignment: .leading, spacing: 4) {
        Text("Last Session")
          .font(.system(size: 12, weight: .medium))
          .foregroundColor(secondaryText)
        Text(entry.data.lastSessionGym.isEmpty ? "No sessions yet" : entry.data.lastSessionGym)
          .font(.system(size: 14, weight: .semibold))
          .lineLimit(1)

        if !entry.data.lastSessionBest.isEmpty {
          Text(entry.data.lastSessionBest)
            .font(.system(size: 20, weight: .bold))
            .foregroundColor(accent)
          Text(entry.data.lastSessionDuration)
            .font(.system(size: 11))
            .foregroundColor(secondaryText)
        }
      }
    }
    .padding(12)
  }
}
