// src/features/coachChat/utils/mockCoachEngine.ts
import type { CoachState, DraftPlan } from "../types";

function nextId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildPlanFromText(userText: string): DraftPlan {
  // 超轻 mock：你后面接真模型时，这里会替换成后端返回的结构
  const sessions = /(\d)\s*(day|days|次|天)/i.test(userText) ? Number(RegExp.$1) : 3;
  const minutes = /(\d{2,3})\s*(min|mins|分钟)/i.test(userText) ? Number(RegExp.$1) : 60;

  return {
    title: "Draft Plan",
    subtitle: `Active • Week 1 / 4 • ${sessions}x/week • ${minutes}min`,
    weekCount: 4,
    sessionsPerWeek: sessions,
    bullets: [
      "Warm-up + easy climbs (10–15min)",
      "Main: strength + power (20–25min)",
      "Accessory: core + shoulder (10–15min)",
      "Cool down + mobility (5–10min)",
    ],
  };
}

export function coachReply(prev: CoachState, userText: string) {
  const id = nextId();

  // 简化的阶段推进：1收集→2草案→3匹配→4排课→5确认
  let step = prev.step;
  let draftPlan = prev.draftPlan;

  let reply = "";

  if (step === 1) {
    // 如果用户信息足够，就推进到草案
    const enough =
      /v\d+|5\.\d+|boulder|route|lead|top rope|目标|目标是|weekly|每周|次|天/i.test(userText);

    if (enough) {
      step = 2;
      draftPlan = buildPlanFromText(userText);
      reply =
        "Got it. I’ll generate a draft plan now. You can tweak difficulty, swap exercises, or ask why each block exists.";
    } else {
      reply =
        "To personalize your plan, tell me: your climbing level (V grade or YDS), your goal (strength / endurance / technique), and how many days per week you can train.";
    }
  } else if (step === 2) {
    step = 3;
    reply =
      "Draft is ready. Next I’ll match blocks to exercises from your library. Want more finger strength, power, or endurance emphasis?";
  } else if (step === 3) {
    step = 4;
    reply =
      "Great. I’ll schedule sessions across the week with progression + recovery. Any injury history or time limits per session?";
  } else if (step === 4) {
    step = 5;
    reply =
      "All set. Review the plan preview at the top. If it looks good, say “publish” or tell me what to change.";
  } else {
    // step 5
    if (/publish|发布|确认|ok|looks good/i.test(userText)) {
      reply = "✅ Published. Your plan is now in your plan library.";
    } else if (/easier|降低|简单|harder|提高|更难|swap|换/i.test(userText)) {
      reply =
        "Sure — tell me which session/block you want to change (e.g., Session 2 Main), and whether you want easier/harder or a different exercise.";
    } else {
      reply = "What would you like to adjust — difficulty, exercise selection, or weekly schedule?";
    }
  }

  return {
    step,
    draftPlan,
    assistantMessage: {
      id,
      role: "assistant" as const,
      text: reply,
      ts: Date.now(),
    },
  };
}
