import SwiftUI
import Charts
import ExpoModulesCore

class GradePyramidView: ExpoView {
    private let hostingController: UIHostingController<AnyView>
    var data: [GradeBarData] = [] { didSet { updateView() } }
    var climbType: String = "boulder" { didSet { updateView() } }
    // RN sets isActive=true when the carousel page becomes visible. Re-running
    // the SwiftUI body with a fresh `isActive` value lets the chart re-trigger
    // its expand animation each time the user swipes back.
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
            GradePyramidSwiftUI(data: data, climbType: climbType, isActive: isActive)
        )
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        hostingController.view.frame = bounds
    }
}

private struct GradePyramidSwiftUI: View {
    let data: [GradeBarData]
    let climbType: String
    let isActive: Bool

    // Bars expand horizontally from 0 → real count on appear. Re-trigger when
    // climbType (boulder/rope) toggles or when isActive flips true (carousel
    // swiped back to this card).
    @State private var animationProgress: Double = 0

    private var orderedGrades: [String] {
        data.sorted { $0.score > $1.score }.map { $0.grade }
    }

    private var maxCount: Int {
        max(1, data.map { $0.count }.max() ?? 1)
    }

    var body: some View {
        Chart(data, id: \.grade) { item in
            BarMark(
                x: .value("Count", Double(item.count) * animationProgress),
                y: .value("Grade", item.grade),
                width: .fixed(20)
            )
            .foregroundStyle(Color(hex: item.color))
            .opacity(0.9)
            .annotation(position: .overlay, alignment: .trailing, spacing: 0) {
                if item.count > 0 {
                    Text("\(item.count)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.trailing, 6)
                        .opacity(animationProgress)
                }
            }
        }
        .chartYScale(domain: orderedGrades)
        .chartXScale(domain: 0...Double(maxCount + 1))
        .chartXAxis(.hidden)
        .chartYAxis {
            AxisMarks(preset: .extended, position: .leading) { _ in
                AxisValueLabel(horizontalSpacing: 12)
                    .font(.system(size: 11, weight: .semibold))
            }
        }
        .chartLegend(.hidden)
        .padding(.horizontal, 8)
        .onAppear {
            // Don't pre-fire animation on inactive carousel pages — otherwise
            // bars sit at full size off-screen and the user sees them flash
            // before the real animation runs after isActive flips true.
            if isActive { triggerAnimation(duration: 0.5) }
        }
        .onChange(of: climbType) { _, _ in triggerAnimation(duration: 0.4) }
        .onChange(of: isActive) { _, newValue in
            if newValue { triggerAnimation(duration: 0.4) }
        }
    }

    private func triggerAnimation(duration: Double) {
        // Reset and defer the animated 0→1 set to the next runloop tick.
        // Same-tick reset+animate gets coalesced by SwiftUI; only the end
        // frame renders, killing the animation.
        animationProgress = 0
        DispatchQueue.main.async {
            withAnimation(.easeOut(duration: duration)) {
                animationProgress = 1
            }
        }
    }
}
