import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Dropdown } from "../../components/ui/Dropdown.jsx";
import { Input } from "../../components/ui/Form.jsx";
import { Pagination, usePagination } from "../../components/ui/Pagination.jsx";
import { DataTable, EmptyState } from "../../components/ui/Table.jsx";
import { gradeOptions } from "../../data/mockData.js";
import { getRequests } from "../../services/requestsApi.js";
import { formatDate, gradeBadge, shortId, statusBadge, statusLabels } from "../../utils/formatters.js";

const statusFilterOptions = ["Активен", "Черновик", "Закрыт"];
const statusByLabel = { Активен: "active", Черновик: "draft", Закрыт: "closed" };

export function RequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [grades, setGrades] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          grade: grades.length === 1 ? grades[0] : undefined,
          status: statuses.length === 1 ? statusByLabel[statuses[0]] : undefined,
          created_from: dateFrom || undefined,
          created_to: dateTo || undefined,
        };
        const result = await getRequests(params);
        if (!ignore) setRequests(result.items);
      } catch (caught) {
        if (!ignore) setError(caught.message || "Не удалось загрузить запросы.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [dateFrom, dateTo, grades, statuses]);

  const filtered = useMemo(() => requests.filter((request) => {
    const statusValues = statuses.map((status) => statusByLabel[status]);
    // TODO: убрать frontend-фильтрацию, если backend добавит поддержку множественных grade/status query params.
    return (!grades.length || grades.includes(request.grade))
      && (!statusValues.length || statusValues.includes(request.status))
      && (!dateFrom || request.createdAt >= dateFrom)
      && (!dateTo || request.createdAt <= dateTo);
  }), [dateFrom, dateTo, grades, requests, statuses]);
  const pagination = usePagination(filtered);

  return (
    <>
      <div className="page-head">
        <div><h1>Запросы</h1><p>Создание и управление требованиями заказчика</p></div>
        <Button icon="bi-plus-lg" onClick={() => navigate("/requests/new")}>Создать запрос</Button>
      </div>
      <Card>
        <div className="filters request-filters">
          <Dropdown label="Грейд" options={gradeOptions} selected={grades} onChange={setGrades} />
          <Dropdown label="Статус" options={statusFilterOptions} selected={statuses} onChange={setStatuses} />
          <div className="period-filter">
            <span>Период создания</span>
            <div className="period-inputs">
              <Input aria-label="Дата от" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              <span>—</span>
              <Input aria-label="Дата до" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
          </div>
        </div>
        {error ? <div className="alert danger">{error}</div> : null}
        {loading ? <div className="loading-line inline">Загружаем запросы...</div> : null}
        {!loading && filtered.length ? (
          <DataTable>
            <thead><tr><th>ID</th><th>Должность</th><th>Грейд</th><th>Дата создания</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>
              {pagination.pageItems.map((request) => (
                <tr key={request.id}>
                  <td>{shortId(request.id)}</td>
                  <td className="entity-name">{request.position}</td>
                  <td><Badge tone={gradeBadge(request.grade)}>{request.grade}</Badge></td>
                  <td>{formatDate(request.createdAt)}</td>
                  <td><Badge tone={statusBadge(request.status)}>{statusLabels[request.status]}</Badge></td>
                  <td><Button variant="secondary" icon="bi-eye" onClick={() => navigate(`/requests/${request.id}`)}>Открыть</Button></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : !loading ? <EmptyState title="Запросы не найдены" text="Попробуйте сбросить фильтры или повторить позже." /> : null}
        {!loading ? (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalPages={pagination.totalPages}
            start={pagination.start}
            end={pagination.end}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        ) : null}
      </Card>
    </>
  );
}



