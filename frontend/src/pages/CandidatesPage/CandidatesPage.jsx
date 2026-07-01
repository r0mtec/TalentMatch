import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input, Select } from "../../components/ui/Form.jsx";
import { Pagination, usePagination } from "../../components/ui/Pagination.jsx";
import { DataTable, EmptyState } from "../../components/ui/Table.jsx";
import { gradeOptions } from "../../data/mockData.js";
import { getAssessmentsByRequest } from "../../services/assessmentsApi.js";
import { getCandidates } from "../../services/candidatesApi.js";
import { attachAssessmentsToCandidates, getAssessmentRequestId, getPrimaryAssessment } from "../../services/mappers/candidateMapper.js";
import { getRequests } from "../../services/requestsApi.js";
import { formatDate, gradeBadge } from "../../utils/formatters.js";

export function CandidatesPage() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("Все");
  const [requestId, setRequestId] = useState("Все");

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setApiError("");
      try {
        const [candidateItems, requestResult] = await Promise.all([
          getCandidates({ per_page: 50 }),
          getRequests({ per_page: 50 }),
        ]);
        const requestItems = requestResult.items || [];
        const assessmentLists = await Promise.all(requestItems.map((request) => getAssessmentsByRequest(request.id)));
        if (!ignore) {
          setRequests(requestItems);
          setCandidates(attachAssessmentsToCandidates(candidateItems, assessmentLists.flat()));
        }
      } catch (caught) {
        if (!ignore) setApiError(caught.message || "Не удалось загрузить кандидатов с backend.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const requestById = useMemo(() => Object.fromEntries(requests.map((request) => [request.id, request])), [requests]);
  const filtered = useMemo(() => candidates.filter((candidate) => {
    const skills = candidate.recognizedSkills || candidate.skills || [];
    const linkedRequestId = getAssessmentRequestId(candidate);
    const matchesGrade = grade === "Все" || candidate.grade === grade;
    const matchesRequest = requestId === "Все" || linkedRequestId === requestId;
    const haystack = `${candidate.fullName || candidate.fio || ""} ${skills.map((skill) => skill.title || skill.raw_text).join(" ")}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    return matchesGrade && matchesRequest && matchesQuery;
  }), [candidates, grade, query, requestId]);
  const pagination = usePagination(filtered);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Кандидаты</h1>
          <p>Кандидаты из backend, связь с заявками строится через assessment.</p>
        </div>
      </div>
      <Card>
        {apiError ? <div className="alert danger">{apiError}</div> : null}
        <div className="filters">
          <Input placeholder="Поиск по технологиям" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select aria-label="Фильтр по грейду" value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="Все">Грейд: Все</option>
            {gradeOptions.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select aria-label="Фильтр по запросу" value={requestId} onChange={(event) => setRequestId(event.target.value)}>
            <option value="Все">Запрос: Все</option>
            {requests.map((request) => <option key={request.id} value={request.id}>{request.id} {request.position}</option>)}
          </Select>
        </div>
        {loading ? <div className="loading-line inline">Загружаем кандидатов...</div> : null}
        {!loading && filtered.length ? (
          <>
            <DataTable>
              <thead><tr><th>Кандидат</th><th>Грейд</th><th>Запрос</th><th>Ключевые навыки</th><th>Дата загрузки</th><th>Действия</th></tr></thead>
              <tbody>
                {pagination.pageItems.map((candidate) => {
                  const assessment = getPrimaryAssessment(candidate);
                  const request = requestById[assessment?.request_id];
                  const skills = candidate.recognizedSkills || candidate.skills || [];
                  return (
                    <tr key={candidate.id}>
                      <td className="entity-name">{candidate.fullName || candidate.fileName || "Кандидат без имени"}</td>
                      <td><Badge tone={gradeBadge(candidate.grade)}>{candidate.grade}</Badge></td>
                      <td>{assessment && request ? `${request.id} ${request.position}` : "Оценка не выполнена"}</td>
                      <td>
                        {skills.length ? (
                          <div className="tag-row">
                            {skills.slice(0, 3).map((skill) => <Badge key={skill.id || skill.title}>{skill.title}</Badge>)}
                            {skills.length > 3 ? <Badge>+{skills.length - 3}</Badge> : null}
                          </div>
                        ) : "—"}
                      </td>
                      <td>{formatDate(candidate.uploadedAt)}</td>
                      <td className="table-actions">
                        <Button variant="secondary" icon="bi-person-vcard" onClick={() => navigate(`/candidates/${candidate.id}`)}>Открыть карточку</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
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
          </>
        ) : null}
        {!loading && !filtered.length ? <EmptyState title="Кандидаты не найдены" text="Загрузите резюме или измените фильтры." /> : null}
      </Card>
    </>
  );
}
