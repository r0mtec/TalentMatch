import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input, Select, Textarea } from "../../components/ui/Form.jsx";
import { ConfirmModal } from "../../components/ui/Modal.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { gradeOptions } from "../../data/mockData.js";
import { useMockApi } from "../../services/mockApi.js";
import { weightLabel } from "../../utils/formatters.js";

const blankRequest = {
  position: "",
  grade: "Middle",
  description: "",
  tasks: "",
  location: "",
  citizenship: "",
  workload: "",
  startDate: "",
  engagementPeriod: "",
  mustHave: [],
  niceToHave: [],
};

const weightTones = { 1: "weight-low", 2: "weight-medium", 3: "weight-high", 4: "weight-critical" };

function RequirementBlock({ title, tone, items, setItems, defaultWeight }) {
  const [tech, setTech] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const add = () => {
    if (!tech.trim()) return;
    setItems([
      ...items,
      {
        id: `req-${Date.now()}`,
        title: tech.trim(),
        technologyId: tech.trim().toLowerCase().replace(/\s+/g, "-"),
        weight: defaultWeight,
      },
    ]);
    setTech("");
  };

  const setWeight = (id, weight) => {
    setItems(items.map((item) => (item.id === id ? { ...item, weight } : item)));
  };

  const remove = () => {
    setItems(items.filter((item) => item.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <Card className={`requirement-block ${tone}`}>
      <h2>{title}</h2>
      <div className="requirement-list">
        {items.map((item) => (
          <div className="requirement-row compact" key={item.id}>
            <span className="requirement-title">{item.title}</span>
            <div className="weight-picker" aria-label={`Вес требования ${item.title}`}>
              {[1, 2, 3, 4].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`weight-button ${weightTones[value]} ${item.weight === value ? "active" : ""}`}
                  onClick={() => setWeight(item.id, value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <span className="weight-caption">{item.weight} — {weightLabel(item.weight)}</span>
            <Button variant="ghost" className="icon-only danger-icon" aria-label={`Удалить ${item.title}`} onClick={() => setPendingDelete(item)}>
              <i className="bi bi-trash3" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
      <div className="add-line">
        <Input value={tech} onChange={(event) => setTech(event.target.value)} placeholder="Добавить технологию..." />
        <Button variant="secondary" icon="bi-plus-lg" onClick={add}>Добавить</Button>
      </div>
      {pendingDelete ? (
        <ConfirmModal
          title="Удалить требование?"
          text={`Требование ${pendingDelete.title} будет удалено из запроса. Это действие нельзя отменить.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={remove}
        />
      ) : null}
    </Card>
  );
}

export function RequestFormPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { requests, createRequest, updateRequest, loading } = useMockApi();
  const existing = useMemo(() => requests.find((request) => request.id === requestId), [requestId, requests]);
  const [form, setForm] = useState(existing ? { engagementPeriod: "", ...existing } : blankRequest);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [warning, setWarning] = useState("");

  const update = (field, value) => setForm({ ...form, [field]: value });
  const addFiles = (fileList) => {
    setFiles([...files, ...Array.from(fileList).filter((file) => /\.(pdf|docx)$/i.test(file.name))]);
  };
  const removeFile = (index) => setFiles(files.filter((_, fileIndex) => fileIndex !== index));

  const submit = async (status) => {
    const nextErrors = {};
    if (!form.grade) nextErrors.grade = "Выберите грейд.";
    if (!form.tasks.trim()) nextErrors.tasks = "Опишите задачи.";
    if (!form.mustHave.length) nextErrors.mustHave = "Добавьте минимум одно обязательное требование.";
    if (status === "active" && !files.length && !existing) nextErrors.files = "Прикрепите хотя бы одно резюме к заявке.";
    setErrors(nextErrors);
    setWarning(
      !form.niceToHave.length
        ? "Желательные требования не заполнены. Запрос можно сохранить, но покрытие nice to have будет 0%."
        : status === "draft" && !files.length
          ? "Черновик сохранится без кандидатов. Кандидаты появятся после прикрепления резюме к заявке."
          : "",
    );
    if (Object.keys(nextErrors).length) return;
    if (existing) {
      await updateRequest(existing.id, { ...form, status, files });
    } else {
      await createRequest({ ...form, status, files });
    }
    notify(status === "active" ? "Запрос активирован. Резюме отправлены на mock-обработку." : "Черновик сохранён.");
    navigate("/requests");
  };

  return (
    <>
      <div className="page-head">
        <div><h1>{existing ? "Редактирование запроса" : "Создание запроса"}</h1><p>Настройте требования и веса навыков</p></div>
      </div>
      {warning ? <div className="alert warning">{warning}</div> : null}
      {errors.mustHave ? <div className="alert danger">{errors.mustHave}</div> : null}
      {errors.files ? <div className="alert danger">{errors.files}</div> : null}
      <Card>
        <h2>Основная информация</h2>
        <div className="form-grid">
          <Field label="Должность"><Input value={form.position} onChange={(event) => update("position", event.target.value)} placeholder="Backend Developer" /></Field>
          <Field label="Грейд" error={errors.grade}><Select value={form.grade} onChange={(event) => update("grade", event.target.value)}>{gradeOptions.map((grade) => <option key={grade}>{grade}</option>)}</Select></Field>
          <Field label="Локация"><Input value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Москва / Удалённо" /></Field>
          <Field label="Гражданство"><Input value={form.citizenship} onChange={(event) => update("citizenship", event.target.value)} placeholder="РФ" /></Field>
          <Field label="Загрузка"><Input value={form.workload} onChange={(event) => update("workload", event.target.value)} placeholder="Full-time" /></Field>
          <Field label="Дата выхода"><Input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field>
          <Field label="Срок привлечения"><Input value={form.engagementPeriod} onChange={(event) => update("engagementPeriod", event.target.value)} placeholder="Например: бессрочно / 3 месяца / до конца проекта" /></Field>
        </div>
        <Field label="Описание проекта"><Textarea value={form.description} onChange={(event) => update("description", event.target.value)} /></Field>
        <Field label="Задачи" error={errors.tasks}><Textarea value={form.tasks} onChange={(event) => update("tasks", event.target.value)} /></Field>
      </Card>
      <div className="two-col">
        <RequirementBlock title="Обязательные (Must have)" tone="must" items={form.mustHave} setItems={(mustHave) => update("mustHave", mustHave)} defaultWeight={3} />
        <RequirementBlock title="Желательные (Nice to have)" tone="nice" items={form.niceToHave} setItems={(niceToHave) => update("niceToHave", niceToHave)} defaultWeight={2} />
      </div>
      <p className="hint">Вес определяет влияние навыка на итоговый процент покрытия: 1 — Низкий, 2 — Средний, 3 — Высокий, 4 — Критичный.</p>
      <Card className="resume-card">
        <h2>Резюме кандидатов</h2>
        <p className="hint">Резюме прикрепляются только к заявке. После обработки будут созданы карточки кандидатов.</p>
        <label className="upload-zone">
          <i className="bi bi-upload" aria-hidden="true" />
          <span>Выбрать файлы</span>
          <small>PDF или DOCX до 15 МБ</small>
          <Input type="file" multiple accept=".pdf,.docx" onChange={(event) => addFiles(event.target.files)} />
        </label>
        {files.length ? (
          <div className="file-list">
            {files.map((file, index) => (
              <div className="file-row" key={`${file.name}-${index}`}>
                <span>{file.name}</span>
                <Button variant="ghost" className="icon-only danger-icon" aria-label={`Убрать ${file.name}`} onClick={() => removeFile(index)}>
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
      <div className="actions-bar">
        <Button icon="bi-check2-circle" disabled={loading} onClick={() => submit("active")}>{loading ? "Сохраняем..." : "Активировать"}</Button>
        <Button variant="secondary" icon="bi-save" disabled={loading} onClick={() => submit("draft")}>Сохранить черновик</Button>
        <Button variant="ghost" onClick={() => navigate("/requests")}>Отмена</Button>
      </div>
    </>
  );
}
