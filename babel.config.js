module.exports = function(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@": "./app", // 关键：@ 指向 app 目录
          },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
          
        },
        "react-native-reanimated/plugin",
      ],
    ],
  };
};

