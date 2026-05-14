import SwiftUI

// MARK: - Upload toast body
//
// A floating capsule that mirrors the Upload Live Activity while the app is
// foreground (iOS suppresses an app's own LA in the Dynamic Island while the
// app is active — so an in-app overlay is the only way to give immediate
// feedback for users who stay in the app during the upload).
//
// Visual: leading status icon · label text · trailing progress ring or
// terminal-state checkmark/exclamation. iOS 26 uses native liquid glass
// (`.glassEffect`); older systems fall back to a translucent black capsule.

internal struct UploadToastBody: View {
  let state: UploadToastState

  private var accent: Color {
    Color(red: 0x30/255, green: 0x6E/255, blue: 0x6F/255)
  }

  private var iconName: String {
    switch state.status {
    case "compressing": return "wand.and.stars"
    case "success":     return "checkmark.circle.fill"
    case "error":       return "exclamationmark.circle.fill"
    default:            return "arrow.up.circle.fill"
    }
  }

  private var iconColor: Color {
    switch state.status {
    case "success": return .green
    case "error":   return .red
    default:        return accent
    }
  }

  // iOS 26 glass capsule adapts to the system appearance (light/dark) — use
  // `.primary` so the label tracks the same. Fallback path always renders a
  // dark translucent capsule, so the label stays white.
  private var labelColor: Color {
    if #available(iOS 26.0, *) {
      return .primary
    } else {
      return .white
    }
  }

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: iconName)
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(iconColor)

      Text(state.label.isEmpty ? "Uploading…" : state.label)
        .font(.system(size: 14, weight: .medium))
        .foregroundColor(labelColor)
        .lineLimit(1)
        .truncationMode(.tail)

      // Trailing slot: progress ring while in-flight, terminal icon otherwise
      if state.status == "uploading" || state.status == "compressing" {
        UploadToastRing(progress: state.progress, color: accent)
          .frame(width: 18, height: 18)
      }
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 9)
    .modifier(UploadToastCapsuleBackground())
    .frame(maxWidth: .infinity, alignment: .center)
    .padding(.horizontal, 24)
    .allowsHitTesting(false) // never block taps under the toast
  }
}

// MARK: - Ring (static, no spinner)

private struct UploadToastRing: View {
  let progress: Double
  let color: Color

  var body: some View {
    let clamped = max(0, min(1, progress))
    ZStack {
      Circle()
        .stroke(Color.white.opacity(0.25), lineWidth: 2.5)
      Circle()
        .trim(from: 0, to: clamped)
        .stroke(color, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
        .rotationEffect(.degrees(-90))
    }
  }
}

// MARK: - Capsule background (iOS 26 liquid glass + fallback)
//
// Same dual-gating pattern used by ImageViewer overlay buttons and
// glass-effect-union module — see CLAUDE_WORK_PATTERNS.md §6.

private struct UploadToastCapsuleBackground: ViewModifier {
  @ViewBuilder
  func body(content: Content) -> some View {
    if #available(iOS 26.0, *) {
#if compiler(>=6.2)
      content.glassEffect(.regular, in: Capsule())
#else
      content.background(Capsule().fill(Color.black.opacity(0.7)))
#endif
    } else {
      content.background(Capsule().fill(Color.black.opacity(0.7)))
    }
  }
}
