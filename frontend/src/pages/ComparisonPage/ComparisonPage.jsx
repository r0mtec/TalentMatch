import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input, Select } from "../../components/ui/Form.jsx";
import { Pagination, usePagination } from "../../components/ui/Pagination.jsx";
import { DataTable, EmptyState } from "../../components/ui/Table.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { gradeOptions } from "../../data/mockData.js";
import { compareCandidates, getAssessmentsByRequest, runAssessmentForRequestCandidate } from "../../services/assessmentsApi.js";
import { getAllCandidates, getCandidateSkills } from "../../services/candidatesApi.js";
import { downloadComparisonReport } from "../../services/reportsApi.js";
import { getRequests } from "../../services/requestsApi.js";
import { canDo, getStoredUser } from "../../utils/access.js";
import { formatAssessmentStatus, gradeBadge, isAssessmentCalculated, isAssessmentFailed, requestOptionLabel } from "../../utils/formatters.js";

const candidateTitle = (candidate) =>
  candidate.fullName || candidate.fio || candidate.displayName || candidate.fileName || "Кандидат без имени";

const missingMustCount = (assessment) =>
  assessment?.missingMustRequirements?.length || (assessment?.hasMissingMustRequirements ? 1 : 0);

const latestAssessmentByCandidate = (items) => {
  const sorted = [...items].filter(Boolean).sort((a, b) => {
    const dateDiff = new Date(a.createdAt || a.calculatedAt || 0) - new Date(b.createdAt || b.calculatedAt || 0);
    if (dateDiff) return dateDiff;
    return Number(a.runNumber || 0) - Number(b.runNumber || 0);
  });

  return sorted.reduce((acc, assessment) => {
    const candidateId = assessment.candidate_id || assessment.candidateId;
    if (candidateId) acc.set(candidateId, assessment);
    return acc;
  }, new Map());
};

const coverageValue = (assessment, direction) => {
  if (!isAssessmentCalculated(assessment)) return direction === "asc" ? 101 : -1;
  return Number(assessment.totalCoverage || 0);
};

