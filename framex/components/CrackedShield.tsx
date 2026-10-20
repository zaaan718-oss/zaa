export default function CrackedShield({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      {/* garis retak di tengah perisai */}
      <path d="M12 2v6l-3 3 4 2-2 4 3-3" opacity="0.75" />
    </svg>
  );
}
