import ActivityKit

// Shared between the main app target (compiled via the ClimmateUploadActivity
// pod) and the widget extension target (where this file is copied by
// plugins/withCustomWidgetFiles.js).
//
// ActivityKit matches activities across targets by struct name + Codable shape,
// so the two copies must stay structurally identical.

@available(iOS 16.2, *)
public struct UploadAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var label: String
    public var progress: Double // 0..1
    public var status: String  // "compressing" | "uploading" | "success" | "error"
  }

  public init() {}
}
