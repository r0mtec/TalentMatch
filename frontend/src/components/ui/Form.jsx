export function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

export function Input(props) {
  return <input className="control" {...props} />;
}

export function Textarea(props) {
  return <textarea className="control textarea" {...props} />;
}

export function Select(props) {
  return <select className="control" {...props} />;
}
