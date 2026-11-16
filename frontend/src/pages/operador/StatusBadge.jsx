const classes = {
  Normal: "normal",
  Alerta: "alerta",
  Crítico: "critico",
  Critico: "critico",
};

export function classeDoStatus(status) {
  return classes[status] ?? "normal";
}

export default function StatusBadge({ status, texto }) {
  return (
    <span className={`op-status ${classeDoStatus(status)}`}>
      <i />
      {texto || status}
    </span>
  );
}