require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ClimmateLiveActivity'
  s.version        = package['version']
  s.summary        = 'ClimMate Live Activity bridge (ActivityKit)'
  s.description    = 'Direct ActivityKit bridge for climbing session Live Activities.'
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
