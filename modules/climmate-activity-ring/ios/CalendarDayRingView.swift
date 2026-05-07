import SwiftUI
import ExpoModulesCore

class CalendarDayRingView: ExpoView {
    // Renamed from `onPress` to avoid clash with RN's built-in `topPress`
    // bubble event (Pressable / TouchableOpacity register it). Wrapper
    // exposes `onPress` to the JS API; only the native event name differs.
    let onTap = EventDispatcher()
    private let hostingController: UIHostingController<AnyView>

    // Data
    @objc var dayLabel: String = ""             { didSet { updateView() } }
    @objc var durationMin: Double = 0           { didSet { updateView() } }
    @objc var durationGoal: Double = 60         { didSet { updateView() } }
    @objc var sendCount: Int = 0                { didSet { updateView() } }
    @objc var sendGoal: Int = 10                { didSet { updateView() } }
    @objc var planProgress: Double = 0          { didSet { updateView() } }   // 0..100

    // State flags
    @objc var isSelected: Bool = false          { didSet { updateView() } }
    @objc var isToday: Bool = false             { didSet { updateView() } }
    @objc var isCurrentMonth: Bool = true       { didSet { updateView() } }

    // Caller-provided colors (all hex)
    @objc var outerBaseColor: String = "#A08060"        { didSet { updateView() } }
    @objc var innerBaseColor: String = "#306E6F"        { didSet { updateView() } }
    @objc var ringTrackColor: String = "#E5E7EB"        { didSet { updateView() } }
    @objc var selectedBg: String = "#306E6F"            { didSet { updateView() } }
    @objc var dayTextColor: String = "#374151"          { didSet { updateView() } }
    @objc var selectedTextColor: String = "#FFFFFF"     { didSet { updateView() } }
    @objc var inactiveTextColor: String = "#9CA3AF"     { didSet { updateView() } }
    @objc var outsideTextColor: String = "#D1D5DB"      { didSet { updateView() } }
    @objc var planDotColorComplete: String = "#A08060"  { didSet { updateView() } }
    @objc var planDotColorInProgress: String = "#306E6F" { didSet { updateView() } }
    @objc var todayDotColor: String = "#306E6F"         { didSet { updateView() } }

    public required init(appContext: AppContext? = nil) {
        hostingController = UIHostingController(rootView: AnyView(EmptyView()))
        super.init(appContext: appContext)
        addSubview(hostingController.view)
        hostingController.view.backgroundColor = .clear
        updateView()
    }

    private func updateView() {
        hostingController.rootView = AnyView(
            CalendarDayRingSwiftUI(
                dayLabel: dayLabel,
                durationRaw: durationGoal > 0 ? durationMin / durationGoal : 0,
                hasDuration: durationMin > 0,
                sendRaw: sendGoal > 0 ? Double(sendCount) / Double(sendGoal) : 0,
                hasSends: sendCount > 0,
                planProgress: planProgress,
                isSelected: isSelected, isToday: isToday, isCurrentMonth: isCurrentMonth,
                outerBase: Color(hex: outerBaseColor),
                innerBase: isSelected ? Color.white : Color(hex: innerBaseColor),
                ringTrack: isSelected ? Color.white.opacity(0.25)
                                      : Color(hex: ringTrackColor),
                selectedBg: Color(hex: selectedBg),
                dayTextColor: Color(hex: dayTextColor),
                selectedTextColor: Color(hex: selectedTextColor),
                inactiveTextColor: Color(hex: inactiveTextColor),
                outsideTextColor: Color(hex: outsideTextColor),
                planDotComplete: Color(hex: planDotColorComplete),
                planDotInProgress: Color(hex: planDotColorInProgress),
                todayDotColor: Color(hex: todayDotColor),
                onPress: { [weak self] in self?.onTap() }
            )
        )
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        hostingController.view.frame = bounds
    }
}

struct CalendarDayRingSwiftUI: View {
    let dayLabel: String
    let durationRaw: Double                 // 0..N (raw / goal)
    let hasDuration: Bool
    let sendRaw: Double
    let hasSends: Bool
    let planProgress: Double                // 0..100

    let isSelected: Bool
    let isToday: Bool
    let isCurrentMonth: Bool

    let outerBase: Color
    let innerBase: Color
    let ringTrack: Color
    let selectedBg: Color
    let dayTextColor: Color
    let selectedTextColor: Color
    let inactiveTextColor: Color
    let outsideTextColor: Color
    let planDotComplete: Color
    let planDotInProgress: Color
    let todayDotColor: Color
    let onPress: () -> Void

    private static let SIZE: CGFloat = 42
    private static let THICKNESS: CGFloat = 3
    private static let GAP: CGFloat = 1.5

    var body: some View {
        VStack(spacing: 2) {
            ZStack {
                if isSelected {
                    selectedBackground
                }
                ZStack {
                    if hasDuration {
                        StackedRing(progress: durationRaw,
                                    color: outerBase,
                                    track: ringTrack,
                                    size: Self.SIZE, thickness: Self.THICKNESS)
                    }
                    if hasSends {
                        StackedRing(progress: sendRaw,
                                    color: innerBase,
                                    track: ringTrack,
                                    size: Self.SIZE - (Self.THICKNESS + Self.GAP) * 2,
                                    thickness: Self.THICKNESS)
                    }
                    Text(dayLabel)
                        .font(.system(size: 12,
                                      weight: isSelected ? .heavy : .semibold))
                        .foregroundColor(textColor)
                }
                .frame(width: Self.SIZE, height: Self.SIZE)
            }
            dotView
                .frame(width: 5, height: 5)
        }
        .contentShape(Rectangle())
        .onTapGesture { onPress() }
    }

