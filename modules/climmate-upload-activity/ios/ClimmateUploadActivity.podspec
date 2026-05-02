require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ClimmateUploadActivity'
  s.version        = package['version']
  s.summary        = 'ClimMate upload Live Activity bridge (ActivityKit)'
  s.description    = 'Live Activity bridge for media upload progress with Dynamic Island compact UI.'
  s.license        = 'MIT'
  s.author         = 'ClimMate'
  s.homepage       = 'https://github.com/example'
  s.source         = { git: '' }
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.9'
  # UploadAttributes.swift is glob-included so it compiles into the main app
  # target and stays in sync with the widget extension's copy via
  # plugins/withCustomWidgetFiles.js.
  s.source_files   = '**/*.{h,m,swift}'
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
