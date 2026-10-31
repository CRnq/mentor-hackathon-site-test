export function BrandLogo({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}logo_block_color.svg`}
      width="218"
      height="219"
      alt={decorative ? "" : "全国メンターハッカソン"}
      decoding="async"
    />
  );
}
