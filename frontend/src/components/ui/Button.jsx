export function Button({ variant = "primary", className = "", icon, children, ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {icon ? <i className={`bi ${icon}`} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
