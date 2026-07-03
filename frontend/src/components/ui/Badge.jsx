export function Badge({ children, tone = "neutral", ...props }) {
  return <span className={`badge ${tone}`} {...props}>{children}</span>;
}
