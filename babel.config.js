// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',      // ← Expo Router 的 babel 插件要保留
      ['module-resolver', {
        root: ['./'],
        alias: {
          '@': './app',          // ← 关键：把 @ 指向 app 目录
          '@components': './app/components',
          '@contexts': './app/contexts',
          '@lib': './app/lib',
        },
        extensions: ['.tsx', '.ts', '.js', '.json'],
      }],
    ],
  };
};
