import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input, Select } from "../../components/ui/Form.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { EmptyState } from "../../components/ui/Table.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { getAssessmentById, getAssessmentsByRequest, runAssessment } from "../../services/assessmentsApi.js";
import { createCandidateSkill, deleteCandidateSkill, getCandidateById } from "../../services/candidatesApi.js";
import { downloadAssessmentReport } from "../../services/reportsApi.js";
import { getRequests } from "../../services/requestsApi.js";
import { formatDate, gradeBadge, requestOptionLabel, requestTitle, statusBadge, statusLabels } from "../../utils/formatters.js";

const latestAssessment = (items) => [...items].sort((a, b) => {
  const dateDiff = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  if (dateDiff) return dateDiff;
  return Number(a.runNumber || 0) - Number(b.runNumber || 0);
}).at(-1) || null;

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

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setApiError("");
      try {
        const [candidateData, requestResult] = await Promise.all([
          getCandidateById(candidateId),
          getRequests({ per_page: 50 }),
        ]);
        const requestItems = requestResult.items || [];
        const assessmentLists = await Promise.all(requestItems.map((request) => getAssessmentsByRequest(request.id)));
        const candidateAssessments = assessmentLists.flat().filter((item) => item.candidate_id === candidateId || item.candidateId === candidateId);
        const summary = latestAssessment(candidateAssessments);
        const detailed = summary?.id ? await getAssessmentById(summary.id).catch(() => summary) : null;
        if (!ignore) {
          setCandidate(candidateData);
          setRequests(requestItems);
          setAssessment(detailed);
        }
      } catch (caught) {
        if (!ignore) setApiError(caught.message || "Не удалось загрузить карточку кандидата.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [candidateId, reloadKey]);

  const request = requests.find((item) => item.id === assessment?.request_id);
  const recognizedSkills = candidate?.recognizedSkills || candidate?.skills || [];
  const reassessTargets = requests.filter((item) => item.id !== assessment?.request_id);
  const hasMissingMust = Boolean(assessment?.hasMissingMustRequirements || assessment?.missingMustRequirements?.length);
  const isAssessmentCalculated = Boolean(assessment?.status === "calculated" || assessment?.calculatedAt || assessment?.requirementResults?.length);

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

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    setActionLoading("skill");
    setApiError("");
    try {
      await createCandidateSkill(candidate.id, { raw_text: newSkill.trim(), title: newSkill.trim() });
      notify("Навык добавлен.");
      setNewSkill("");
      reload();
    } catch (caught) {
      setApiError(caught.message || "Не удалось добавить навык.");
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
      notify("Навык удалён.");
      reload();
    } catch (caught) {
      setApiError(caught.message || "Не удалось удалить навык.");
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
      const created = await runAssessment(targetRequestId, candidate.id);
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

  if (loading) return <div className="loading-line">Загружаем карточку кандидата...</div>;
  if (apiError && !candidate) return <EmptyState title="Кандидат не найден" text={apiError} />;
  if (!candidate) return <EmptyState title="Кандидат не найден" text="Вернитесь к списку кандидатов." />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{candidate.fullName || candidate.fileName || "Кандидат без имени"}</h1>
          <p>{candidate.location} · загружен {formatDate(candidate.uploadedAt)}</p>
        </div>
        <div className="table-actions">
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
          <Button icon="bi-file-earmark-pdf" disabled={!assessment?.id || !isAssessmentCalculated || actionLoading === "report"} onClick={exportReport}>
            {actionLoading === "report" ? "Готовим..." : "Экспорт PDF"}
          </Button>
        </div>
      </div>
      {apiError ? <div className="alert danger">{apiError}</div> : null}
      <Card className="candidate-hero">
        <div className="detail-grid">
          <span><b>Грейд:</b> {candidate.grade}</span>
          <span><b>Локация:</b> {candidate.location}</span>
          <span><b>Гражданство:</b> {candidate.citizenship || "Не указано"}</span>
          <span><b>Файл:</b> {candidate.original_file_name || candidate.fileName}</span>
          <span><b>Парсинг:</b> {candidate.parsing_status === "done" || candidate.parsing_status === "parsed" ? "выполнен" : candidate.parsing_status}</span>
          <span><b>Распознавание:</b> {candidate.recognition_status === "done" || candidate.recognition_status === "recognized" ? "выполнено" : candidate.recognition_status}</span>
        </div>
      </Card>
      {!assessment ? (
        <Card>
          <EmptyState title="Оценка покрытия ещё не выполнена" text="Выберите заявку и запустите оценку покрытия для кандидата." />
        </Card>
      ) : null}
      {assessment && !isAssessmentCalculated ? (
        <Card>
          <EmptyState title="Оценка покрытия ещё не выполнена" text={`Текущий статус: ${assessment.status || "processing"}. Результат появится после обработки резюме.`} />
        </Card>
      ) : null}
      {assessment && request ? (
        <Card className="linked-request">
          <div>
            <span className="eyebrow">Связанный запрос</span>
            <h2><Link to={`/requests/${request.id}`}>{requestTitle(request)}</Link></h2>
          </div>
          <div className="linked-meta">
            <Badge tone={gradeBadge(request.grade)}>{request.grade}</Badge>
            <Badge tone={statusBadge(request.status)}>{statusLabels[request.status] || request.status}</Badge>
          </div>
        </Card>
      ) : null}
      {assessment && !request ? <div className="alert warning">Связанная заявка недоступна.</div> : null}
      {assessment && isAssessmentCalculated && hasMissingMust ? <div className="alert warning">Кандидат имеет неполное соответствие: есть незакрытые обязательные требования.</div> : null}
      {assessment && isAssessmentCalculated ? (
        <div className="metric-grid colored">
          <Card className="metric-blue"><span>Общее покрытие</span><strong>{assessment.totalCoverage}%</strong></Card>
          <Card className="metric-green"><span>Must have</span><strong>{assessment.mustCoverage}%</strong></Card>
          <Card className="metric-orange"><span>Nice to have</span><strong>{assessment.niceCoverage}%</strong></Card>
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
          <Button variant="secondary" icon="bi-pencil" onClick={() => setEditing(!editing)}>{editing ? "Закрыть" : "Редактировать"}</Button>
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
        ) : (
          <div className="tag-row">{recognizedSkills.length ? recognizedSkills.map((skill) => <Badge key={skill.id || skill.title}>{skill.title}</Badge>) : "Навыки пока не распознаны."}</div>
        )}
      </Card>
      {assessment && isAssessmentCalculated ? (
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



