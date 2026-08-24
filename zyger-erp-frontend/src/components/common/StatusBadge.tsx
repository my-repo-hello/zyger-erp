interface StatusBadgeProps {
  status: string;
  variant?: Record<string, { color: string; bg: string }>;
}

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  if (variant && variant[status]) {
    const v = variant[status];
    return (
      <span
        className="bdg"
        style={{ background: v.bg, color: v.color, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}
      >
        {status}
      </span>
    );
  }
  return <span className={`bdg bdg-${status}`}>{status}</span>;
}
