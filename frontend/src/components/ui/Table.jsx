export function DataTable({ children }) {
  return (
    <div className="table-wrap">
      <table className="data-table">{children}</table>
    </div>
  );
}

export function EmptyState({ title = "Нет данных", text = "Измените фильтры или добавьте новую запись." }) {
  return (
    <div className="empty-state">
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
