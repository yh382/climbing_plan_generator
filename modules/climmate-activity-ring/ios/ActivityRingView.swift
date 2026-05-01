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

    // Circle().trim(to:) is natively Animatable — angle interpolates smoothly
    // each frame. Earlier impl used N segment Paths which `.animation` collapses
    // into a "fade segments in" effect (whole ring appears at once) instead of
    // the canonical Apple Fitness "sweep" feel.
    @State private var displayedProgress: Double = 0

    var body: some View {
        let colorStart = color.darken(Self.HEAD_DARKEN)
        let colorEnd   = color.lighten(Self.TAIL_LIGHTEN)

        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            let r  = (side - thickness) / 2

            ZStack {
                Circle()
                    .strokeBorder(bgTrackColor, lineWidth: thickness)

                // First lap. STATIC AngularGradient covering the full 360°.
                // Earlier we tried dynamic endAngle to make the head land on
                // colorEnd, but the lineCap.round at the trim's tip extends a
                // few degrees past the gradient's end during animation —
                // SwiftUI's behavior outside the gradient range causes the cap
                // to render colorStart (dark) at angles past endAngle, giving
                // a "head turns dark" flash near 12 o'clock as the first lap
                // closes. Static 360° gradient keeps the cap inside the range
                // at all times. Trade-off: head shows mid-gradient color
                // mid-animation rather than always colorEnd, which is also
                // how Apple Fitness behaves.
                RingArcShape(progress: displayedProgress, lapStart: 0, thickness: thickness)
                    .stroke(
                        AngularGradient(
                            colors: [colorStart, colorEnd],
                            center: .center,
                            startAngle: .degrees(-90),
                            endAngle: .degrees(270)
                        ),
                        style: StrokeStyle(lineWidth: thickness, lineCap: .round)
                    )

                // Start cover at 12 o'clock — hides the first lap's lineCap
                // bleed (gradient extends to colorStart behind the start cap).
                // Always shown when progress > 0 so the bleed never flashes
                // during animation. When the overlap arc is present, it sits
                // ABOVE this cover in the ZStack and covers it with its own
                // colorEnd-gradient start — no visual conflict.
                Circle()
                    .fill(colorStart)
                    .frame(width: thickness, height: thickness)
                    .offset(y: -r)
                    .opacity(progress > 0 ? 1 : 0)

                // Overlap second lap. Gradient colors continue the first lap's
                // flow: starts at colorEnd (= first lap's tail color at 12
                // o'clock) and ends at an even lighter shade for the head.
                // This avoids a visible color break at the 12 o'clock seam.
                let overlapVisible = overlapAngle(of: displayedProgress)
                let colorOverlapHead = colorEnd.lighten(0.10)
                RingArcShape(progress: displayedProgress, lapStart: 1, thickness: thickness)
                    .stroke(
                        AngularGradient(
                            colors: [colorEnd, colorOverlapHead],
                            center: .center,
                            startAngle: .degrees(-90),
                            endAngle: .degrees(-90 + max(90, overlapVisible * 360))
                        ),
                        style: StrokeStyle(lineWidth: thickness, lineCap: .round)
                    )
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 1.1)) {
                displayedProgress = progress
            }
        }
        .onChange(of: progress) { newValue in
            withAnimation(.easeOut(duration: 0.8)) {
                displayedProgress = newValue
            }
        }
    }

    /// Visible angular extent (in turns, 0..1) of the overlap lap given total
    /// progress. Used to position the floating head cap.
    private func overlapAngle(of p: Double) -> Double {
        guard p > 1 else { return 0 }
        let frac = p.truncatingRemainder(dividingBy: 1)
        return frac == 0 ? 1.0 : frac
    }
}

// MARK: - RingArcShape

/// One lap of an Apple Fitness-style ring. `progress` is 0..N where each
/// 1.0 is one full revolution. `lapStart` selects which lap this shape
/// renders: 0 for the first lap (visible while progress 0..1), 1 for the
/// overlap (visible while progress 1..2). Both laps share a single
/// `progress` value so SwiftUI animates them as one continuous head moving
/// around the ring instead of two parallel sweeps.
struct RingArcShape: Shape {
    var progress: Double
    let lapStart: Double
    let thickness: Double

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let lapProgress = max(0, min(progress - lapStart, 1))
        guard lapProgress > 0 else { return Path() }

        let side = min(rect.width, rect.height)
        let center = CGPoint(x: rect.midX, y: rect.midY)
        // Inset by half stroke so the resulting stroked arc stays inside the
        // frame and lines up with the bg `strokeBorder`.
        let radius = side / 2 - thickness / 2

        let startAngle = -Double.pi / 2          // 12 o'clock
        let endAngle = startAngle + lapProgress * 2 * .pi
        var path = Path()
        path.addArc(
            center: center,
            radius: radius,
            startAngle: .radians(startAngle),
            endAngle: .radians(endAngle),
            clockwise: false
        )
        return path
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
