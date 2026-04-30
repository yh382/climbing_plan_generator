import ExpoModulesCore
import AVFoundation

public class ClimmateVideoTrimModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClimmateVideoTrim")

    AsyncFunction("trim") { (inputUri: String, startSec: Double, endSec: Double) -> String in
      // Resolve input URL
      let url: URL
      if inputUri.hasPrefix("file://") {
        guard let fileUrl = URL(string: inputUri) else {
          throw NSError(domain: "ClimmateVideoTrim", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid input URI"])
        }
        url = fileUrl
      } else if inputUri.hasPrefix("/") {
        url = URL(fileURLWithPath: inputUri)
      } else if inputUri.hasPrefix("ph://") {
        // Photos library asset — fetch actual file URL
        throw NSError(domain: "ClimmateVideoTrim", code: 2, userInfo: [NSLocalizedDescriptionKey: "ph:// URIs not supported, pass a file URI"])
      } else {
        guard let parsed = URL(string: inputUri) else {
          throw NSError(domain: "ClimmateVideoTrim", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid input URI"])
        }
        url = parsed
      }

      let asset = AVURLAsset(url: url)

      guard let exportSession = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough) else {
        throw NSError(domain: "ClimmateVideoTrim", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not create export session"])
      }

      // Output file
      let outputDir = FileManager.default.temporaryDirectory
      let outputName = "trimmed_\(Int(Date().timeIntervalSince1970 * 1000)).mp4"
      let outputUrl = outputDir.appendingPathComponent(outputName)

      // Remove existing file if any
      try? FileManager.default.removeItem(at: outputUrl)

      // Set time range
      let start = CMTime(seconds: startSec, preferredTimescale: 600)
      let end = CMTime(seconds: endSec, preferredTimescale: 600)
      let timeRange = CMTimeRange(start: start, end: end)

      exportSession.outputURL = outputUrl
      exportSession.outputFileType = .mp4
      exportSession.timeRange = timeRange

      return try await withCheckedThrowingContinuation { continuation in
        exportSession.exportAsynchronously {
          switch exportSession.status {
          case .completed:
            continuation.resume(returning: outputUrl.absoluteString)
          case .failed:
            let err = exportSession.error ?? NSError(domain: "ClimmateVideoTrim", code: 4, userInfo: [NSLocalizedDescriptionKey: "Export failed"])
            continuation.resume(throwing: err)
          case .cancelled:
            continuation.resume(throwing: NSError(domain: "ClimmateVideoTrim", code: 5, userInfo: [NSLocalizedDescriptionKey: "Export cancelled"]))
          default:
            continuation.resume(throwing: NSError(domain: "ClimmateVideoTrim", code: 6, userInfo: [NSLocalizedDescriptionKey: "Unexpected export status: \(exportSession.status.rawValue)"]))
          }
        }
      }
    }
  }
}
