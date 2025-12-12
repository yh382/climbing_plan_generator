// src/components/FloatingTabBar.constants.ts

export const FLOATING_TAB_BAR_PRIMARY_HEIGHT = 32;
export const FLOATING_TAB_BAR_ICON_BUTTON_SIZE = 35;

// [修改] 底部留出 12px 缝隙 (悬浮感)
export const FLOATING_TAB_BAR_BOTTOM_GAP = 10; 

// [修改] 左右留出 12px 缝隙
export const FLOATING_TAB_BAR_GYMS_SIDE_MARGIN = 10; 
export const FLOATING_TAB_BAR_SIDE_MARGIN = 10;

// [修改] 减小垂直内边距 (从 12 改为 8)，让 TabBar 更窄，少遮挡内容
export const FLOATING_TAB_BAR_VERTICAL_PADDING = 6;

// 自动计算总高度 (Gyms 页面会用到这个值来定位 BottomSheet)
export const FLOATING_TAB_BAR_TOTAL_HEIGHT =
  FLOATING_TAB_BAR_PRIMARY_HEIGHT + FLOATING_TAB_BAR_VERTICAL_PADDING * 2;

export const FLOATING_TAB_BAR_STACK_SPACING =
  FLOATING_TAB_BAR_TOTAL_HEIGHT + FLOATING_TAB_BAR_BOTTOM_GAP - 1;