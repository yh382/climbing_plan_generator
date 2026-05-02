import ExpoModulesCore
import UIKit

public class ClimmateImageViewerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClimmateImageViewer")

    AsyncFunction("present") { (params: PresentParams) -> Void in
      await MainActor.run {
        ImageViewerBridge.shared.present(
          urls: params.urls,
          types: params.types,
          startIndex: params.startIndex
        )
      }
    }
  }
}

internal struct PresentParams: Record {
  @Field var urls: [String] = []
  @Field var types: [String] = []
  @Field var startIndex: Int = 0
}
