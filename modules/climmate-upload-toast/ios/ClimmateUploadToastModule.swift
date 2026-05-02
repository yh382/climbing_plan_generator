import ExpoModulesCore
import UIKit
import SwiftUI

public class ClimmateUploadToastModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClimmateUploadToast")

    View(UploadToastNativeView.self) {
      Prop("status") { (view: UploadToastNativeView, status: String) in
        view.status = status
      }
      Prop("progress") { (view: UploadToastNativeView, progress: Double) in
        view.progress = progress
      }
      Prop("label") { (view: UploadToastNativeView, label: String) in
        view.label = label
      }
    }
  }
}

public class UploadToastNativeView: ExpoView {
  public var status: String = "uploading" { didSet { rebuild() } }
  public var progress: Double = 0 { didSet { rebuild() } }
  public var label: String = "" { didSet { rebuild() } }

  private let host = UIHostingController(rootView: UploadToastBody(state: .init(status: "uploading", progress: 0, label: "")))

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addSubview(host.view)
    host.view.backgroundColor = .clear
    host.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      host.view.topAnchor.constraint(equalTo: topAnchor),
      host.view.bottomAnchor.constraint(equalTo: bottomAnchor),
      host.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      host.view.trailingAnchor.constraint(equalTo: trailingAnchor),
    ])
  }

  private func rebuild() {
    host.rootView = UploadToastBody(
      state: .init(status: status, progress: progress, label: label)
    )
  }
}

internal struct UploadToastState {
  let status: String   // "compressing" | "uploading" | "success" | "error"
  let progress: Double // 0..1
  let label: String
}
