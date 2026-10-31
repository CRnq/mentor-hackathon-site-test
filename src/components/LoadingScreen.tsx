import type { Ref } from "react";
import { AsciiLogo } from "./AsciiLogo";

export function LoadingScreen({
  loaderRef,
}: {
  loaderRef: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={loaderRef}
      className="brand-loader"
      role="status"
      aria-live="polite"
      aria-label="読み込み中"
    >
      <div className="brand-loader-mark" aria-hidden="true">
        <AsciiLogo compact />
      </div>
      <div className="brand-loader-caption">
        <span>MENTOR HACKATHON</span>
        <span>2026</span>
      </div>
      <div className="brand-loader-status" aria-hidden="true">
        <i />
        <span>LOADING</span>
        <i />
      </div>
    </div>
  );
}
