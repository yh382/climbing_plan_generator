// src/store/useActiveWorkoutStore.ts
import { create } from 'zustand';

interface ActiveWorkoutState {
  isActive: boolean;      // 是否有正在进行的训练
  isMinimized: boolean;   // 是否处于最小化悬浮状态
  isPaused: boolean;      // 是否暂停
  seconds: number;        // 当前秒数
  
  sessionData: any[];     // 训练记录数据
  sessionTitle: string;   // 训练标题

  // Actions
  startWorkout: (title: string, data: any[]) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  minimizeWorkout: () => void;
  maximizeWorkout: () => void;
  finishWorkout: () => void;
  tick: () => void;       // 计时器心跳
  updateSessionData: (data: any[]) => void;
}

const useActiveWorkoutStore = create<ActiveWorkoutState>((set) => ({
  isActive: false,
  isMinimized: false,
  isPaused: false,
  seconds: 0,
  sessionData: [],
  sessionTitle: "",

  startWorkout: (title, data) => set({ 
    isActive: true, 
    isMinimized: false, 
    isPaused: false, 
    seconds: 0, 
    sessionTitle: title,
    sessionData: data 
  }),

  pauseWorkout: () => set({ isPaused: true }),
  resumeWorkout: () => set({ isPaused: false }),
  
  minimizeWorkout: () => set({ isMinimized: true }), // 最小化
  maximizeWorkout: () => set({ isMinimized: false }), // 恢复全屏
  
  finishWorkout: () => set({ isActive: false, isMinimized: false, seconds: 0 }),
  
  tick: () => set((state) => ({ 
    seconds: state.isActive && !state.isPaused ? state.seconds + 1 : state.seconds 
  })),

  updateSessionData: (data) => set({ sessionData: data }),
}));

export default useActiveWorkoutStore;