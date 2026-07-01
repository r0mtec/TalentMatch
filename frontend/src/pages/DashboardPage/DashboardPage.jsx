import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { DataTable, EmptyState } from "../../components/ui/Table.jsx";
import { getAssessmentsByRequest } from "../../services/assessmentsApi.js";
import { getCandidates } from "../../services/candidatesApi.js";
import { attachAssessmentsToCandidates, getCandidateAssessments } from "../../services/mappers/candidateMapper.js";
import { getRequests } from "../../services/requestsApi.js";
import { formatDate, gradeBadge, shortId, statusBadge, statusLabels } from "../../utils/formatters.js";

export function DashboardPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [candidatesError, setCandidatesError] = useState("");

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setRequestsLoading(true);
      setRequestsError("");
      setCandidatesError("");
      try {
        const [requestResult, candidateItems] = await Promise.all([
          getRequests({ per_page: 50 }),
          getCandidates({ per_page: 50 }),
        ]);
        const requestItems = requestResult.items || [];
        const assessmentLists = await Promise.all(requestItems.map((request) => getAssessmentsByRequest(request.id)));
        if (!ignore) {
          setRequests(requestItems);
          setCandidates(attachAssessmentsToCandidates(candidateItems, assessmentLists.flat()));
        }
      } catch (caught) {
        if (!ignore) {
          setRequestsError(caught.message || "Не удалось загрузить последние запросы.");
          setCandidatesError(caught.message || "Не удалось загрузить кандидатов.");
        }
      } finally {
        if (!ignore) setRequestsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);
  const assessments = candidates.flatMap(getCandidateAssessments);
  const avg = assessments.length ? Math.round(assessments.reduce((sum, item) => sum + item.totalCoverage, 0) / assessments.length) : 0;
  const incomplete = assessments.filter((item) => item.hasMissingMustRequirements || item.missingMustRequirements?.length > 0).length;

  const quickActions = [
    { title: "Создать запрос", text: "Открыть форму нового запроса", icon: "bi-plus-lg", to: "/requests/new" },
    { title: "Загрузить резюме", text: "Прикрепить резюме к новой заявке", icon: "bi-upload", to: "/requests/new" },
    { title: "Последние запросы", text: "Перейти к списку запросов", icon: "bi-file-text", to: "/requests" },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Дашборд</h1>
          <p>Сводка по активным запросам, кандидатам и покрытию требований</p>
        </div>
      </div>
      <div className="quick-grid">
        {quickActions.map((action) => (
          <button key={action.title} className="quick-card" type="button" onClick={() => navigate(action.to)}>
            <span className="quick-icon"><i className={`bi ${action.icon}`} aria-hidden="true" /></span>
            <span>
              <strong>{action.title}</strong>
              <small>{action.text}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="metric-grid">
        <Card><span>Активные запросы</span><strong>{requests.filter((item) => item.status === "active").length}</strong></Card>
        <Card><span>Кандидаты</span><strong>{candidates.length}</strong></Card>
        <Card><span>Среднее покрытие</span><strong>{avg}%</strong></Card>
        <Card><span>Неполный must have</span><strong>{incomplete}</strong></Card>
      </div>
      <div className="two-col">
        <Card>
          <h2>Последние запросы</h2>
          {requestsError ? <div className="alert danger">{requestsError}</div> : null}
          {requestsLoading ? <div className="loading-line inline">Загружаем запросы...</div> : (
            <DataTable>
              <thead><tr><th>ID</th><th>Должность</th><th>Грейд</th><th>Статус</th></tr></thead>
              <tbody>
                {requests.slice(0, 5).map((request) => (
                  <tr key={request.id}>
                    <td>{shortId(request.id)}</td>
                    <td><Link to={`/requests/${request.id}`}>{request.position}</Link></td>
                    <td><Badge tone={gradeBadge(request.grade)}>{request.grade}</Badge></td>
                    <td><Badge tone={statusBadge(request.status)}>{statusLabels[request.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>
        <Card>
          <h2>Последние кандидаты</h2>
          {candidatesError ? <div className="alert danger">{candidatesError}</div> : null}
          {requestsLoading ? <div className="loading-line inline">Загружаем кандидатов...</div> : null}
          {!requestsLoading && candidates.length ? (
            <DataTable>
              <thead><tr><th>Кандидат</th><th>Грейд</th><th>Дата</th></tr></thead>
              <tbody>
                {candidates.slice(0, 5).map((candidate) => (
                  <tr key={candidate.id}>
                    <td><Link to={`/candidates/${candidate.id}`}>{candidate.fullName || candidate.fileName || "Кандидат без имени"}</Link></td>
                    <td><Badge tone={gradeBadge(candidate.grade)}>{candidate.grade}</Badge></td>
                    <td>{formatDate(candidate.uploadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : null}
          {!requestsLoading && !candidates.length ? <EmptyState title="Кандидатов пока нет" text="Загрузите резюме через форму заявки." /> : null}
        </Card>
      </div>
    </>
  );
}


