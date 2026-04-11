import SwiftUI
import ExpoModulesCore

public final class GlassUnionGroupViewProps: ExpoSwiftUI.ViewProps {}

/// Pass-through container that creates a SwiftUI `@Namespace` and injects
/// it into the environment. Children using the `glassEffectUnion` modifier
/// will bind to this namespace and render as a single seamless glass shape.
public struct GlassUnionGroupView: ExpoSwiftUI.View {
  @ObservedObject public var props: GlassUnionGroupViewProps
  @Namespace private var namespace

  public init(props: GlassUnionGroupViewProps) {
    self.props = props
  }

  public var body: some View {
    Children()
      .environment(
        \.glassUnionNamespace,
        GlassUnionNamespaceHolder(id: namespace)
      )
  }
}
