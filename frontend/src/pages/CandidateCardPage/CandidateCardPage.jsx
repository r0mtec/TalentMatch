import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input } from "../../components/ui/Form.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { Select } from "../../components/ui/Form.jsx";
import { EmptyState } from "../../components/ui/Table.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { useMockApi } from "../../services/mockApi.js";
import { formatDate, gradeBadge, statusBadge, statusLabels } from "../../utils/formatters.js";

export function CandidateCardPage() {
  const { candidateId } = useParams();
  const { notify } = useToast();
  const { candidates, requests, updateCandidateSkills, reassessCandidateForRequest, exportCandidateReport, loading } = useMockApi();
  const candidate = candidates.find((item) => item.id === candidateId);
  const request = requests.find((item) => item.id === candidate?.requestId);
  const assessment = candidate?.assessment;
  const recognizedSkills = candidate?.recognizedSkills || candidate?.skills || [];
  const [editing, setEditing] = useState(false);
  const [skills, setSkills] = useState(recognizedSkills.map((skill) => skill.title));
  const [newSkill, setNewSkill] = useState("");
  const [infoId, setInfoId] = useState(null);
  const [textOpen, setTextOpen] = useState(false);
  const [reassessOpen, setReassessOpen] = useState(false);
  const [targetRequestId, setTargetRequestId] = useState("");

  useEffect(() => {
    setSkills(recognizedSkills.map((skill) => skill.title));
  }, [candidateId, recognizedSkills.length]);

  const sourceByRequirement = useMemo(() => {
    if (!candidate || !assessment) return {};
    const map = {};
    assessment.closedRequirements.forEach((requirement) => {
      const skill = recognizedSkills.find((item) => item.technologyId === requirement.technologyId || item.title.toLowerCase() === requirement.title.toLowerCase());
      map[requirement.id] = skill?.sourceText || "Mock-фрагмент резюме подтверждает наличие навыка.";
    });
    return map;
  }, [assessment, candidate, recognizedSkills]);

  if (!candidate) return <EmptyState title="Кандидат не найден" text="Вернитесь к списку кандидатов." />;
  if (!candidate.requestId || !request) return <EmptyState title="Кандидат не привязан к запросу" text="Проверьте mock-данные кандидата." />;
  if (!assessment) return <EmptyState title="Оценка не найдена" text="Mock API ещё не вернул assessment кандидата." />;

  const addSkill = () => {
    if (newSkill.trim()) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const saveSkills = async () => {
    await updateCandidateSkills(candidate.id, skills);
    notify("Навыки обновлены, покрытие пересчитано");
    setEditing(false);
  };
  const exportReport = async () => {
    await exportCandidateReport(candidate.id);
    notify("PDF-отчёт подготовлен в mock-режиме");
  };
  const runReassess = async () => {
    const created = await reassessCandidateForRequest(candidate.id, targetRequestId);
    notify("Резюме повторно проверено под выбранный запрос");
    setReassessOpen(false);
    if (created?.id) window.location.href = `/candidates/${created.id}`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{candidate.fullName || candidate.fileName || "Кандидат без имени"}</h1>
          <p>{candidate.location} · загружен {formatDate(candidate.uploadedAt)}</p>
        </div>
        <div className="table-actions">
          <Button variant="secondary" icon="bi-arrow-repeat" onClick={() => {
            setTargetRequestId(requests.find((item) => item.id !== candidate.requestId)?.id || request.id);
            setReassessOpen(true);
          }}>Прогнать под другой запрос</Button>
          <Button icon="bi-file-earmark-pdf" onClick={exportReport}>Экспорт PDF</Button>
        </div>
      </div>
      <Card className="candidate-hero">
        <div className="detail-grid">
          <span><b>Грейд:</b> {candidate.grade}</span>
          <span><b>Локация:</b> {candidate.location}</span>
          <span><b>Гражданство:</b> {candidate.citizenship || "Не указано"}</span>
          <span><b>Файл:</b> {candidate.original_file_name || candidate.fileName}</span>
          <span><b>Парсинг:</b> {candidate.parsing_status === "parsed" ? "выполнен" : candidate.parsing_status}</span>
          <span><b>Распознавание:</b> {candidate.recognition_status === "recognized" ? "выполнено" : candidate.recognition_status}</span>
        </div>
      </Card>
      <Card className="linked-request">
        <div>
          <span className="eyebrow">Связанный запрос</span>
          <h2><Link to={`/requests/${request.id}`}>{request.id} {request.position}</Link></h2>
        </div>
        <div className="linked-meta">
          <Badge tone={gradeBadge(request.grade)}>{request.grade}</Badge>
          <Badge tone={statusBadge(request.status)}>{statusLabels[request.status]}</Badge>
        </div>
      </Card>
      {assessment.missingMustRequirements.length ? <div className="alert warning">Кандидат имеет неполное соответствие: не закрыты обязательные требования.</div> : null}
      <div className="metric-grid colored">
        <Card className="metric-blue"><span>Общее покрытие</span><strong>{assessment.totalCoverage}%</strong></Card>
        <Card className="metric-green"><span>Must have</span><strong>{assessment.mustCoverage}%</strong></Card>
        <Card className="metric-orange"><span>Nice to have</span><strong>{assessment.niceCoverage}%</strong></Card>
      </div>
      <Card>
        <div className="section-head">
          <h2>Распознанный текст</h2>
          <Button variant="secondary" onClick={() => setTextOpen(!textOpen)}>{textOpen ? "Скрыть" : "Показать"}</Button>
        </div>
        {textOpen ? <p className="recognized-text">{candidate.recognized_text || "Mock-текст резюме пока не распознан."}</p> : null}
      </Card>
      <Card>
        <div className="section-head">
          <h2>Распознанные навыки</h2>
          <Button variant="secondary" icon="bi-pencil" onClick={() => setEditing(!editing)}>{editing ? "Закрыть" : "Редактировать"}</Button>
        </div>
        {editing ? (
          <>
            <div className="tag-row editable">
              {skills.map((skill) => (
                <button key={skill} className="tag-remove" onClick={() => setSkills(skills.filter((item) => item !== skill))}>{skill} ×</button>
              ))}
            </div>
            <div className="add-line">
              <Input value={newSkill} onChange={(event) => setNewSkill(event.target.value)} placeholder="Добавить навык" />
              <Button variant="secondary" icon="bi-plus-lg" onClick={addSkill}>Добавить</Button>
              <Button icon="bi-check2" disabled={loading} onClick={saveSkills}>{loading ? "Сохраняем..." : "Сохранить"}</Button>
            </div>
          </>
        ) : (
          <div className="tag-row">{recognizedSkills.map((skill) => <Badge key={skill.id}>{skill.title}</Badge>)}</div>
        )}
      </Card>
      <div className="two-col">
        <Card>
          <h2>Закрытые требования</h2>
          <div className="requirement-list">
            {assessment.closedRequirements.map((item) => (
              <div key={item.id} className="check-item success">
                <span>✓ {item.title}</span>
                <Button variant="ghost" onClick={() => setInfoId(infoId === item.id ? null : item.id)}>i</Button>
                {infoId === item.id ? <p className="source-text">{sourceByRequirement[item.id]}</p> : null}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2>Отсутствующие требования</h2>
          <div className="requirement-list">
            {assessment.missingRequirements.map((item) => <div key={item.id} className="check-item danger">× {item.title}</div>)}
          </div>
        </Card>
      </div>
      {reassessOpen ? (
        <Modal title="Прогнать под другой запрос" onClose={() => setReassessOpen(false)}>
          <p className="hint">Будет создана новая карточка кандидата с теми же навыками и новой оценкой покрытия.</p>
          <Select value={targetRequestId} onChange={(event) => setTargetRequestId(event.target.value)}>
            {requests.filter((item) => item.id !== candidate.requestId).map((item) => (
              <option key={item.id} value={item.id}>{item.id} {item.position}</option>
            ))}
          </Select>
          <div className="actions-bar">
            <Button icon="bi-arrow-repeat" disabled={loading || !targetRequestId} onClick={runReassess}>{loading ? "Проверяем..." : "Запустить сверку"}</Button>
            <Button variant="ghost" onClick={() => setReassessOpen(false)}>Отмена</Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
