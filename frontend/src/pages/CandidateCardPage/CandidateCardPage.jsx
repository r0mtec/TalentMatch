import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input, Select } from "../../components/ui/Form.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { EmptyState } from "../../components/ui/Table.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { gradeOptions } from "../../data/mockData.js";
import { getAssessmentById, getAssessmentsByRequest, runAssessmentForRequestCandidate } from "../../services/assessmentsApi.js";
import { createCandidateSkill, deleteCandidateSkill, getCandidateById, updateCandidate } from "../../services/candidatesApi.js";
import { downloadAssessmentReport } from "../../services/reportsApi.js";
import { getRequests } from "../../services/requestsApi.js";
import { getUnrecognizedTerms } from "../../services/technologiesApi.js";
import { canDo, getStoredUser } from "../../utils/access.js";
import { isUsableCandidateName } from "../../utils/candidateName.js";
import {
  formatAssessmentStatus,
  formatDate,
  formatProcessingStatus,
  gradeBadge,
  isAssessmentCalculated,
  isAssessmentFailed,
  processingStatusHint,
  requestOptionLabel,
  statusBadge,
  statusLabels,
} from "../../utils/formatters.js";
import { filterNewUnrecognizedTerms, readIgnoredTerms, readSeenUnrecognizedTerms } from "../../utils/unrecognizedTerms.js";

const latestAssessment = (items) => [...items].sort((a, b) => {
  const dateDiff = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  if (dateDiff) return dateDiff;
  return Number(a.runNumber || 0) - Number(b.runNumber || 0);
}).at(-1) || null;

const processingStatuses = new Set(["uploaded", "pending", "processing", "queued"]);

const candidateHeading = (candidate) => {
  const fileName = candidate.original_file_name || candidate.fileName || "";
  const name = String(candidate.fio || candidate.displayName || "").trim();
  if (isUsableCandidateName(name, fileName)) return name;
  if (fileName) return `Резюме: ${fileName}`;
  return "Кандидат без имени";
};

const skillHint = (skill) =>
  [
    skill.confidence ? `Уверенность: ${skill.confidence}%` : "",
    skill.sourceText || skill.text_source || "",
  ].filter(Boolean).join("\n");

