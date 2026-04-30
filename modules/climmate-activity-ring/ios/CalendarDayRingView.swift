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
    @objc var outerCompletedColor: String = "#8B6914"   { didSet { updateView() } }
    @objc var innerBaseColor: String = "#306E6F"        { didSet { updateView() } }
    @objc var innerCompletedColor: String = "#265858"   { didSet { updateView() } }
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
                outerCompleted: Color(hex: outerCompletedColor),
                innerBase: isSelected ? Color.white : Color(hex: innerBaseColor),
                innerCompleted: isSelected ? Color.white.opacity(0.8)
                                           : Color(hex: innerCompletedColor),
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
    let outerCompleted: Color
    let innerBase: Color
    let innerCompleted: Color
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
                        StackedRing(raw: durationRaw,
                                    base: outerBase, completed: outerCompleted,
                                    track: ringTrack,
                                    size: Self.SIZE, thickness: Self.THICKNESS)
                    }
                    if hasSends {
                        StackedRing(raw: sendRaw,
                                    base: innerBase, completed: innerCompleted,
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

/// Apple Fitness-style stacked progress ring: when raw > 1, half-opacity
/// underlying ring shows the previous loop while the foreground ring resets
/// to the remainder, with completed-color when ratio reaches 1. Mirrors the
/// RN strokeOpacity={0.3} stacked behavior in CalendarDayRing.tsx.
struct StackedRing: View {
    let raw: Double
    let base: Color
    let completed: Color
    let track: Color
    let size: CGFloat
    let thickness: CGFloat

    var body: some View {
        let fullLoops = Int(floor(raw))
        let remainder = raw - Double(fullLoops)
        let stacked = fullLoops > 0
        let ratio: Double = stacked
            ? (remainder == 0 && raw > 0 ? 1 : remainder)
            : min(raw, 1)
        let strokeColor = ratio >= 1 ? completed : base

        ZStack {
            // strokeBorder + inset(by:) keep the stroke inside the frame so
            // both rings sit at the same path radius. Without this, the
            // stroke extends `thickness/2` outside the frame and adjacent
            // rings (calendar's nested inner) overlap.
            Circle()
                .strokeBorder(stacked ? base.opacity(0.3) : track,
                              lineWidth: thickness)
            Circle()
                .inset(by: thickness / 2)
                .trim(from: 0, to: ratio)
                .stroke(strokeColor,
                        style: StrokeStyle(lineWidth: thickness, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
    }
}
