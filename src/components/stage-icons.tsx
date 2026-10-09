import {
  Activity,
  CircleCheck,
  Cloud,
  Compass,
  GitBranch,
  Package,
  Scale,
  Shield,
  Tag,
  Undo2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { StageId } from "@/lib/data/types";

export const STAGE_ICON: Record<StageId, LucideIcon> = {
  plan: Compass,
  create: GitBranch,
  verify: CircleCheck,
  package: Package,
  secure: Shield,
  approval: UserCheck,
  release: Tag,
  configure: Cloud,
  monitor: Activity,
  govern: Scale,
  rollback: Undo2,
};
