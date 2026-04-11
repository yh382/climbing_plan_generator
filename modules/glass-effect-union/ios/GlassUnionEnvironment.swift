import SwiftUI

/// Wraps a `Namespace.ID` so it can be stored in SwiftUI's environment.
/// Equatable conformance is required for environment change tracking.
internal struct GlassUnionNamespaceHolder: Equatable {
  let id: Namespace.ID
}

private struct GlassUnionNamespaceKey: EnvironmentKey {
  static let defaultValue: GlassUnionNamespaceHolder? = nil
}

internal extension EnvironmentValues {
  var glassUnionNamespace: GlassUnionNamespaceHolder? {
    get { self[GlassUnionNamespaceKey.self] }
    set { self[GlassUnionNamespaceKey.self] = newValue }
  }
}
