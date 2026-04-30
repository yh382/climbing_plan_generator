require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ClimmateActivityRing'
  s.version        = package['version']
  s.summary        = 'Apple Fitness-style activity rings drawn in SwiftUI (gradient + overlap + tip shadow + Apple Fitness stacked overlap for calendar variant).'
  s.homepage       = 'https://github.com/example'
  s.license        = 'MIT'
  s.author         = 'ClimMate'
  s.source         = { git: '' }
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.0'
  s.source_files   = '**/*.swift'
  s.dependency 'ExpoModulesCore'
end
