export type BlogPost = {
  id: string;
  title: string;
  author: string;
  publishedAt: string; // ISO or display-ready
  coverImageUri?: string | null; // 预留接口：主办方/官方可自定义
  tags?: string[];
  excerpt?: string;
  content: Array<
    | { type: "p"; text: string }
    | { type: "img"; uri?: string | null; caption?: string }
    | { type: "h2"; text: string }
  >;
};

export const MOCK_BLOGS: BlogPost[] = [
  {
    id: "finger-care-001",
    title: "Finger Care 101: 训练后手指养护指南",
    author: "climMate Team",
    publishedAt: "2026-02-05",
    coverImageUri: null,
    tags: ["Recovery", "Injury Prevention"],
    excerpt: "从皮肤护理到肌腱负荷管理：帮你把训练收益留住。",
    content: [
      { type: "p", text: "攀岩进步的前提是：你能持续训练，而不是被小伤反复打断。" },
      { type: "h2", text: "1) 皮肤与角质管理" },
      { type: "p", text: "训练后清洁双手，薄涂保湿；避免在伤口未愈合时做高摩擦极限指力。" },
      { type: "img", uri: null, caption: "（mock 图片位：未来用官方配图/图床链接）" },
      { type: "h2", text: "2) 肌腱/滑车负荷" },
      { type: "p", text: "如果出现局部刺痛或“点痛”，优先降负荷 + 增加休息，必要时就医评估。" },
    ],
  },
  {
    id: "warmup-002",
    title: "Warm-up Blueprint: 10 分钟热身模板",
    author: "Paddi",
    publishedAt: "2026-01-28",
    coverImageUri: null,
    tags: ["Warm-up", "Performance"],
    excerpt: "不靠灵感热身：上墙前 10 分钟做对这几步。",
    content: [
      { type: "p", text: "热身不是“随便爬几条”，而是让神经、肌腱、肩肘腕进入可输出状态。" },
      { type: "h2", text: "模板" },
      { type: "p", text: "1) 肩胛激活 2) 前臂泵感 3) 逐级上强度 4) 目标动作预演。" },
    ],
  },
  {
    id: "tape-003",
    title: "How to Tape: 常见手指贴扎场景与误区",
    author: "climMate Team",
    publishedAt: "2025-12-12",
    coverImageUri: null,
    tags: ["Injury Prevention"],
    excerpt: "贴扎不是护身符：什么情况下有用、怎么贴更合理。",
    content: [
      { type: "p", text: "贴扎更像“提醒你别逞强”的反馈工具，而不是让你无视疼痛继续上强度。" },
      { type: "h2", text: "什么时候考虑贴扎" },
      { type: "p", text: "轻微不适期、恢复期、或者你已明确要降低训练强度但仍需上墙。" },
    ],
  },
];
