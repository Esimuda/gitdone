import Link from "next/link";
import { Wordmark } from "@/components/logo";
import { PRODUCT_NAME } from "@/config/brand";
import { STAGE_IDS } from "@/lib/data/types";
import { STAGE_LABEL } from "@/lib/data/stages";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark className="text-sm" />
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            A release hub and mission control for communities that ship from one GitLab issue, on the Duo Agent Platform.
          </p>
        </div>
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Move</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/mission" className="hover:text-primary">
                Mission control
              </Link>
            </li>
            <li>
              <Link href="/releases" className="hover:text-primary">
                Releases
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Nine stages</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {STAGE_IDS.map((id) => STAGE_LABEL[id]).join(" · ")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Rollback sits after Monitor when a deploy degrades.</p>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">MIT license · {PRODUCT_NAME}</p>
      </div>
    </footer>
  );
}
