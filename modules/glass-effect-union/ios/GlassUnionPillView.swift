import SwiftUI
import ExpoModulesCore

/// One member of the fused glass pill. `kind` decides label vs. icon
/// rendering; tint is optional and only used by count-badge style buttons.
internal struct PillItem: Record {
  @Field var key: String = ""
  @Field var kind: String = "icon"        // "icon" | "count"
  @Field var icon: String? = nil          // SF Symbol name (icon kind)
  @Field var label: String? = nil         // text label (count kind)
  @Field var tint: String? = nil          // hex tint for the glass material
  @Field var foregroundColor: String? = nil  // hex foreground (label color)
  @Field var fontSize: Double = 19
  @Field var fontWeight: String = "light" // "light" | "regular" | "medium" | "semibold" | "bold"
  @Field var monospacedDigit: Bool = false
  @Field var numericTransition: Bool = false
  @Field var visible: Bool = true

  public init() {}
}

/// Self-contained liquid-glass pill: owns its `@Namespace`, renders every
/// member Button inside the same SwiftUI subtree, and applies
/// `.glassEffectUnion(id:namespace:)` directly — no Environment plumbing,
/// no `@expo/ui` modifier-registry indirection. Robust against RN sibling
/// re-renders that previously broke the Namespace injection (the
/// "candied haw" bug; see pattern_glasseffectunion_rn_swiftui_conflict).
internal class GlassUnionPillView: ExpoView {
  let onItemPress = EventDispatcher()
  private let hostingController: UIHostingController<AnyView>

  var axis: String = "vertical"        { didSet { updateView() } }
  var unionId: String = "default"      { didSet { updateView() } }
  var containerSpacing: Double = 20    { didSet { updateView() } }
  var buttonSize: Double = 44          { didSet { updateView() } }
  var items: [PillItem] = []           { didSet { updateView() } }

  public required init(appContext: AppContext? = nil) {
    hostingController = UIHostingController(rootView: AnyView(EmptyView()))
    super.init(appContext: appContext)
    addSubview(hostingController.view)
    hostingController.view.backgroundColor = .clear
    updateView()
  }

  private func updateView() {
    hostingController.rootView = AnyView(
      GlassUnionPillSwiftUI(
        axis: axis,
        unionId: unionId,
        containerSpacing: containerSpacing,
        buttonSize: buttonSize,
        items: items,
        onPress: { [weak self] key in
          self?.onItemPress(["key": key])
        }
      )
    )
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    hostingController.view.frame = bounds
  }
}

private struct GlassUnionPillSwiftUI: View {
  let axis: String
  let unionId: String
  let containerSpacing: Double
  let buttonSize: Double
  let items: [PillItem]
  let onPress: (String) -> Void

  @Namespace private var ns

  private var visibleItems: [PillItem] {
    items.filter { $0.visible }
  }

  var body: some View {
    if #available(iOS 26.0, *) {
#if compiler(>=6.2)
      glassPillBody
#else
      fallbackPillBody
#endif
    } else {
      fallbackPillBody
    }
  }

#if compiler(>=6.2)
  @available(iOS 26.0, *)
  @ViewBuilder
  private var glassPillBody: some View {
    GlassEffectContainer(spacing: CGFloat(containerSpacing)) {
      stack {
        ForEach(visibleItems, id: \.key) { item in
          glassButton(for: item)
        }
      }
    }
  }

  @available(iOS 26.0, *)
  @ViewBuilder
  private func glassButton(for item: PillItem) -> some View {
    Button(action: { onPress(item.key) }) {
      buttonLabel(for: item)
    }
    .buttonStyle(.plain)
    .frame(width: CGFloat(buttonSize), height: CGFloat(buttonSize))
    .glassEffect(glassMaterial(for: item), in: .capsule)
    .glassEffectUnion(id: unionId, namespace: ns)
  }

  @available(iOS 26.0, *)
  private func glassMaterial(for item: PillItem) -> Glass {
    var g: Glass = .regular.interactive()
    if let tint = item.tint, !tint.isEmpty {
      g = .regular.tint(Color(hex: tint)).interactive()
    }
    return g
  }
#endif

  @ViewBuilder
  private var fallbackPillBody: some View {
    stack {
      ForEach(visibleItems, id: \.key) { item in
        Button(action: { onPress(item.key) }) {
          buttonLabel(for: item)
        }
        .buttonStyle(.plain)
        .frame(width: CGFloat(buttonSize), height: CGFloat(buttonSize))
        .background(.regularMaterial, in: Capsule())
      }
    }
  }

  @ViewBuilder
  private func stack<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
    if axis == "horizontal" {
      HStack(spacing: 0, content: content)
    } else {
      VStack(spacing: 0, content: content)
    }
  }

  @ViewBuilder
  private func buttonLabel(for item: PillItem) -> some View {
    let weight = fontWeightFor(item.fontWeight)
    let fg: Color = {
      if let hex = item.foregroundColor, !hex.isEmpty {
        return Color(hex: hex)
      }
      return Color.primary
    }()

    if item.kind == "count" {
      let text = item.label ?? ""
      let base = Text(text)
        .font(.system(size: CGFloat(item.fontSize), weight: weight))
        .foregroundStyle(fg)
      if item.numericTransition {
        if #available(iOS 17.0, *) {
          base.contentTransition(.numericText())
        } else {
          base
        }
      } else {
        base
      }
    } else {
      Image(systemName: item.icon ?? "")
        .font(.system(size: CGFloat(item.fontSize), weight: weight))
        .foregroundStyle(fg)
    }
  }

  private func fontWeightFor(_ name: String) -> Font.Weight {
    switch name {
    case "light":     return .light
    case "regular":   return .regular
    case "medium":    return .medium
    case "semibold":  return .semibold
    case "bold":      return .bold
    default:          return .regular
    }
  }
}
