require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'NativeChatScroll'
  s.version        = package['version']
  s.summary        = 'SwiftUI ScrollView with iOS 26 scroll edge effect for chat'
  s.homepage       = 'https://github.com/example'
  s.license        = 'MIT'
  s.author         = 'ClimMate'
  s.source         = { git: '' }
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.0'
  s.source_files   = '**/*.swift'
  s.dependency 'ExpoModulesCore'
  s.dependency 'ExpoUI'
end
