import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function PlayerField({ label, value, onChange }) {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      try {
        setOptions(await api.searchPlayers(value.trim()));
      } catch {
        setOptions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [value, open]);

  const visible = options.filter(
    (o) => o.name.toLowerCase() !== value.trim().toLowerCase()
  );

  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="text"
        value={value}
        maxLength={80}
        placeholder="Player name"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {open && visible.length > 0 && (
        <ul className="suggest-list">
          {visible.map((o) => (
            <li
              key={o.id}
              className="suggest-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.name);
                setOpen(false);
              }}
            >
              {o.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
