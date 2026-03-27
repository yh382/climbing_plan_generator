require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'StatusBarEdge'
  s.version        = package['version']
  s.summary        = 'iOS 26 scroll edge blur effect for status bar area'
  s.homepage       = 'https://github.com/example'
  s.license        = 'MIT'
  s.author         = 'ClimMate'
  s.source         = { git: '' }
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.0'
  s.source_files   = '**/*.swift'
  s.dependency 'ExpoModulesCore'
end
