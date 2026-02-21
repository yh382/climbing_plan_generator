// src/features/profile/components/badgessection/mockBadges.ts
import type { Badge } from "./types";

export const mockBadges: Badge[] = [
  // -------- challenge (1) limit/solid v1-v15 --------
  {
    id: "c_limit_v",
    title: "Limit (V)",
    section: "challenge",
    status: "locked",
    progress: 0.35,
    requirement: "Complete 3+ routes at your limit grade (V1–V15).",
  },
  {
    id: "c_solid_v",
    title: "Solid (V)",
    section: "challenge",
    status: "locked",
    progress: 0.12,
    requirement: "Complete 10+ routes at your solid grade (V1–V15).",
  },

  // -------- challenge (1) limit/solid 5.6-5.13d --------
  {
    id: "c_limit_y",
    title: "Limit (YDS)",
    section: "challenge",
    status: "locked",
    progress: 0.6,
    requirement: "Complete 3+ routes at your limit grade (5.6–5.13d).",
  },
  {
    id: "c_solid_y",
    title: "Solid (YDS)",
    section: "challenge",
    status: "locked",
    progress: 0.22,
    requirement: "Complete 10+ routes at your solid grade (5.6–5.13d).",
  },

  // -------- challenge (2) flash --------
  {
    id: "c_flash_v",
    title: "Flash (V)",
    section: "challenge",
    status: "locked",
    progress: 0.8,
    requirement: "Flash 5+ routes at your flash grade (V1–V15).",
  },
  {
    id: "c_flash_y",
    title: "Flash (YDS)",
    section: "challenge",
    status: "locked",
    progress: 0.1,
    requirement: "Flash 5+ routes at your flash grade (5.6–5.13d).",
  },

  // -------- milestone (3) total sends --------
  {
    id: "m_sends_100",
    title: "Sends 100",
    section: "milestone",
    status: "unlocked",
    requirement: "Total sends ≥ 100.",
  },
  {
    id: "m_sends_500",
    title: "Sends 500",
    section: "milestone",
    status: "locked",
    progress: 0.42,
    requirement: "Total sends ≥ 500.",
  },
  {
    id: "m_sends_1000",
    title: "Sends 1000!",
    section: "milestone",
    status: "locked",
    progress: 0.18,
    requirement: "Total sends ≥ 1000.",
  },

  // -------- milestone (4) training completions --------
  {
    id: "m_train_1",
    title: "Training 1",
    section: "milestone",
    status: "unlocked",
    requirement: "Complete your first training plan.",
  },
  {
    id: "m_train_10",
    title: "Training 10",
    section: "milestone",
    status: "locked",
    progress: 0.5,
    requirement: "Complete 10 training plans.",
  },
  {
    id: "m_train_50",
    title: "Training 50",
    section: "milestone",
    status: "locked",
    progress: 0.08,
    requirement: "Complete 50 training plans.",
  },

  // -------- milestone (5) writer uploads --------
  {
    id: "m_writer_1",
    title: "Writer 1",
    section: "milestone",
    status: "locked",
    progress: 0.0,
    requirement: "Upload your first custom training plan.",
  },
  {
    id: "m_writer_5",
    title: "Writer 5",
    section: "milestone",
    status: "locked",
    progress: 0.2,
    requirement: "Upload 5 training plans.",
  },
  {
    id: "m_writer_10",
    title: "Writer 10",
    section: "milestone",
    status: "locked",
    progress: 0.1,
    requirement: "Upload 10 training plans.",
  },

  // -------- influence (6) followers/uses --------
  {
    id: "i_1",
    title: "Influence 1",
    section: "influence",
    status: "locked",
    progress: 0.0,
    requirement: "Your plan is followed for the first time.",
  },
  {
    id: "i_100",
    title: "Influence 100",
    section: "influence",
    status: "locked",
    progress: 0.05,
    requirement: "Your plans are followed 100 times.",
  },
  {
    id: "i_1000",
    title: "Influence 1000",
    section: "influence",
    status: "locked",
    progress: 0.01,
    requirement: "Your plans are followed 1000 times.",
  },
];
