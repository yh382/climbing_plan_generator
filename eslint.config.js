// https://docs.expo.dev/guides/using-eslint/
//
// CF 债务窗新增：架构边界机器强制（详见 CLAUDE.md §State / API）
//   error — store 禁跨 store import；app/** + store 禁直调 apiClient
//   warn  — feature 禁交叉 import（存量 15+，挡新增）；no-color-literals（HEX-SWEEP 输入）
const fs = require('fs');
const path = require('path');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const importPlugin = require('eslint-plugin-import');
const reactNative = require('eslint-plugin-react-native');

// Store 文件三处分布：src/store + feature 层 store/ + feature 层 state/
const STORE_GLOBS = [
  './src/store/**/*',
  './src/features/*/store/**/*',
  './src/features/*/state/**/*',
];

// Layering exemption（CLAUDE.md 明示）：
//  - useAuthStore: token plumbing，与 apiClient 同层（setApiAuthToken 注入）
//  - useLogsStore: sessions/climb-logs 同步机器的 api 直调留给 BACKLOG LOGS-SPLIT
const APICLIENT_EXEMPT_STORES = [
  'src/store/useAuthStore.ts',
  'src/store/useLogsStore.ts',
];

const CROSS_STORE_ZONE = {
  target: STORE_GLOBS,
  from: STORE_GLOBS,
  message:
    'Stores must not import each other — compose via a hook or src/services/* (see CLAUDE.md).',
};

const NO_APICLIENT_ZONES = [
  {
    target: ['./app/**/*', ...STORE_GLOBS],
    from: './src/lib/apiClient.ts',
    message:
      'Do not call apiClient directly from routes/stores — go through the feature api.ts (see CLAUDE.md).',
  },
];

// Feature 交叉 import：每个 feature 一个 zone（target=该 feature，from=其余 features）
const FEATURES = fs
  .readdirSync(path.join(__dirname, 'src/features'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const CROSS_FEATURE_ZONES = FEATURES.map((f) => ({
  target: `./src/features/${f}`,
  from: './src/features',
  except: [`./${f}`],
  message:
    'Cross-feature import — lift shared code to src/components/shared, src/services, or src/lib instead of coupling features.',
}));

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'scripts/*', 'widgets/*'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    // 同一 plugin 注册两个命名空间：no-restricted-paths 单 rule 只有一档 severity，
    // error 边界（store/apiClient）与 warn 边界（feature 交叉）必须拆两个 rule 实例。
    plugins: {
      'import-warn': importPlugin,
      'react-native': reactNative,
    },
    settings: {
      // expo config 靠后的 settings block 会把 import/resolver 覆盖成 node-only；
      // 这里作为最后一个 block 收口：typescript 解析 @/* alias + baseUrl 裸路径。
      'import/resolver': {
        typescript: true,
        node: {
          extensions: [
            '.ios.ts', '.ios.tsx', '.android.ts', '.android.tsx',
            '.native.ts', '.native.tsx', '.web.ts', '.web.tsx',
            '.ts', '.tsx', '.d.ts', '.js', '.jsx', '.mjs', '.cjs', '.json',
          ],
        },
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        { zones: [CROSS_STORE_ZONE, ...NO_APICLIENT_ZONES] },
      ],
      'import-warn/no-restricted-paths': [
        'warn',
        { zones: CROSS_FEATURE_ZONES },
      ],
      'react-native/no-color-literals': 'warn',
    },
  },
  {
    // 豁免文件只保留跨 store 禁令，放行 apiClient（理由见上）
    files: APICLIENT_EXEMPT_STORES,
    rules: {
      'import/no-restricted-paths': ['error', { zones: [CROSS_STORE_ZONE] }],
    },
  },
  {
    // 存量降级（CF 窗实测）：CN-only 遗留屏在 ~60 个 hooks 之上有 `if (!isCN)
    // return null` 提前 return。运行时安全（isCN 设备恒定），真正修复 = 组件拆分，
    // 归 Map 重构窗（BACKLOG CRAG-MAP-HOOKS）。新文件不受此豁免。
    files: ['app/outdoor/crag-map.tsx'],
    rules: {
      'react-hooks/rules-of-hooks': 'warn',
    },
  },
  {
    // 本配置文件自身：CommonJS 全局
    files: ['eslint.config.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', require: 'readonly', module: 'readonly' },
    },
  },
]);
