import SwiftUI
import UIKit
import AVKit

// MARK: - Hosting Controller
//
// Wraps the SwiftUI viewer in a UIViewController so we can present it
// modally from anywhere in the UIKit hierarchy. Handles its own dismiss.

class ImageViewerHostingController: UIViewController {
  private let items: [ImageViewerItem]
  private let startIndex: Int

  init(items: [ImageViewerItem], startIndex: Int) {
    self.items = items
    self.startIndex = startIndex
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black

    let viewer = ImageViewerView(
      items: items,
      startIndex: startIndex,
      onClose: { [weak self] in self?.dismiss(animated: true) },
      onShare: { [weak self] url in self?.presentShareSheet(for: url) }
    )
    let host = UIHostingController(rootView: viewer)
    host.view.backgroundColor = .black
    addChild(host)
    view.addSubview(host.view)
    host.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      host.view.topAnchor.constraint(equalTo: view.topAnchor),
      host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
    ])
    host.didMove(toParent: self)
  }

  override var prefersStatusBarHidden: Bool { true }
  override var preferredStatusBarUpdateAnimation: UIStatusBarAnimation { .fade }

  private func presentShareSheet(for url: URL) {
    let share = UIActivityViewController(
      activityItems: [url],
      applicationActivities: nil
    )
    // iPad popover anchor
    if let pop = share.popoverPresentationController {
      pop.sourceView = view
      pop.sourceRect = CGRect(
        x: view.bounds.maxX - 40,
        y: view.safeAreaInsets.top + 20,
        width: 1, height: 1
      )
    }
    present(share, animated: true)
  }
}

// MARK: - Top-level viewer

struct ImageViewerView: View {
  let items: [ImageViewerItem]
  let startIndex: Int
  let onClose: () -> Void
  let onShare: (URL) -> Void

  @State private var selection: Int

  init(
    items: [ImageViewerItem],
    startIndex: Int,
    onClose: @escaping () -> Void,
    onShare: @escaping (URL) -> Void
  ) {
    self.items = items
    self.startIndex = startIndex
    self.onClose = onClose
    self.onShare = onShare
    self._selection = State(initialValue: startIndex)
  }

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()

      TabView(selection: $selection) {
        ForEach(Array(items.enumerated()), id: \.offset) { index, item in
          if item.isVideo {
            ImageViewerVideo(url: item.url, isActive: selection == index)
              .tag(index)
          } else {
            ZoomableImage(url: item.url)
              .tag(index)
          }
        }
      }
      .tabViewStyle(.page(indexDisplayMode: .never))
      .ignoresSafeArea()

      // Top overlay
      VStack {
        HStack {
          ImageViewerCircularButton(systemName: "xmark", action: onClose)
          Spacer()
          if items.count > 1 {
            Text("\(selection + 1) / \(items.count)")
              .font(.system(size: 14, weight: .semibold))
              .foregroundColor(.white)
              .padding(.horizontal, 12)
              .padding(.vertical, 6)
              .modifier(LiquidGlassBackground(shape: Capsule()))
          }
          Spacer()
          ImageViewerCircularButton(systemName: "square.and.arrow.up") {
            if let url = items[safe: selection]?.url {
              onShare(url)
            }
          }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        Spacer()
      }
    }
  }
}

private struct ImageViewerCircularButton: View {
  let systemName: String
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Image(systemName: systemName)
        .font(.system(size: 17, weight: .semibold))
        .foregroundColor(.white)
        .frame(width: 44, height: 44)
        .modifier(LiquidGlassBackground(shape: Circle()))
    }
  }
}

// MARK: - Liquid Glass background (iOS 26+) with translucent fallback
//
// Uses the native `.glassEffect(...)` API on iOS 26 + Xcode 26 toolchain.
// Falls back to a semi-transparent black fill on older systems / toolchains
// so the button stays legible against any photo. Pattern mirrors
// `glass-effect-union` module (see CLAUDE_WORK_PATTERNS.md §6).

private struct LiquidGlassBackground<S: Shape>: ViewModifier {
  let shape: S

