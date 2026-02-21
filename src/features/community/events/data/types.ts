// src/features/community/events/data/types.ts
import type { Ionicons } from "@expo/vector-icons";

export type EventListItem = {
  id: string;
  rank?: number;
  primary: string;      // 例如：报名者名字 / 品牌名 / 鞋款名
  secondary?: string;   // 例如：@username / size / 备注
  trailing?: string;    // 例如：积分 / 票数 / 数量
};

export type EventInfoCardModel = {
  id: string;
  title: string; // 可自定义
  showRank?: boolean; // 是否显示 rank
  trailingIcon?: keyof typeof Ionicons.glyphMap; // 可选（例如 settings）
  items: EventListItem[];
};

export type EventDetailModel = {
  id: string;
  title: string;
  organizerName: string;

  coverImage?: any;
  tags?: string[];

  // 日期范围：start/end（end 可以为空=单日）
  startDateISO: string;
  endDateISO?: string;

  // 可选：精确到时刻（同日活动尤其常用）
  startTimeISO?: string;
  endTimeISO?: string;

  locationName?: string;
  locationDetail?: string;

  rewardsLine?: string; // 可选
  description?: string;

  display?: {
    showDate?: boolean;
    showTime?: boolean;
    showLocation?: boolean;
    showRewards?: boolean;
  };

  cards?: EventInfoCardModel[];
};