export function ComparisonPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const startedAssessmentsRef = useRef(new Set());
  const [requests, setRequests] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [apiError, setApiError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [grade, setGrade] = useState("Все");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("coverage-desc");
  const canExportComparison = canDo("exportComparisonReport", getStoredUser()?.role);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === requestId) || null,
    [requestId, requests],
  );

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setApiError("");
      try {
        const [candidateItems, requestResult] = await Promise.all([
          getAllCandidates({ per_page: 100 }),
          getRequests({ per_page: 200 }),
        ]);
        const candidatesWithSkills = await Promise.all(candidateItems.map(async (candidate) => {
          const skills = candidate.id
            ? await getCandidateSkills(candidate.id).catch(() => candidate.recognizedSkills || candidate.skills || [])
            : [];
          return { ...candidate, recognizedSkills: skills, skills };
        }));
        const requestItems = requestResult.items || [];
        const defaultRequest = requestItems.find((request) => request.status === "active") || requestItems[0];
        if (!ignore) {
          setCandidates(candidatesWithSkills);
          setRequests(requestItems);
          setRequestId((current) => current || defaultRequest?.id || "");
        }
      } catch (caught) {
        if (!ignore) setApiError(caught.message || "Не удалось загрузить данные для сравнения.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const loadComparison = useCallback(async (startMissingAssessments = true) => {
    if (!requestId || !candidates.length) {
      setAssessments([]);
      return;
    }

    const candidateIds = candidates.map((candidate) => candidate.id).filter(Boolean);
    if (!candidateIds.length) {
      setAssessments([]);
      return;
    }

    setComparisonLoading(true);
    setApiError("");
    try {
      const [comparisonResult, requestAssessments] = await Promise.all([
        compareCandidates(requestId, candidateIds),
        getAssessmentsByRequest(requestId).catch(() => []),
      ]);
      const byCandidate = latestAssessmentByCandidate([
        ...(requestAssessments || []),
        ...(comparisonResult.items || []),
      ]);
      const created = [];

      if (startMissingAssessments) {
        for (const candidateId of candidateIds) {
          const key = `${requestId}:${candidateId}`;
          if (byCandidate.has(candidateId) || startedAssessmentsRef.current.has(key)) continue;
          startedAssessmentsRef.current.add(key);
          try {
            const assessment = await runAssessmentForRequestCandidate(requestId, candidateId);
            byCandidate.set(candidateId, assessment);
            created.push(assessment);
          } catch (caught) {
            byCandidate.set(candidateId, {
              id: key,
              request_id: requestId,
              requestId,
              candidate_id: candidateId,
              candidateId,
              status: "failed",
              errorMessage: caught.message || "Не удалось запустить оценку кандидата.",
            });
          }
        }
      }

      setAssessments(Array.from(byCandidate.values()));
      if (created.length) notify(`Запущена оценка кандидатов: ${created.length}.`);
    } catch (caught) {
      setApiError(caught.message || "Не удалось загрузить сравнение по выбранной заявке.");
    } finally {
      setComparisonLoading(false);
    }
  }, [candidates, notify, requestId]);

  useEffect(() => {
    setAssessments([]);
    if (requestId && candidates.length) loadComparison(true);
  }, [candidates, loadComparison, requestId]);

  const assessmentByCandidate = useMemo(() => latestAssessmentByCandidate(assessments), [assessments]);

  const rows = useMemo(() => candidates
    .map((candidate) => ({ candidate, assessment: assessmentByCandidate.get(candidate.id) || null }))
    .filter(({ candidate }) => {
      const skills = candidate.recognizedSkills || candidate.skills || [];
      const text = `${candidateTitle(candidate)} ${skills.map((skill) => skill.title || skill.raw_text || "").join(" ")}`.toLowerCase();
      return (grade === "Все" || candidate.grade === grade)
        && (!query.trim() || text.includes(query.trim().toLowerCase()));
    })
    .sort((a, b) => {
      if (sort === "coverage-desc") return coverageValue(b.assessment, "desc") - coverageValue(a.assessment, "desc");
      if (sort === "coverage-asc") return coverageValue(a.assessment, "asc") - coverageValue(b.assessment, "asc");
      if (sort === "name") return candidateTitle(a.candidate).localeCompare(candidateTitle(b.candidate), "ru");
      return new Date(b.candidate.uploadedAt || b.candidate.created_at) - new Date(a.candidate.uploadedAt || a.candidate.created_at);
    }), [assessmentByCandidate, candidates, grade, query, sort]);

  const hasPendingAssessments = rows.some(({ assessment }) =>
    assessment && !isAssessmentCalculated(assessment) && !isAssessmentFailed(assessment),
  );
  const pagination = usePagination(rows);

  useEffect(() => {
    if (!requestId || !hasPendingAssessments) return undefined;
    const timer = window.setTimeout(() => loadComparison(false), 3000);
    return () => window.clearTimeout(timer);
  }, [hasPendingAssessments, loadComparison, requestId]);

  const exportComparison = async () => {
    if (!requestId) return;
    setActionLoading("report");
    setApiError("");
    try {
      const result = await downloadComparisonReport(requestId);
      if (result instanceof Blob) {
        const url = window.URL.createObjectURL(result);
        const link = document.createElement("a");
        link.href = url;
        link.download = `comparison-${requestId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else if (result?.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
      notify("PDF-отчёт подготовлен.");
    } catch (caught) {
      setApiError(caught.message || "Не удалось сформировать PDF-отчёт.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Сравнение кандидатов</h1><p>Сопоставление всех кандидатов с требованиями выбранной заявки</p></div>
        {canExportComparison ? (
          <Button
            icon="bi-file-earmark-pdf"
            disabled={!requestId || actionLoading === "report"}
            onClick={exportComparison}
          >
            {actionLoading === "report" ? "Готовим..." : "Экспорт PDF"}
          </Button>
        ) : null}
      </div>
      <Card>
        {apiError ? <div className="alert danger">{apiError}</div> : null}
        <div className="filters">
          <Select value={requestId} onChange={(event) => setRequestId(event.target.value)}>
            <option value="">Запрос: выберите заявку</option>
            {requests.map((item) => <option key={item.id} value={item.id}>{requestOptionLabel(item)}</option>)}
          </Select>
          <Input placeholder="Поиск по кандидату или навыкам" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="Все">Грейд: Все</option>
            {gradeOptions.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="coverage-desc">Покрытие: по убыванию</option>
            <option value="coverage-asc">Покрытие: по возрастанию</option>
            <option value="name">По кандидату</option>
            <option value="uploaded">По дате загрузки</option>
          </Select>
        </div>
        {loading ? <div className="loading-line inline">Загружаем кандидатов и заявки...</div> : null}
        {!loading && comparisonLoading ? <div className="loading-line inline">Обновляем оценки по выбранной заявке...</div> : null}
        {!loading && !requestId ? <EmptyState title="Выберите заявку" text="После выбора заявки все кандидаты будут сопоставлены с её требованиями." /> : null}
        {!loading && requestId && !candidates.length ? <EmptyState title="Кандидатов пока нет" text="Загрузите резюме, чтобы сравнить кандидатов с выбранной заявкой." /> : null}
        {!loading && requestId && candidates.length ? (
          <>
            <DataTable>
              <thead><tr><th>Кандидат</th><th>Выбранный запрос</th><th>Грейд</th><th>Общее покрытие</th><th>Must have</th><th>Nice to have</th><th>Нет must</th><th>Статус</th><th>Действие</th></tr></thead>
              <tbody>
                {pagination.pageItems.map(({ candidate, assessment }) => {
                  const missingMust = missingMustCount(assessment);
                  const assessmentReady = isAssessmentCalculated(assessment);
                  const assessmentFailed = isAssessmentFailed(assessment);
                  return (
                    <tr key={`${requestId}-${candidate.id}`}>
                      <td className="entity-name">{candidateTitle(candidate)}</td>
                      <td>{selectedRequest ? requestOptionLabel(selectedRequest) : "Заявка недоступна"}</td>
                      <td><Badge tone={gradeBadge(candidate.grade)}>{candidate.grade}</Badge></td>
                      <td>{assessmentReady ? `${assessment.totalCoverage}%` : "—"}</td>
                      <td>{assessmentReady ? `${assessment.mustCoverage}%` : "—"}</td>
                      <td>{assessmentReady ? `${assessment.niceCoverage}%` : "—"}</td>
                      <td>{assessmentReady ? missingMust : "—"}</td>
                      <td>
                        {assessmentReady ? (
                          <Badge tone={missingMust ? "status-draft" : "status-active"}>{missingMust ? "Неполное" : "Подходит"}</Badge>
                        ) : assessmentFailed ? (
                          <Badge tone="status-closed">{assessment?.errorMessage || formatAssessmentStatus(assessment?.status)}</Badge>
                        ) : (
                          <Badge tone="status-draft">{assessment ? formatAssessmentStatus(assessment.status) : "Оценка запускается"}</Badge>
                        )}
                      </td>
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
      </Card>
    </>
  );
}
