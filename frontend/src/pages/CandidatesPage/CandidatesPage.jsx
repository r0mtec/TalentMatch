import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input, Select } from "../../components/ui/Form.jsx";
import { Pagination, usePagination } from "../../components/ui/Pagination.jsx";
import { DataTable, EmptyState } from "../../components/ui/Table.jsx";
import { gradeOptions } from "../../data/uiConstants.js";
import { getAssessmentsByRequest } from "../../services/assessmentsApi.js";
import { getCandidates, hydrateCandidatesSkills } from "../../services/candidatesApi.js";
import { attachAssessmentsToCandidates, getAssessmentRequestId, getPrimaryAssessment } from "../../services/mappers/candidateMapper.js";
import { getRequests } from "../../services/requestsApi.js";
import { getCandidateDisplayName } from "../../utils/candidateName.js";
import { getCandidateSkills, getCandidateSkillTitle } from "../../utils/candidateSkills.js";
import { formatDate, gradeBadge, requestOptionLabel } from "../../utils/formatters.js";

const candidateName = (candidate) => getCandidateDisplayName(candidate);

const visibleSkillCount = 5;

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
        const candidatesWithSkills = await hydrateCandidatesSkills(candidateItems);
        const requestItems = requestResult.items || [];
        const assessmentLists = await Promise.all(requestItems.map((request) => getAssessmentsByRequest(request.id)));
        if (!ignore) {
          setRequests(requestItems);
          setCandidates(attachAssessmentsToCandidates(candidatesWithSkills, assessmentLists.flat()));
        }
      } catch (caught) {
        if (!ignore) setApiError(caught.message || "Не удалось загрузить кандидатов.");
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
    const skills = getCandidateSkills(candidate);
    const linkedRequestId = getAssessmentRequestId(candidate);
    const matchesGrade = grade === "Все" || candidate.grade === grade;
    const matchesRequest = requestId === "Все" || linkedRequestId === requestId;
    const haystack = `${candidateName(candidate)} ${skills.map(getCandidateSkillTitle).join(" ")}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    return matchesGrade && matchesRequest && matchesQuery;
  }), [candidates, grade, query, requestId]);
  const pagination = usePagination(filtered);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Кандидаты</h1>
          <p>Список резюме и результатов обработки кандидатов</p>
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
            {requests.map((request) => <option key={request.id} value={request.id}>{requestOptionLabel(request)}</option>)}
          </Select>
        </div>
        {loading ? <div className="loading-line inline">Загружаем кандидатов...</div> : null}
        {!loading && filtered.length ? (
          <>
            <DataTable>
              <thead>
                <tr>
                  <th>Кандидат</th>
                  <th>Связанный запрос</th>
                  <th>Грейд</th>
                  <th>Ключевые навыки</th>
                  <th>Дата загрузки</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((candidate) => {
                  const assessment = getPrimaryAssessment(candidate);
                  const request = requestById[assessment?.request_id || assessment?.requestId];
                  const skills = getCandidateSkills(candidate);
                  return (
                    <tr key={candidate.id}>
                      <td className="entity-name">{candidateName(candidate)}</td>
                      <td>{assessment && request ? requestOptionLabel(request) : "Оценка не выполнена"}</td>
                      <td><Badge tone={gradeBadge(candidate.grade)}>{candidate.grade}</Badge></td>
                      <td>
                        {skills.length ? (
                          <div className="candidate-skill-chips">
                            {skills.slice(0, visibleSkillCount).map((skill) => (
                              <Badge key={skill.id || getCandidateSkillTitle(skill)} title={getCandidateSkillTitle(skill)}>{getCandidateSkillTitle(skill)}</Badge>
                            ))}
                            {skills.length > visibleSkillCount ? <Badge>+{skills.length - visibleSkillCount}</Badge> : null}
                          </div>
                        ) : <span className="muted-cell">Навыки не распознаны</span>}
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


