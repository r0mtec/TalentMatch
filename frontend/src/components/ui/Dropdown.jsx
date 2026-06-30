import { useState } from "react";

export function Dropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const title = selected.length ? selected.join(", ") : "Все";

  const toggle = (option) => {
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };

  return (
    <div className="dropdown">
      <button type="button" className="control dropdown-toggle" onClick={() => setOpen((value) => !value)}>
        <span>{label}: {title}</span>
        <span>▾</span>
      </button>
      {open ? (
        <div className="dropdown-menu">
          {options.map((option) => (
            <label key={option} className="check-row">
              <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
              {option}
            </label>
          ))}
          <button type="button" className="link-button" onClick={() => onChange([])}>Сбросить</button>
        </div>
      ) : null}
    </div>
  );
}