  @ViewBuilder
  func body(content: Content) -> some View {
    if #available(iOS 26.0, *) {
#if compiler(>=6.2)
      content.glassEffect(.regular.interactive(), in: shape)
#else
      content.background(shape.fill(Color.black.opacity(0.45)))
#endif
    } else {
      content.background(shape.fill(Color.black.opacity(0.45)))
    }
  }
}

// MARK: - Zoomable Image (UIKit-backed)
//
// SwiftUI lacks first-class pinch-zoom that plays well with TabView paging,
// so we wrap UIScrollView. Image is loaded via URLSession (Content-Type
// driven) to handle URLs without file extensions.

struct ZoomableImage: UIViewRepresentable {
  let url: URL

  func makeUIView(context: Context) -> UIScrollView {
    let scrollView = UIScrollView()
    scrollView.backgroundColor = .clear
    scrollView.minimumZoomScale = 1.0
    scrollView.maximumZoomScale = 4.0
    scrollView.bouncesZoom = true
    scrollView.showsVerticalScrollIndicator = false
    scrollView.showsHorizontalScrollIndicator = false
    scrollView.contentInsetAdjustmentBehavior = .never
    scrollView.delegate = context.coordinator

    let imageView = UIImageView()
    imageView.contentMode = .scaleAspectFit
    imageView.backgroundColor = .clear
    imageView.translatesAutoresizingMaskIntoConstraints = false
    scrollView.addSubview(imageView)
    context.coordinator.imageView = imageView

    NSLayoutConstraint.activate([
      imageView.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor),
      imageView.heightAnchor.constraint(equalTo: scrollView.frameLayoutGuide.heightAnchor),
      imageView.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
      imageView.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
      imageView.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
      imageView.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
    ])

    // Double-tap to toggle 1× / 2.5× zoom
    let doubleTap = UITapGestureRecognizer(
      target: context.coordinator,
      action: #selector(Coordinator.handleDoubleTap(_:))
    )
    doubleTap.numberOfTapsRequired = 2
    scrollView.addGestureRecognizer(doubleTap)

    loadImage(into: imageView)

    return scrollView
  }

  func updateUIView(_ uiView: UIScrollView, context: Context) {}

  func makeCoordinator() -> Coordinator { Coordinator() }

  private func loadImage(into imageView: UIImageView) {
    let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad, timeoutInterval: 30)
    URLSession.shared.dataTask(with: request) { data, _, _ in
      guard let data = data, let image = UIImage(data: data) else { return }
      DispatchQueue.main.async {
        imageView.image = image
      }
    }.resume()
  }

  class Coordinator: NSObject, UIScrollViewDelegate {
    weak var imageView: UIImageView?

    func viewForZooming(in scrollView: UIScrollView) -> UIView? { imageView }

    @objc func handleDoubleTap(_ gesture: UITapGestureRecognizer) {
      guard let scrollView = gesture.view as? UIScrollView else { return }
      if scrollView.zoomScale > scrollView.minimumZoomScale {
        scrollView.setZoomScale(scrollView.minimumZoomScale, animated: true)
      } else {
        let target: CGFloat = 2.5
        let pt = gesture.location(in: imageView)
        let size = scrollView.bounds.size
        let w = size.width / target
        let h = size.height / target
        let rect = CGRect(x: pt.x - w / 2, y: pt.y - h / 2, width: w, height: h)
        scrollView.zoom(to: rect, animated: true)
      }
    }
  }
}

// MARK: - Video player

struct ImageViewerVideo: UIViewControllerRepresentable {
  let url: URL
  let isActive: Bool

  func makeUIViewController(context: Context) -> AVPlayerViewController {
    let controller = AVPlayerViewController()
    controller.view.backgroundColor = .black
    let player = AVPlayer(url: url)
    controller.player = player
    controller.showsPlaybackControls = true
    controller.videoGravity = .resizeAspect
    if isActive { player.play() }
    return controller
  }

  func updateUIViewController(_ uiViewController: AVPlayerViewController, context: Context) {
    if isActive {
      uiViewController.player?.play()
    } else {
      uiViewController.player?.pause()
    }
  }
}

// MARK: - Helpers

private extension Array {
  subscript(safe index: Int) -> Element? {
    indices.contains(index) ? self[index] : nil
  }
}
