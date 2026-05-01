import SwiftUI
import Charts
import ExpoModulesCore

class TrainingVolumeChartView: ExpoView {
    private let hostingController: UIHostingController<AnyView>
    var slots: [VolumeSlot] = [] { didSet { updateView() } }
    var showBoulder: Bool = true { didSet { updateView() } }
    var showRope: Bool = false { didSet { updateView() } }
    // RN sets isActive=true when the carousel page becomes visible.
    var isActive: Bool = true { didSet { updateView() } }

    public required init(appContext: AppContext? = nil) {
        hostingController = UIHostingController(rootView: AnyView(EmptyView()))
        super.init(appContext: appContext)
        addSubview(hostingController.view)
        hostingController.view.backgroundColor = .clear
        updateView()
    }

    private func updateView() {
        hostingController.rootView = AnyView(
            TrainingVolumeChartSwiftUI(
                slots: slots,
                showBoulder: showBoulder,
                showRope: showRope,
                isActive: isActive
            )
        )
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        hostingController.view.frame = bounds
    }
}

private struct TrainingVolumeChartSwiftUI: View {
    let slots: [VolumeSlot]
    let showBoulder: Bool
    let showRope: Bool
    let isActive: Bool

    // Mount-time animation: bars rise from 0 → real values. Also re-triggers
    // when timeRange changes (slot count flips W↔M↔Y) or carousel swipes back.
    @State private var animationProgress: Double = 0

    // Boulder grayscale palette: easy → mid → hard → elite (light → dark)
    private let boulderColors: [Color] = [
        Color(hex: "#BBBBBB"),
        Color(hex: "#888888"),
        Color(hex: "#555555"),
        Color(hex: "#1C1C1E"),
    ]

    // Rope: 5 categories, slightly different intermediate shade
    private let ropeColors: [Color] = [
        Color(hex: "#BBBBBB"),
        Color(hex: "#888888"),
        Color(hex: "#555555"),
        Color(hex: "#333333"),
        Color(hex: "#1C1C1E"),
    ]

    private let accent = Color(hex: "#306E6F")

    private var maxValue: Double {
        let totals = slots.map { slot -> Int in
            let bTotal = slot.boulderEasy + slot.boulderMid + slot.boulderHard + slot.boulderElite
            let rTotal = slot.ropeBeginner + slot.ropeIntermediate + slot.ropeAdvanced + slot.ropeExpert + slot.ropeElite
            return max(bTotal, rTotal)
        }
        return max(4, ceil(Double(totals.max() ?? 0) * 1.15))
    }

    private var slotOrder: [String] {
        slots.map { $0.slotKey }
    }

    private var hasIntensityData: Bool {
        slots.contains { !$0.isFuture && $0.intensity > 0 }
    }

    var body: some View {
        // VStack with negative spacing to overlay the intensity line on top
        // of the bars (matches original RN marginBottom: -10 layout).
        VStack(spacing: -10) {
            intensityChart
                .frame(height: 80)
                .zIndex(2)

            barsChart
                .frame(height: 160)
                .zIndex(1)
        }
        .padding(.horizontal, 4)
        .onAppear {
            // Don't pre-fire animation on inactive carousel pages.
            if isActive { triggerAnimation(duration: 0.45) }
        }
        .onChange(of: timeRangeKey) { _, _ in triggerAnimation(duration: 0.4) }
        .onChange(of: isActive) { _, newValue in
            if newValue { triggerAnimation(duration: 0.4) }
        }
    }

    private func triggerAnimation(duration: Double) {
        // Reset on this tick so SwiftUI commits a frame at progress=0; defer
        // the animated 0→1 transition to the NEXT runloop tick. Putting both
        // sets on the same tick lets SwiftUI coalesce them — only the end
        // state renders, no animation runs. With two charts in the VStack
        // (bars + intensity) this manifested as one chart sometimes
        // animating while the other snapped instantly.
        animationProgress = 0
        DispatchQueue.main.async {
            withAnimation(.easeOut(duration: duration)) {
                animationProgress = 1
            }
        }
    }

    // Stable key that changes when slot count changes (W=7, M=4, Y=12).
    private var timeRangeKey: Int { slots.count }

    // MARK: - Intensity line (top, dashed + curved)

