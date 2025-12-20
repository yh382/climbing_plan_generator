// src/types/community.ts

import { PlanV3Session } from "./plan";

// 用户信息
export interface UserProfile {
  id: string;
  username: string;
  avatar: string; 
  level?: string; // e.g., "V5", "5.11c"
  homeGym?: string;
}

// 附件类型：帖子挂载的“干货”
export interface PostAttachment {
  type: 'finished_session' | 'shared_plan' | 'log'; // 是“晒成绩”还是“分享计划”
  id: string;        // 对应的 session_id 或 plan_id
  title: string;     // 计划标题，如 "Finger Power V2"
  subtitle: string;  // 描述，如 "60m · Hard · 5 exercises"
  metrics?: {        // 如果是晒成绩，显示消耗/完成度
    label: string;
    value: string;
  }[];
}

// 帖子本体
export interface FeedPost {
  id: string;
  user: UserProfile;
  timestamp: string;
  
  content: string;    // 正文
  images?: string[];  // 图片/视频
  
  attachment?: PostAttachment; // [核心] 关联的计划/记录

  // 互动数据
  likes: number;
  comments: number;
  isLiked: boolean;
  isSaved: boolean;   // 是否收藏了该计划
}