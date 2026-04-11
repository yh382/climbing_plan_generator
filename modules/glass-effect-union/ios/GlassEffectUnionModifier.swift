import SwiftUI
import ExpoModulesCore

/// Outer modifier: decodes JS params via `Record` + `@Field`, gates iOS
/// availability, then delegates to a nested pure-SwiftUI modifier that can
/// safely use `@Environment` to read the namespace.
internal struct GlassEffectUnionModifier: ViewModifier, Record {
  @Field var id: String = ""

  @ViewBuilder
  func body(content: Content) -> some View {
    if #available(iOS 26.0, macOS 26.0, tvOS 26.0, *) {
#if compiler(>=6.2) // Xcode 26
      content.modifier(UnionApplier(id: id))
#else
      content
#endif
    } else {
      content
    }
  }
}

#if compiler(>=6.2) // Xcode 26
@available(iOS 26.0, macOS 26.0, tvOS 26.0, *)
private struct UnionApplier: ViewModifier {
  let id: String
  @Environment(\.glassUnionNamespace) private var holder

  @ViewBuilder
  func body(content: Content) -> some View {
    if let holder {
      content.glassEffectUnion(id: id, namespace: holder.id)
    } else {
      content
    }
  }
}
#endif
