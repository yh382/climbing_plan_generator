// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@": "./src",                 // <— 关键：@ 指向 src
            "@/features": "./src/features",
            "@/store": "./src/store",
            "@/lib": "./src/lib",
            "@/contexts": "./src/contexts",
            "@/components": "./src/components",
            "@/assets": "./app/assets"    // 资源仍在 app 下
          },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
        }
      ],
      // ⚠️ reanimated 插件必须是独立项，且置于最后
      "react-native-reanimated/plugin"
    ],
  };
};


