Pod::Spec.new do |s|
  s.name           = 'NativeInput'
  s.version        = '1.0.0'
  s.summary        = 'Native UISearchBar and UITextView wrappers for Expo'
  s.description    = 'Provides NativeSearchBar (UISearchBar) and NativeTextView (UITextView) as React Native views'
  s.homepage       = 'https://github.com/user/native-input'
  s.license        = 'MIT'
  s.author         = 'ClimMate'
  s.platform       = :ios, '15.1'
  s.source         = { git: '' }
  s.swift_version  = '5.0'
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
end
