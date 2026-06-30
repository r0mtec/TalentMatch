import { useMemo, useState } from "react";
import { Button } from "./Button.jsx";
import { Select } from "./Form.jsx";

export function usePagination(items, initialPageSize = 5) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = items.length ? (safePage - 1) * pageSize : 0;
  const end = Math.min(start + pageSize, items.length);
  const pageItems = useMemo(() => items.slice(start, end), [end, items, start]);

  const changePageSize = (nextSize) => {
    setPageSize(Number(nextSize));
    setPage(1);
  };

  return {
    page: safePage,
    pageSize,
    totalPages,
    start,
    end,
    total: items.length,
    pageItems,
    setPage,
    setPageSize: changePageSize,
  };
}

export function Pagination({ page, pageSize, totalPages, start, end, total, onPageChange, onPageSizeChange }) {
  if (!total) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="pagination">
      <span>Показано {start + 1}–{end} из {total}</span>
      <div className="pagination-controls">
        <Select value={pageSize} onChange={(event) => onPageSizeChange(event.target.value)} aria-label="Размер страницы">
          {[5, 10, 20].map((size) => <option key={size} value={size}>{size} на странице</option>)}
        </Select>
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Назад</Button>
        <div className="page-numbers">
          {pages.map((item) => (
            <button key={item} type="button" className={item === page ? "active" : ""} onClick={() => onPageChange(item)}>
              {item}
            </button>
          ))}
        </div>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Вперёд</Button>
      </div>
    </div>
  );
}
