import SwiftUI
import ExpoModulesCore

// MARK: - ExpoView host

class ActivityRingView: ExpoView {
    private let hostingController: UIHostingController<AnyView>

    @objc var progress: Double = 0          { didSet { updateView() } }
    @objc var color: String = "#306E6F"     { didSet { updateView() } }
    @objc var bgTrackColor: String = "rgba(0,0,0,0.08)" { didSet { updateView() } }
    @objc var thickness: Double = 12        { didSet { updateView() } }

    public required init(appContext: AppContext? = nil) {
        hostingController = UIHostingController(rootView: AnyView(EmptyView()))
        super.init(appContext: appContext)
        addSubview(hostingController.view)
        hostingController.view.backgroundColor = .clear
        updateView()
    }

    private func updateView() {
        hostingController.rootView = AnyView(
            ActivityRingSwiftUI(
                progress: progress,
                color: Color(hex: sanitizeHex(color)),
                bgTrackColor: Color(hex: sanitizeHex(bgTrackColor)),
                thickness: thickness
            )
        )
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        hostingController.view.frame = bounds
    }
}

// MARK: - Helpers

/// `Color(hex:)` only accepts hex; callers occasionally pass rgba(...) (e.g.
/// the RN default `rgba(0,0,0,0.08)` for bg track). Convert / fall back so
/// non-hex strings don't crash the parser silently.
private func sanitizeHex(_ raw: String) -> String {
    let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.hasPrefix("#") || trimmed.count == 6 || trimmed.count == 8 {
        return trimmed
    }
    // rgba(R,G,B,A) → "#RRGGBB" (drop alpha — module doesn't render alpha)
    if trimmed.lowercased().hasPrefix("rgba") || trimmed.lowercased().hasPrefix("rgb") {
        let nums = trimmed
            .replacingOccurrences(of: "rgba(", with: "")
            .replacingOccurrences(of: "rgb(", with: "")
            .replacingOccurrences(of: ")", with: "")
            .split(separator: ",")
            .compactMap { Int($0.trimmingCharacters(in: .whitespaces)) }
        if nums.count >= 3 {
            return String(format: "#%02X%02X%02X", nums[0], nums[1], nums[2])
        }
    }
    return "#000000"
}

// MARK: - SwiftUI body

struct ActivityRingSwiftUI: View {
    let progress: Double            // 0..N (overshoot OK)
    let color: Color                // base color (gradient endpoints derived)
    let bgTrackColor: Color
    let thickness: Double

    private static let HEAD_DARKEN = 0.08
    private static let TAIL_LIGHTEN = 0.12
    private static let GRADIENT_MIN_PROGRESS = 0.15
    private static let BASE_SEGMENTS = 80
    private static let MIN_SEGMENTS = 64

    var body: some View {
        let colorStart = color.darken(Self.HEAD_DARKEN)
        let colorEnd   = color.lighten(Self.TAIL_LIGHTEN)

        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            let cx = side / 2
            let cy = side / 2
            let r  = (side - thickness) / 2

            ZStack {
                // strokeBorder (not stroke) so the bg track's stroke stays
                // inside the frame — matches the inset radius used by
                // Path.addArc below. Without this the bg sits 6.5pt past
                // the colored arc.
                Circle()
                    .strokeBorder(bgTrackColor, lineWidth: thickness)

                if progress > 0 {
                    let hasOverlap = progress > 1
                    if hasOverlap {
                        let tFirstEnd = 1.0 / progress
                        let firstSegs = max(Self.MIN_SEGMENTS,
                            Int(Double(Self.BASE_SEGMENTS) * tFirstEnd * progress))
                        GradientArc(cx: cx, cy: cy, r: r, thickness: thickness,
                                    startAngle: 0, endAngle: 2 * .pi - 0.001,
                                    tStart: 0, tEnd: tFirstEnd,
                                    colorStart: colorStart, colorEnd: colorEnd,
                                    segments: firstSegs)

                        let frac = progress.truncatingRemainder(dividingBy: 1)
                        let overlapAngle = (frac == 0) ? 2 * .pi : frac * 2 * .pi
                        TipShadow(cx: cx, cy: cy, r: r, angle: overlapAngle,
                                  thickness: thickness)

                        let overlapSegs = max(24,
                            Int(Double(Self.BASE_SEGMENTS) * (1 - tFirstEnd) * progress))
                        GradientArc(cx: cx, cy: cy, r: r, thickness: thickness,
                                    startAngle: 0, endAngle: overlapAngle,
                                    tStart: tFirstEnd, tEnd: 1,
                                    colorStart: colorStart, colorEnd: colorEnd,
                                    segments: overlapSegs)
                    } else if progress < Self.GRADIENT_MIN_PROGRESS {
                        let totalAngle = progress * 2 * .pi
                        Path { p in
                            p.addArc(center: CGPoint(x: cx, y: cy), radius: r,
                                     startAngle: .radians(-(.pi / 2)),
                                     endAngle: .radians(totalAngle - .pi / 2),
                                     clockwise: false)
                        }
                        .stroke(color, style: StrokeStyle(lineWidth: thickness,
                                                          lineCap: .round))
                    } else {
                        let totalAngle = progress * 2 * .pi
                        let segs = max(Self.MIN_SEGMENTS,
                            Int(Double(Self.BASE_SEGMENTS) * progress))
                        GradientArc(cx: cx, cy: cy, r: r, thickness: thickness,
                                    startAngle: 0, endAngle: totalAngle,
                                    tStart: 0, tEnd: 1,
                                    colorStart: colorStart, colorEnd: colorEnd,
                                    segments: segs)
                    }
                }
            }
            .animation(.spring(response: 0.6, dampingFraction: 0.8), value: progress)
        }
    }
}

