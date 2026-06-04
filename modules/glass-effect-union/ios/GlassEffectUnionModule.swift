import ExpoModulesCore

public class GlassEffectUnionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GlassEffectUnion")

    // Self-contained liquid-glass pill: @Namespace + member buttons all
    // live inside a single SwiftUI subtree, removing the previous reliance
    // on @expo/ui's modifier-registry + Environment propagation (which was
    // silently broken by RN sibling re-renders — the "candied haw" bug;
    // see pattern_glasseffectunion_rn_swiftui_conflict in user memory).
    View(GlassUnionPillView.self) {
      Events("onItemPress")

      Prop("axis") { (view: GlassUnionPillView, axis: String) in
        view.axis = axis
      }
      Prop("unionId") { (view: GlassUnionPillView, unionId: String) in
        view.unionId = unionId
      }
      Prop("containerSpacing") { (view: GlassUnionPillView, spacing: Double) in
        view.containerSpacing = spacing
      }
      Prop("buttonSize") { (view: GlassUnionPillView, size: Double) in
        view.buttonSize = size
      }
      Prop("items") { (view: GlassUnionPillView, items: [PillItem]) in
        view.items = items
      }
    }
  }
}
