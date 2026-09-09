/** Shared development credit for public pages and the pre-launch screen. */
export function DeveloperCredit() {
  return (
    <a
      href="https://fluqo.ai"
      dir="rtl"
      lang="ar"
      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <span>تم التطوير بواسطة</span>
      <bdi className="font-medium" dir="ltr">
        Fluqo.ai
      </bdi>
    </a>
  );
}
