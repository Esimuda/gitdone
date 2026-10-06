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
  type LucideIcon,
} from "lucide-react";
import type { StageId } from "@/lib/data/types";

export const STAGE_ICON: Record<StageId, LucideIcon> = {
  plan: Compass,
  create: GitBranch,
  verify: CircleCheck,
  package: Package,
  secure: Shield,
  release: Tag,
  configure: Cloud,
  monitor: Activity,
  govern: Scale,
};
