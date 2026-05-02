require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ClimmateImageViewer'
  s.version        = package['version']
  s.summary        = 'ClimMate QuickLook image/video previewer'
  s.description    = 'QLPreviewController bridge for full-screen media preview (images, videos, PDFs).'
  s.license        = 'MIT'
  s.author         = 'ClimMate'
  s.homepage       = 'https://github.com/example'
  s.source         = { git: '' }
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.9'
  s.source_files   = '**/*.{h,m,swift}'
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