    private var intensityChart: some View {
        Chart {
            if hasIntensityData {
                ForEach(slots, id: \.slotKey) { slot in
                    if !slot.isFuture && slot.intensity > 0 {
                        LineMark(
                            x: .value("Slot", slot.slotKey),
                            y: .value("Intensity", slot.intensity * animationProgress)
                        )
                        .foregroundStyle(accent)
                        .lineStyle(StrokeStyle(lineWidth: 2, dash: [4, 4]))
                        .interpolationMethod(.monotone)
                        .symbol {
                            Circle()
                                .fill(accent)
                                .frame(width: 6, height: 6)
                        }
                    }
                }
            } else {
                // Empty-state hint: same accent color as the real line, just
                // faded — keeps visual association so the user understands what
                // will appear here once data exists.
                RuleMark(y: .value("Hint", 0.5))
                    .foregroundStyle(accent.opacity(0.3))
                    .lineStyle(StrokeStyle(lineWidth: 2, dash: [4, 4]))
            }
        }
        .chartXScale(domain: slotOrder)
        .chartYScale(domain: 0...1)
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
    }

    // MARK: - Bars (bottom, stacked + side-by-side for dual type)

    private var barsChart: some View {
        Chart {
            ForEach(slots, id: \.slotKey) { slot in
                if !slot.isFuture {
                    if showBoulder {
                        boulderBars(slot: slot)
                    }
                    if showRope {
                        ropeBars(slot: slot)
                    }
                }
            }
        }
        .chartXScale(domain: slotOrder)
        .chartYScale(domain: 0...maxValue)
        .chartYAxis(.hidden)
        .chartXAxis {
            AxisMarks(values: slotOrder) { axisValue in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    .foregroundStyle(Color.gray.opacity(0.25))
                AxisValueLabel {
                    if let key = axisValue.as(String.self),
                       let slot = slots.first(where: { $0.slotKey == key }) {
                        Text(slot.label)
                            .font(.system(size: 10, weight: slot.isCurrent ? .bold : .regular))
                            .foregroundStyle(slot.isCurrent ? accent : Color.gray)
                    }
                }
            }
        }
        .chartOverlay { proxy in
            GeometryReader { _ in
                if let currentSlot = slots.first(where: { $0.isCurrent }),
                   let xPos = proxy.position(forX: currentSlot.slotKey) {
                    // Inverted triangle indicator at top of plot area
                    Path { p in
                        p.move(to: CGPoint(x: xPos - 4, y: 0))
                        p.addLine(to: CGPoint(x: xPos + 4, y: 0))
                        p.addLine(to: CGPoint(x: xPos, y: 6))
                        p.closeSubpath()
                    }
                    .fill(accent)
                }
            }
        }
    }

    // MARK: - Stacked bar builders

    @ChartContentBuilder
    private func boulderBars(slot: VolumeSlot) -> some ChartContent {
        // Stack order: easy → mid → hard → elite (bottom to top).
        // Each segment is multiplied by animationProgress so bars rise on mount.
        let parts: [(String, Double, Color)] = [
            ("easy", Double(slot.boulderEasy) * animationProgress, boulderColors[0]),
            ("mid", Double(slot.boulderMid) * animationProgress, boulderColors[1]),
            ("hard", Double(slot.boulderHard) * animationProgress, boulderColors[2]),
            ("elite", Double(slot.boulderElite) * animationProgress, boulderColors[3]),
        ]
        ForEach(parts.indices, id: \.self) { i in
            BarMark(
                x: .value("Slot", slot.slotKey),
                y: .value("Count", parts[i].1)
            )
            .foregroundStyle(parts[i].2)
            .position(by: .value("Type", "boulder"))
            .cornerRadius(2)
        }
    }

    @ChartContentBuilder
    private func ropeBars(slot: VolumeSlot) -> some ChartContent {
        let parts: [(String, Double, Color)] = [
            ("beginner", Double(slot.ropeBeginner) * animationProgress, ropeColors[0]),
            ("intermediate", Double(slot.ropeIntermediate) * animationProgress, ropeColors[1]),
            ("advanced", Double(slot.ropeAdvanced) * animationProgress, ropeColors[2]),
            ("expert", Double(slot.ropeExpert) * animationProgress, ropeColors[3]),
            ("elite", Double(slot.ropeElite) * animationProgress, ropeColors[4]),
        ]
        ForEach(parts.indices, id: \.self) { i in
            BarMark(
                x: .value("Slot", slot.slotKey),
                y: .value("Count", parts[i].1)
            )
            .foregroundStyle(parts[i].2)
            .position(by: .value("Type", "rope"))
            .cornerRadius(2)
        }
    }
}
