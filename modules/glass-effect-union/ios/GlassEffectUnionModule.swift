import ExpoModulesCore
import ExpoUI

public class GlassEffectUnionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GlassEffectUnion")

    OnCreate {
      ViewModifierRegistry.register("glassEffectUnion") { params, appContext, _ in
        return try GlassEffectUnionModifier(from: params, appContext: appContext)
      }
    }

    OnDestroy {
      ViewModifierRegistry.unregister("glassEffectUnion")
    }

    View(GlassUnionGroupView.self) {}
  }
}