/// Draw an arc as N segment paths each with a single interpolated color —
/// SwiftUI equivalent of the SVG <GradientArc> in ActivityRing.tsx. Avoids
/// AngularGradient because it doesn't align cleanly with `lineCap: .round`
/// on `Circle.trim`.
struct GradientArc: View {
    let cx: Double
    let cy: Double
    let r: Double
    let thickness: Double
    let startAngle: Double          // radians, 0 = 12 o'clock
    let endAngle: Double
    let tStart: Double              // gradient param at startAngle
    let tEnd: Double                // gradient param at endAngle
    let colorStart: Color
    let colorEnd: Color
    let segments: Int

    var body: some View {
        let sweep = endAngle - startAngle
        if sweep <= 0 {
            EmptyView()
        } else {
            let segSweep = sweep / Double(segments)
            let extra = segSweep * 0.15  // small overdraw to hide seams
            ForEach(0..<segments, id: \.self) { i in
                let localT = Double(i) / Double(segments)
                let globalT = tStart + (tEnd - tStart) * localT
                let sa = startAngle + Double(i) * segSweep
                let ea = min(sa + segSweep + extra, endAngle + extra * 0.5)
                Path { p in
                    p.addArc(center: CGPoint(x: cx, y: cy), radius: r,
                             startAngle: .radians(sa - .pi / 2),
                             endAngle:   .radians(ea - .pi / 2),
                             clockwise: false)
                }
                .stroke(Color.lerp(colorStart, colorEnd, globalT),
                        style: StrokeStyle(lineWidth: thickness, lineCap: .round))
            }
        }
    }
}

/// Soft black circle drawn at the tip position when progress > 1, simulating
/// the depth where the new ring head lands on top of the first loop. Matches
/// the RN tipPos + shadowDx/Dy math from ActivityRing.tsx.
struct TipShadow: View {
    let cx: Double
    let cy: Double
    let r: Double
    let angle: Double               // radians, 0 = 12 o'clock
    let thickness: Double

    var body: some View {
        // Tip position uses the math-convention angle (a = θ - π/2 to put 0
        // at 12 o'clock), but the shadow offset is along the *tangent*,
        // opposite to the clockwise motion at the tip — that needs the raw
        // 12-o'clock-zero angle (RN's `overlapAngle`), not the shifted one.
        // -cos(θ), -sin(θ) gives a vector tangent to the circle pointing
        // backward in the clockwise sense.
        let a = angle - .pi / 2
        let tipX = cx + r * cos(a)
        let tipY = cy + r * sin(a)
        let dx = -cos(angle) * (thickness * 0.32)
        let dy = -sin(angle) * (thickness * 0.32)
        Circle()
            .fill(Color.black.opacity(0.32))
            .frame(width: thickness, height: thickness)
            .position(x: tipX + dx, y: tipY + dy)
    }
}
