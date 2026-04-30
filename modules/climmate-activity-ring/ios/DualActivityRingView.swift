import SwiftUI
import ExpoModulesCore

class DualActivityRingView: ExpoView {
    private let hostingController: UIHostingController<AnyView>

    @objc var trainingPct: Double = 0          { didSet { updateView() } }   // already normalized 0..N (RN wrapper /100)
    @objc var climbCount: Int = 0              { didSet { updateView() } }
    @objc var climbGoal: Int = 0               { didSet { updateView() } }
    @objc var outerColor: String = "#A08060"   { didSet { updateView() } }
    @objc var innerColor: String = "#306E6F"   { didSet { updateView() } }
    @objc var bgTrackColor: String = "#F7F7F7" { didSet { updateView() } }
    @objc var thickness: Double = 13           { didSet { updateView() } }
    @objc var gap: Double = 4                  { didSet { updateView() } }

    public required init(appContext: AppContext? = nil) {
        hostingController = UIHostingController(rootView: AnyView(EmptyView()))
        super.init(appContext: appContext)
        addSubview(hostingController.view)
        hostingController.view.backgroundColor = .clear
        updateView()
    }

    private func updateView() {
        let innerRaw = climbGoal > 0 ? Double(climbCount) / Double(climbGoal) : 0
        hostingController.rootView = AnyView(
            DualActivityRingSwiftUI(
                outerProgress: trainingPct,
                innerProgress: innerRaw,
                outerColor: Color(hex: outerColor),
                innerColor: Color(hex: innerColor),
                bgTrackColor: Color(hex: bgTrackColor),
                thickness: thickness,
                gap: gap
            )
        )
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        hostingController.view.frame = bounds
    }
}

struct DualActivityRingSwiftUI: View {
    let outerProgress: Double
    let innerProgress: Double
    let outerColor: Color
    let innerColor: Color
    let bgTrackColor: Color
    let thickness: Double
    let gap: Double

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            ZStack {
                ActivityRingSwiftUI(
                    progress: outerProgress, color: outerColor,
                    bgTrackColor: bgTrackColor, thickness: thickness
                )
                ActivityRingSwiftUI(
                    progress: innerProgress, color: innerColor,
                    bgTrackColor: bgTrackColor, thickness: thickness
                )
                .frame(
                    width:  side - (thickness + gap) * 2,
                    height: side - (thickness + gap) * 2
                )
            }
        }
    }
}
