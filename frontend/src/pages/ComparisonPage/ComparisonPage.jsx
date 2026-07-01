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
import { attachAssessmentsToCandidates, getCandidateAssessments } from "../../services/mappers/candidateMapper.js";
import { getRequests } from "../../services/requestsApi.js";
import { formatDate, gradeBadge, requestOptionLabel, requestTitle } from "../../utils/formatters.js";

const missingMustCount = (assessment) =>
  assessment.missingMustRequirements?.length || (assessment.hasMissingMustRequirements ? 1 : 0);

export function ComparisonPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [requestId, setRequestId] = useState("Все");
  const [grade, setGrade] = useState("Все");
  const [coverageStatus, setCoverageStatus] = useState("Все");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("coverage-desc");
  const requestById = useMemo(() => Object.fromEntries(requests.map((request) => [request.id, request])), [requests]);

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
        if (!ignore) setApiError(caught.message || "Не удалось загрузить сравнение кандидатов.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const rows = useMemo(() => candidates
    .flatMap((candidate) => getCandidateAssessments(candidate).map((assessment) => ({ candidate, assessment })))
    .filter(({ candidate, assessment }) => {
      const skills = candidate.recognizedSkills || candidate.skills || [];
      const missingMust = missingMustCount(assessment);
      const text = `${candidate.fullName || candidate.fio || ""} ${skills.map((skill) => skill.title || skill.raw_text).join(" ")}`.toLowerCase();
      return assessment
        && (requestId === "Все" || assessment.request_id === requestId)
        && (grade === "Все" || candidate.grade === grade)
        && (coverageStatus === "Все" || (coverageStatus === "Подходит" ? missingMust === 0 : missingMust > 0))
        && (!query.trim() || text.includes(query.trim().toLowerCase()));
    })
    .sort((a, b) => {
      if (sort === "coverage-desc") return b.assessment.totalCoverage - a.assessment.totalCoverage;
      if (sort === "coverage-asc") return a.assessment.totalCoverage - b.assessment.totalCoverage;
      if (sort === "name") return (a.candidate.fullName || "").localeCompare(b.candidate.fullName || "", "ru");
      return new Date(b.candidate.uploadedAt || b.candidate.created_at) - new Date(a.candidate.uploadedAt || a.candidate.created_at);
    }), [candidates, coverageStatus, grade, query, requestId, sort]);
  const pagination = usePagination(rows);

  return (
    <>
      <div className="page-head">
        <div><h1>Сравнение кандидатов</h1><p>Сопоставление кандидатов с требованиями выбранной заявки</p></div>
      </div>
      <Card>
        {apiError ? <div className="alert danger">{apiError}</div> : null}
        <div className="filters">
          <Input placeholder="Поиск по кандидату или навыкам" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select value={requestId} onChange={(event) => setRequestId(event.target.value)}>
            <option value="Все">Запрос: Все</option>
            {requests.map((item) => <option key={item.id} value={item.id}>{requestOptionLabel(item)}</option>)}
          </Select>
          <Select value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="Все">Грейд: Все</option>
            {gradeOptions.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={coverageStatus} onChange={(event) => setCoverageStatus(event.target.value)}>
            <option value="Все">Статус: Все</option>
            <option>Подходит</option>
            <option>Неполное</option>
          </Select>
          <Select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="coverage-desc">Покрытие: по убыванию</option>
            <option value="coverage-asc">Покрытие: по возрастанию</option>
            <option value="name">По кандидату</option>
            <option value="uploaded">По дате загрузки</option>
          </Select>
        </div>
        {loading ? <div className="loading-line inline">Загружаем сравнение...</div> : null}
        {!loading && rows.length ? (
          <>
            <DataTable>
              <thead><tr><th>Кандидат</th><th>Связанный запрос</th><th>Грейд</th><th>Общее</th><th>Must have</th><th>Nice to have</th><th>Нет must</th><th>Статус</th><th>Дата</th><th>Действие</th></tr></thead>
              <tbody>
                {pagination.pageItems.map(({ candidate, assessment }) => {
                  const request = requestById[assessment.request_id];
                  const missingMust = missingMustCount(assessment);
                  return (
                    <tr key={`${candidate.id}-${assessment.id}`}>
                      <td className="entity-name">{candidate.fullName || candidate.fio || candidate.fileName || "Кандидат без имени"}</td>
                      <td>{request ? requestTitle(request) : "Заявка недоступна"}</td>
                      <td><Badge tone={gradeBadge(candidate.grade)}>{candidate.grade}</Badge></td>
                      <td>{assessment.totalCoverage}%</td>
                      <td>{assessment.mustCoverage}%</td>
                      <td>{assessment.niceCoverage}%</td>
                      <td>{missingMust}</td>
                      <td><Badge tone={missingMust ? "status-draft" : "status-active"}>{missingMust ? "Неполное" : "Подходит"}</Badge></td>
                      <td>{formatDate(assessment.createdAt || candidate.uploadedAt)}</td>
                      <td><Button variant="secondary" icon="bi-person-vcard" onClick={() => navigate(`/candidates/${candidate.id}`)}>Открыть карточку</Button></td>
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
        {!loading && !rows.length ? <EmptyState title="Нет кандидатов для сравнения" text="Запустите assessment для кандидатов выбранной заявки." /> : null}
      </Card>
    </>
  );
}