export function CandidateCardPage() {
  const { candidateId } = useParams();
  const { notify } = useToast();
  const [candidate, setCandidate] = useState(null);
  const [requests, setRequests] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [apiError, setApiError] = useState("");
  const [editing, setEditing] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [infoId, setInfoId] = useState(null);
  const [textOpen, setTextOpen] = useState(false);
  const [reassessOpen, setReassessOpen] = useState(false);
  const [targetRequestId, setTargetRequestId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [candidateTerms, setCandidateTerms] = useState([]);
  const [metaEditing, setMetaEditing] = useState(false);
  const [metaForm, setMetaForm] = useState({ grade: "Middle", location: "", citizenship: "" });
  const currentUser = getStoredUser();
  const canEditCandidate = canDo("editCandidate", currentUser?.role);
  const canEditSkills = canDo("editCandidateSkills", currentUser?.role);
  const canRecalculate = canDo("recalculateAssessment", currentUser?.role);
  const canExportReport = canDo("exportCandidateReport", currentUser?.role);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!candidate) setLoading(true);
      setApiError("");
      try {
        const [candidateData, requestResult, termResult] = await Promise.all([
          getCandidateById(candidateId),
          getRequests({ per_page: 50 }),
          getUnrecognizedTerms({ status: "new", per_page: 200 }).catch(() => ({ items: [] })),
        ]);
        const requestItems = requestResult.items || [];
        const assessmentLists = await Promise.all(requestItems.map((request) => getAssessmentsByRequest(request.id)));
        const candidateAssessments = assessmentLists.flat().filter((item) => item.candidate_id === candidateId || item.candidateId === candidateId);
        const summary = latestAssessment(candidateAssessments);
        const detailed = summary?.id ? await getAssessmentById(summary.id).catch(() => summary) : null;
        if (!ignore) {
          setCandidate(candidateData);
          setMetaForm({
            grade: candidateData.grade || "Middle",
            location: candidateData.location || "",
            citizenship: candidateData.citizenship || "",
          });
          setRequests(requestItems);
          setAssessment(detailed);
          setCandidateTerms((termResult.items || []).filter((term) => term.candidateId === candidateId));
        }
      } catch (caught) {
        if (!ignore) setApiError(caught.message || "Не удалось загрузить карточку кандидата.");
      } finally {
        if (!ignore && !candidate) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [candidateId, reloadKey]);

  const request = assessment?.request || requests.find((item) => item.id === assessment?.request_id);
  const recognizedSkills = candidate?.recognizedSkills || candidate?.skills || [];
  const reassessTargets = requests.filter((item) => item.id !== assessment?.request_id);
  const hasMissingMust = Boolean(assessment?.hasMissingMustRequirements || assessment?.missingMustRequirements?.length);
  const assessmentReady = isAssessmentCalculated(assessment);
  const assessmentFailed = isAssessmentFailed(assessment);
  const candidateProcessing = processingStatuses.has(candidate?.parsing_status) || processingStatuses.has(candidate?.recognition_status);
  const recognitionComplete = candidate?.recognition_status === "done" || candidate?.recognition_status === "recognized";
  const newCandidateTerms = useMemo(() => (
    recognitionComplete
      ? filterNewUnrecognizedTerms(candidateTerms, readIgnoredTerms(), readSeenUnrecognizedTerms())
      : []
  ), [candidateTerms, recognitionComplete]);
  const processingUi = Boolean(
    candidateProcessing
    || (assessment && !assessmentReady && !assessmentFailed && candidate?.recognition_status !== "failed"),
  );
  const shouldPoll = Boolean(
    candidate
    && !assessmentFailed
    && candidate.parsing_status !== "failed"
    && candidate.recognition_status !== "failed"
    && (candidateProcessing || (assessment && !assessmentReady)),
  );
  const visibleSkills = editing || skillsExpanded ? recognizedSkills : recognizedSkills.slice(0, 18);
  const hiddenSkillsCount = Math.max(0, recognizedSkills.length - visibleSkills.length);
  const processingLabel = (status, reason) => [formatProcessingStatus(status), reason || processingStatusHint(status)].filter(Boolean).join(" · ");
  const recalculating = actionLoading === "recalculate";

  useEffect(() => {
    if (!shouldPoll) return undefined;
    const timer = window.setTimeout(() => setReloadKey((value) => value + 1), 3000);
    return () => window.clearTimeout(timer);
  }, [shouldPoll, reloadKey]);

  const sourceByRequirement = useMemo(() => {
    if (!assessment) return {};
    const map = {};
    assessment.closedRequirements.forEach((requirement) => {
      const skill = recognizedSkills.find((item) =>
        item.technologyId === requirement.technologyId
        || item.technology_id === requirement.technology_id
        || String(item.title || "").toLowerCase() === String(requirement.title || "").toLowerCase(),
      );
      map[requirement.id] = requirement.evidenceText || skill?.sourceText || "Фрагмент резюме пока не найден.";
    });
    return map;
  }, [assessment, recognizedSkills]);

  const reload = () => setReloadKey((value) => value + 1);

  const recalculateCurrentAssessment = async (successMessage) => {
    const requestId = assessment?.request_id || assessment?.requestId || request?.id;
    if (!requestId || !candidate?.id || !canRecalculate) {
      reload();
      if (successMessage) notify(successMessage);
      return;
    }

    setActionLoading("recalculate");
    setApiError("");
    try {
      const created = await runAssessmentForRequestCandidate(requestId, candidate.id);
      setAssessment(created);
      reload();
      notify(successMessage || "Покрытие пересчитано.");
    } catch (caught) {
      console.debug("Assessment recalculation failed", caught);
      setApiError(caught.message || "Не удалось запустить пересчёт покрытия.");
      reload();
    } finally {
      setActionLoading("");
    }
  };

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    setActionLoading("skill");
    setApiError("");
    try {
      await createCandidateSkill(candidate.id, { raw_text: newSkill.trim(), title: newSkill.trim() });
      setNewSkill("");
      await recalculateCurrentAssessment("Навыки обновлены, покрытие пересчитано");
    } catch (caught) {
      console.debug("Manual skill save failed", caught);
      setApiError("Не удалось сохранить навык. Проверьте заполнение полей.");
    } finally {
      setActionLoading("");
    }
  };

  const removeSkill = async (skill) => {
    if (!skill.id) return;
    setActionLoading(`skill-${skill.id}`);
    setApiError("");
    try {
      await deleteCandidateSkill(skill.id);
      await recalculateCurrentAssessment("Навыки обновлены, покрытие пересчитано");
    } catch (caught) {
      setApiError(caught.message || "Не удалось удалить навык.");
    } finally {
      setActionLoading("");
    }
  };

  const saveMeta = async () => {
    if (!canEditCandidate) return;
    setActionLoading("candidate-meta");
    setApiError("");
    try {
      const updated = await updateCandidate(candidate.id, {
        grade: metaForm.grade,
        location: metaForm.location.trim(),
        citizenship: metaForm.citizenship.trim(),
      });
      setCandidate(updated);
      setMetaEditing(false);
      await recalculateCurrentAssessment("Данные кандидата обновлены, покрытие пересчитано");
    } catch (caught) {
      console.debug("Candidate metadata update failed", caught);
      setApiError(caught.status === 404
        ? "Редактирование данных кандидата пока не поддерживается backend."
        : caught.message || "Не удалось сохранить данные кандидата.");
    } finally {
      setActionLoading("");
    }
  };

  const exportReport = async () => {
    if (!assessment?.id) return;
    setActionLoading("report");
    setApiError("");
    try {
      const blob = await downloadAssessmentReport(assessment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `assessment-${assessment.id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      notify("PDF-отчёт подготовлен.");
    } catch (caught) {
      setApiError(caught.message || "Не удалось сформировать PDF-отчёт.");
    } finally {
      setActionLoading("");
    }
  };

  const runReassess = async () => {
    if (!targetRequestId) return;
    setActionLoading("assessment");
    setApiError("");
    try {
      const created = await runAssessmentForRequestCandidate(targetRequestId, candidate.id);
      notify("Оценка кандидата запущена.");
      setAssessment(created);
      setReassessOpen(false);
      reload();
    } catch (caught) {
      setApiError(caught.message || "Не удалось запустить оценку.");
    } finally {
      setActionLoading("");
    }
  };

  if (loading) return <CandidateLoadingSkeleton />;
  if (apiError && !candidate) return <EmptyState title="Кандидат не найден" text={apiError} />;
  if (!candidate) return <EmptyState title="Кандидат не найден" text="Вернитесь к списку кандидатов." />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{candidateHeading(candidate)}</h1>
          <p>Загружен {formatDate(candidate.uploadedAt)} · {candidate.original_file_name || candidate.fileName || "файл без названия"}</p>
        </div>
        <div className="table-actions">
          {canRecalculate ? (
            <Button
              variant="secondary"
              icon="bi-arrow-repeat"
              disabled={!reassessTargets.length}
              onClick={() => {
                setTargetRequestId(reassessTargets[0]?.id || "");
                setReassessOpen(true);
              }}
            >
              Прогнать под другой запрос
            </Button>
          ) : null}
          {canExportReport ? (
            <Button icon="bi-file-earmark-pdf" disabled={!assessment?.id || !assessmentReady || actionLoading === "report"} onClick={exportReport}>
              {actionLoading === "report" ? "Готовим..." : "Экспорт PDF"}
            </Button>
          ) : null}
        </div>
      </div>
      {apiError ? <div className="alert danger">{apiError}</div> : null}
      <Card className="candidate-hero">
        <div className="section-head">
          <h2>Данные кандидата</h2>
          {canEditCandidate && !metaEditing ? (
            <Button variant="secondary" icon="bi-pencil" onClick={() => setMetaEditing(true)}>Редактировать данные</Button>
          ) : null}
        </div>
        {metaEditing ? (
          <>
            <div className="form-grid compact-form">
              <Field label="Грейд">
                <Select value={metaForm.grade} onChange={(event) => setMetaForm({ ...metaForm, grade: event.target.value })}>
                  {gradeOptions.map((grade) => <option key={grade}>{grade}</option>)}
                </Select>
              </Field>
              <Field label="Локация">
                <Input value={metaForm.location} onChange={(event) => setMetaForm({ ...metaForm, location: event.target.value })} />
              </Field>
              <Field label="Гражданство">
                <Input value={metaForm.citizenship} onChange={(event) => setMetaForm({ ...metaForm, citizenship: event.target.value })} />
              </Field>
            </div>
            <div className="actions-bar">
              <Button icon="bi-check2" disabled={actionLoading === "candidate-meta" || recalculating} onClick={saveMeta}>
                {actionLoading === "candidate-meta" ? "Сохраняем..." : "Сохранить"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setMetaForm({ grade: candidate.grade || "Middle", location: candidate.location || "", citizenship: candidate.citizenship || "" });
                  setMetaEditing(false);
                }}
              >
                Отмена
              </Button>
            </div>
          </>
        ) : (
          <div className="detail-grid">
            <span><b>Грейд:</b> {candidate.grade}</span>
            <span><b>Локация:</b> {candidate.location}</span>
            <span><b>Гражданство:</b> {candidate.citizenship || "Не указано"}</span>
            <span><b>Файл:</b> {candidate.original_file_name || candidate.fileName}</span>
            <span><b>Парсинг:</b> {processingLabel(candidate.parsing_status, candidate.parsing_error)}</span>
            <span><b>Распознавание:</b> {processingLabel(candidate.recognition_status, candidate.recognition_error)}</span>
          </div>
        )}
      </Card>
      {recalculating ? <RecalculateNotice /> : null}
      {processingUi ? <ProcessingNotice /> : null}
      {newCandidateTerms.length ? (
        <Card className="term-notice">
          <div>
            <h2>Найдены новые нераспознанные термины</h2>
            <p className="hint">Найдены новые нераспознанные термины. Они добавлены в справочник для проверки.</p>
          </div>
          <Link className="btn btn-secondary" to="/dictionary#unrecognized">
            <i className="bi bi-book" aria-hidden="true" />
            Перейти в справочник
          </Link>
        </Card>
      ) : null}
      {!assessment && !processingUi ? (
        <Card>
          <EmptyState title="Оценка покрытия ещё не выполнена" text="Выберите заявку и запустите оценку покрытия для кандидата." />
        </Card>
      ) : null}
      {assessment && assessmentFailed ? (
        <Card>
          <EmptyState title="Ошибка расчёта покрытия" text="Не удалось выполнить обработку." />
        </Card>
      ) : null}
      {assessment && !assessmentReady && !assessmentFailed && !processingUi ? (
        <Card>
          <EmptyState title="Оценка покрытия ещё не выполнена" text={`Текущий статус: ${formatAssessmentStatus(assessment.status)}. Результат появится после обработки резюме.`} />
        </Card>
      ) : null}
      {assessment && request ? (
        <Card className="linked-request">
          <div>
            <span className="eyebrow">Связанный запрос</span>
            <h2><Link to={`/requests/${request.id}`}>{requestOptionLabel(request)}</Link></h2>
          </div>
          <div className="linked-meta">
            <Badge tone={gradeBadge(request.grade)}>{request.grade}</Badge>
            <Badge tone={statusBadge(request.status)}>{statusLabels[request.status] || request.status}</Badge>
          </div>
        </Card>
      ) : null}
      {assessment && !request ? <div className="alert warning">Связанная заявка недоступна.</div> : null}
      {assessment && assessmentReady && hasMissingMust ? <div className="alert warning">Кандидат имеет неполное соответствие: есть незакрытые обязательные требования.</div> : null}
      {assessment && assessmentReady ? (
        <div className="metric-grid colored">
          <Card className="metric-blue"><span>Общее покрытие</span><strong>{assessment.totalCoverage}%</strong></Card>
          <Card className="metric-green"><span>Must have</span><strong>{assessment.mustCoverage}%</strong></Card>
          <Card className="metric-orange"><span>Nice to have</span><strong>{assessment.niceCoverage}%</strong></Card>
        </div>
      ) : processingUi ? (
        <div className="metric-grid colored">
          <SkeletonCard title="Общее покрытие" />
          <SkeletonCard title="Must have" />
          <SkeletonCard title="Nice to have" />
        </div>
      ) : null}
      <Card>
        <div className="section-head">
          <h2>Распознанный текст</h2>
          <Button variant="secondary" onClick={() => setTextOpen(!textOpen)}>{textOpen ? "Скрыть" : "Показать"}</Button>
        </div>
        {textOpen ? <p className="recognized-text">{candidate.recognized_text || "Распознанный текст пока не получен."}</p> : null}
      </Card>
      <Card>
        <div className="section-head">
          <h2>Распознанные навыки</h2>
          {canEditSkills ? (
            <Button variant="secondary" icon="bi-pencil" onClick={() => setEditing(!editing)}>{editing ? "Закрыть" : "Редактировать"}</Button>
          ) : null}
        </div>
        {editing ? (
          <>
            <div className="tag-row editable">
              {recognizedSkills.length ? recognizedSkills.map((skill) => (
                <button
                  key={skill.id || skill.title}
                  className="tag-remove"
                  disabled={actionLoading === `skill-${skill.id}`}
                  onClick={() => removeSkill(skill)}
                >
                  {skill.title} ×
                </button>
              )) : <span>Навыки пока не распознаны.</span>}
            </div>
            <div className="add-line">
              <Field label="Новый навык">
                <Input value={newSkill} onChange={(event) => setNewSkill(event.target.value)} placeholder="Например: Laravel" />
              </Field>
              <Button variant="secondary" icon="bi-plus-lg" disabled={actionLoading === "skill"} onClick={addSkill}>
                {actionLoading === "skill" ? "Добавляем..." : "Добавить"}
              </Button>
            </div>
          </>
        ) : processingUi && !recognizedSkills.length ? (
          <SkeletonList title="Навыки появятся после распознавания" />
        ) : (
          <>
            <div className="skill-chip-list">
              {visibleSkills.length ? visibleSkills.map((skill) => (
                <Badge key={skill.id || skill.title} title={skillHint(skill)}>{skill.title}</Badge>
              )) : "Навыки пока не распознаны."}
            </div>
            {recognizedSkills.length > 18 ? (
              <Button variant="ghost" onClick={() => setSkillsExpanded(!skillsExpanded)}>
                {skillsExpanded ? "Свернуть" : `Показать ещё ${hiddenSkillsCount}`}
              </Button>
            ) : null}
          </>
        )}
      </Card>
      {assessment && assessmentReady ? (
        <div className="two-col">
          <Card>
            <h2>Закрытые требования</h2>
            {assessment.closedRequirements.length ? (
              <div className="requirement-list">
                {assessment.closedRequirements.map((item) => (
                  <div key={item.id} className="check-item success">
                    <span>✓ {item.title}</span>
                    <Button variant="ghost" onClick={() => setInfoId(infoId === item.id ? null : item.id)}>i</Button>
                    {infoId === item.id ? <p className="source-text">{sourceByRequirement[item.id]}</p> : null}
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Нет закрытых требований" text="Для этой оценки пока нет совпавших требований." />}
          </Card>
          <Card>
            <h2>Отсутствующие требования</h2>
            {assessment.missingRequirements.length ? (
              <div className="requirement-list">
                {assessment.missingRequirements.map((item) => <div key={item.id} className="check-item danger">× {item.title}</div>)}
              </div>
            ) : <EmptyState title="Нет детализации" text="Для этой оценки пока нет списка отсутствующих требований." />}
          </Card>
        </div>
      ) : processingUi ? (
        <div className="two-col">
          <Card>
            <h2>Закрытые требования</h2>
            <SkeletonList title="Сверяем требования с навыками" />
          </Card>
          <Card>
            <h2>Отсутствующие требования</h2>
            <SkeletonList title="Детализация появится после расчёта" />
          </Card>
        </div>
      ) : null}
      {reassessOpen ? (
        <Modal title="Прогнать под другой запрос" onClose={() => setReassessOpen(false)}>
          <p className="hint">Будет запущена новая оценка кандидата под выбранную заявку.</p>
          <Select value={targetRequestId} onChange={(event) => setTargetRequestId(event.target.value)}>
            {reassessTargets.map((item) => (
              <option key={item.id} value={item.id}>{requestOptionLabel(item)}</option>
            ))}
          </Select>
          <div className="actions-bar">
            <Button icon="bi-arrow-repeat" disabled={actionLoading === "assessment" || !targetRequestId} onClick={runReassess}>
              {actionLoading === "assessment" ? "Запускаем..." : "Запустить оценку"}
            </Button>
            <Button variant="ghost" onClick={() => setReassessOpen(false)}>Отмена</Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function ProcessingNotice() {
  return (
    <Card className="processing-card">
      <div className="processing-icon"><i className="bi bi-hourglass-split" aria-hidden="true" /></div>
      <div>
        <h2>Резюме обрабатывается</h2>
        <p>Мы распознаём текст, навыки и считаем покрытие требований. Результат появится автоматически после завершения обработки.</p>
      </div>
    </Card>
  );
}

function RecalculateNotice() {
  return (
    <Card className="processing-card">
      <div className="processing-icon"><i className="bi bi-arrow-repeat" aria-hidden="true" /></div>
      <div>
        <h2>Пересчитываем покрытие...</h2>
        <p>Обновляем проценты и списки закрытых требований после изменения данных кандидата.</p>
      </div>
    </Card>
  );
}

function CandidateLoadingSkeleton() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="skeleton-line wide title-skeleton" />
          <div className="skeleton-line short" />
        </div>
      </div>
      <Card className="candidate-hero">
        <SkeletonList title="Загружаем мета-информацию" />
      </Card>
      <ProcessingNotice />
      <div className="metric-grid colored">
        <SkeletonCard title="Общее покрытие" />
        <SkeletonCard title="Must have" />
        <SkeletonCard title="Nice to have" />
      </div>
      <Card>
        <h2>Распознанные навыки</h2>
        <SkeletonList title="Навыки появятся после распознавания" />
      </Card>
    </>
  );
}

function SkeletonCard({ title }) {
  return (
    <Card className="skeleton-card">
      <span>{title}</span>
      <div className="skeleton-line wide" />
      <div className="skeleton-line short" />
    </Card>
  );
}

function SkeletonList({ title }) {
  return (
    <div className="skeleton-list" aria-label={title}>
      <span className="hint">{title}</span>
      <div className="skeleton-line wide" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}