    /// iOS 26 Liquid Glass tinted with the accent color when available;
    /// falls back to solid fill on iOS 25 and below. Compile-gated with
    /// `compiler(>=6.2)` so the file still builds with Xcode 16 toolchains
    /// (matches the pattern used in modules/glass-effect-union/).
    @ViewBuilder
    private var selectedBackground: some View {
        if #available(iOS 26.0, *) {
#if compiler(>=6.2)
            Color.clear
                .glassEffect(
                    .regular.tint(selectedBg),
                    in: RoundedRectangle(cornerRadius: 8)
                )
#else
            RoundedRectangle(cornerRadius: 8).fill(selectedBg)
#endif
        } else {
            RoundedRectangle(cornerRadius: 8).fill(selectedBg)
        }
    }

    private var textColor: Color {
        if isSelected { return selectedTextColor }
        if !isCurrentMonth { return outsideTextColor }
        if !hasDuration && !hasSends { return inactiveTextColor }
        return dayTextColor
    }

    @ViewBuilder
    private var dotView: some View {
        if planProgress >= 100 {
            Circle().fill(isSelected ? .white : planDotComplete)
        } else if planProgress > 0 {
            Circle().fill(isSelected ? .white : planDotInProgress)
        } else if isToday {
            Circle().fill(isSelected ? .white : todayDotColor)
        } else {
            Color.clear
        }
    }
}

/// Apple Fitness-style ring identical to `ActivityRingSwiftUI` (the daily
/// summary big ring) — see [`ActivityRingView.swift`] L81-L155 for the
/// canonical body. Differences are size/thickness only and a shorter
/// `.onChange` duration tuned for B2-FU's 1s live tick (0.8s in big ring →
/// 0.35s here so the animation finishes before the next tick).
///
/// B2-FU2 (2026-05-05): replaced the prior `base.opacity(0.3) + single trim`
/// shortcut. Caller no longer passes a separate "completed" color — the
/// gradient + lap-1 overlap express both progress and overshoot via a single
/// accent color.
struct StackedRing: View {
    let progress: Double            // 0..N (overshoot OK)
    let color: Color                // accent (gradient endpoints derived)
    let track: Color
    let size: CGFloat
    let thickness: CGFloat

    private static let HEAD_DARKEN = 0.08
    private static let TAIL_LIGHTEN = 0.12

    @State private var displayedProgress: Double = 0

    var body: some View {
        let colorStart = color.darken(Self.HEAD_DARKEN)
        let colorEnd   = color.lighten(Self.TAIL_LIGHTEN)
        let r = (size - thickness) / 2

        ZStack {
            // Track / first lap base
            Circle()
                .strokeBorder(track, lineWidth: thickness)

            // First lap. STATIC AngularGradient covering the full 360° — see
            // big-ring rationale: dynamic endAngle causes the lineCap.round
            // tip to render `colorStart` (dark) at angles past endAngle as
            // the first lap closes, giving a "head turns dark" flash near 12
            // o'clock. Static 360° keeps the cap inside the gradient range.
            RingArcShape(progress: displayedProgress, lapStart: 0,
                         thickness: Double(thickness))
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

            // Overlap second lap. Gradient continues the first lap's flow:
            // starts at colorEnd (= first lap's tail at 12 o'clock) and ends
            // at an even lighter shade for the head — avoids a visible color
            // break at the seam.
            let overlapVisible = StackedRing.overlapAngle(of: displayedProgress)
            let colorOverlapHead = colorEnd.lighten(0.10)
            RingArcShape(progress: displayedProgress, lapStart: 1,
                         thickness: Double(thickness))
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
        .frame(width: size, height: size)
        .onAppear {
            withAnimation(.easeOut(duration: 1.1)) {
                displayedProgress = progress
            }
        }
        .onChange(of: progress) { newValue in
            // 0.35s vs big-ring 0.8s: month cell receives a setState every
            // second from B2-FU's live tick. With 0.8s ease-out the next
            // tick arrives before the prior animation settles, producing a
            // visible "hitch" as `displayedProgress` is re-targeted mid-
            // tween. 0.35s leaves ~0.65s of stillness per second so each
            // tick reads as a clean discrete advance.
            withAnimation(.easeOut(duration: 0.35)) {
                displayedProgress = newValue
            }
        }
    }

    /// Visible angular extent (in turns, 0..1) of the overlap lap given total
    /// progress — duplicated from `ActivityRingSwiftUI` to keep `StackedRing`
    /// self-contained within this file.
    private static func overlapAngle(of p: Double) -> Double {
        guard p > 1 else { return 0 }
        let frac = p.truncatingRemainder(dividingBy: 1)
        return frac == 0 ? 1.0 : frac
    }
}
