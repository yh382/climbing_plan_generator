import SwiftUI
import ExpoModulesCore

class AbilityRadarView: ExpoView {
    private let hostingController: UIHostingController<AnyView>
    var data: RadarData = RadarData() { didSet { updateView() } }

    public required init(appContext: AppContext? = nil) {
        hostingController = UIHostingController(rootView: AnyView(EmptyView()))
        super.init(appContext: appContext)
        addSubview(hostingController.view)
        hostingController.view.backgroundColor = .clear
        updateView()
    }

    private func updateView() {
        hostingController.rootView = AnyView(AbilityRadarSwiftUI(data: data))
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        hostingController.view.frame = bounds
    }
}

private struct AbilityRadarSwiftUI: View {
    let data: RadarData

    // Order matches RN AbilityRadar.tsx (12 o'clock start, clockwise).
    // Labels are hardcoded English to match the source.
    private let axes: [(value: KeyPath<RadarData, Double>, label: String)] = [
        (\.finger, "Finger"),
        (\.pull,   "Power"),
        (\.core,   "Core"),
        (\.flex,   "Flex"),
        (\.sta,    "Stamina"),
    ]

    private let gridStroke = Color(hex: "#E5E7EB")
    private let outermostFill = Color(hex: "#F9FAFB")
    private let dataColor = Color(hex: "#306E6F")
    private let labelColor = Color(hex: "#6B7280")

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
            // -44 matches RN inset (room for axis labels at 116% radius).
            let radius = size / 2 - 44

            ZStack {
                // 5 grid levels
                ForEach([20, 40, 60, 80, 100], id: \.self) { level in
                    let r = radius * Double(level) / 100
                    let pts = gridPoints(center: center, radius: r)
                    Polygon(points: pts)
                        .fill(level == 100 ? outermostFill : Color.clear)
                    Polygon(points: pts)
                        .stroke(gridStroke, lineWidth: 1)
                }

                // 5 axis lines
                ForEach(0..<5, id: \.self) { i in
                    Path { p in
                        p.move(to: center)
                        p.addLine(to: pointOnCircle(center: center, radius: radius, angleIndex: i))
                    }
                    .stroke(gridStroke, lineWidth: 1)
                }

                // Data polygon
                let dataPts = dataPolygonPoints(center: center, radius: radius)
                Polygon(points: dataPts)
                    .fill(dataColor.opacity(0.4))
                Polygon(points: dataPts)
                    .stroke(dataColor, lineWidth: 2)

                // Data point dots
                ForEach(0..<5, id: \.self) { i in
                    let val = data[keyPath: axes[i].value]
                    let pt = pointOnCircle(center: center, radius: radius * val / 100, angleIndex: i)
                    Circle()
                        .fill(dataColor)
                        .overlay(Circle().stroke(.white, lineWidth: 1.5))
                        .frame(width: 8, height: 8)
                        .position(pt)
                }

                // Axis labels at 116% radius (matches RN getPoint(116, ...))
                ForEach(0..<5, id: \.self) { i in
                    let labelPt = pointOnCircle(center: center, radius: radius * 1.16, angleIndex: i)
                    Text(axes[i].label)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(labelColor)
                        .position(labelPt)
                }
            }
        }
    }

    private func gridPoints(center: CGPoint, radius: Double) -> [CGPoint] {
        (0..<5).map { i in pointOnCircle(center: center, radius: radius, angleIndex: i) }
    }

    private func dataPolygonPoints(center: CGPoint, radius: Double) -> [CGPoint] {
        (0..<5).map { i in
            let val = data[keyPath: axes[i].value]
            return pointOnCircle(center: center, radius: radius * val / 100, angleIndex: i)
        }
    }

    private func pointOnCircle(center: CGPoint, radius: Double, angleIndex: Int) -> CGPoint {
        // 12 o'clock = angle 0 → start at -π/2, clockwise step 2π/5.
        let angle = Double(angleIndex) * 2 * .pi / 5 - .pi / 2
        return CGPoint(
            x: center.x + radius * cos(angle),
            y: center.y + radius * sin(angle)
        )
    }
}

private struct Polygon: Shape {
    let points: [CGPoint]
    func path(in rect: CGRect) -> Path {
        var p = Path()
        guard let first = points.first else { return p }
        p.move(to: first)
        for pt in points.dropFirst() { p.addLine(to: pt) }
        p.closeSubpath()
        return p
    }
}
