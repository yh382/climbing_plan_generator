require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ClimmateUploadToast'
  s.version        = package['version']
  s.summary        = 'In-app upload progress capsule (SwiftUI + liquid glass)'
  s.description    = 'Floating capsule shown above the tab bar while the app is foreground; mirrors the upload Live Activity that takes over once the user backgrounds the app.'
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
