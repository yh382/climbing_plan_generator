require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ClimmateCharts'
  s.version        = package['version']
  s.summary        = 'Apple Charts framework wrapper (grade pyramid + radar in AV1; training volume in AV2).'
  s.homepage       = 'https://github.com/example'
  s.license        = 'MIT'
  s.author         = 'ClimMate'
  s.source         = { git: '' }
  s.platform       = :ios, '17.0'
  s.swift_version  = '5.0'
  s.source_files   = '**/*.swift'
  s.dependency 'ExpoModulesCore'
end
