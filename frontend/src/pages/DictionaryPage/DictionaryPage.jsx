import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { FeatureUnavailable } from "../../components/ui/FeatureUnavailable.jsx";
import { Field, Input, Select } from "../../components/ui/Form.jsx";
import { ConfirmModal, Modal } from "../../components/ui/Modal.jsx";
import { Pagination, usePagination } from "../../components/ui/Pagination.jsx";
import { DataTable, EmptyState } from "../../components/ui/Table.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { technologyGroups } from "../../data/uiConstants.js";
import {
  addTechnologySynonym,
  createTechnology as createBackendTechnology,
  deleteTechnology as deleteBackendTechnology,
  deleteTechnologySynonym,
  getTechnologies,
  getUnrecognizedTerms,
  promoteUnrecognizedTerm,
  updateTechnology as updateBackendTechnology,
  updateTechnologySynonym,
} from "../../services/technologiesApi.js";
import { formatDate, groupLabels } from "../../utils/formatters.js";
import { filterVisibleUnrecognizedTerms, markUnrecognizedTermsSeen, readIgnoredTerms, termKey, writeIgnoredTerms } from "../../utils/unrecognizedTerms.js";

const blank = { name: "", group: "languages", synonyms: [], synonymDraft: "", sourceTermId: null };

const normalizeSynonyms = (items = []) => {
  const seen = new Set();
  return items.reduce((acc, item) => {
    const value = String(item || "").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return acc;
    seen.add(key);
    acc.push(value);
    return acc;
  }, []);
};

const clip = (value, limit = 96) => {
  const text = String(value || "").trim();
  if (!text) return "—";
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
};

const formatOptionalDate = (date) => (date ? formatDate(date) : "—");

const candidateLabel = (value) => {
  const text = String(value || "").trim();
  if (!text || text.includes("=?")) return "Кандидат без имени";
  return text;
};

export function DictionaryPage() {
  const location = useLocation();
  const unrecognizedRef = useRef(null);
  const { notify } = useToast();
  const [technologies, setTechnologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [unrecognizedTerms, setUnrecognizedTerms] = useState([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [ignoredTerms, setIgnoredTerms] = useState(readIgnoredTerms);
  const [contextTerm, setContextTerm] = useState(null);
  const [highlightUnrecognized, setHighlightUnrecognized] = useState(false);

  const loadUnrecognizedTerms = async () => {
    setTermsLoading(true);
    setTermsError("");
    try {
      const result = await getUnrecognizedTerms({ status: "new", per_page: 200 });
      setUnrecognizedTerms(result.items);
    } catch (caught) {
      setUnrecognizedTerms([]);
      setTermsError(caught.message || "Не удалось загрузить нераспознанные термины.");
    } finally {
      setTermsLoading(false);
    }
  };

  const loadTechnologies = async () => {
    setLoading(true);
    setApiError("");
    try {
      const items = await getTechnologies({ include_inactive: true });
      setTechnologies(items);
      await loadUnrecognizedTerms();
    } catch (caught) {
      setTechnologies([]);
      setUnrecognizedTerms([]);
      setApiError(caught.message || "Не удалось загрузить справочник.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTechnologies();
  }, []);

  const grouped = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return technologyGroups
      .map((group) => {
        const items = technologies.filter((technology) => {
          const matchesGroup = technology.group === group;
          const text = `${technology.name} ${(technology.synonyms || []).join(" ")}`.toLowerCase();
          return matchesGroup && (!normalizedQuery || text.includes(normalizedQuery));
        });
        return { group, items };
      })
      .filter((section) => section.items.length > 0);
  }, [query, technologies]);

  const visibleUnrecognizedTerms = useMemo(() => {
    return filterVisibleUnrecognizedTerms(unrecognizedTerms, ignoredTerms);
  }, [ignoredTerms, unrecognizedTerms]);
  const termPagination = usePagination(visibleUnrecognizedTerms, 5);
  const shouldFocusUnrecognized = location.hash === "#unrecognized"
    || location.hash === "#unrecognized-terms"
    || new URLSearchParams(location.search).get("section") === "unrecognized";

  useEffect(() => {
    if (!shouldFocusUnrecognized || apiError || termsLoading) return undefined;
    const timer = window.setTimeout(() => {
      unrecognizedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setHighlightUnrecognized(true);
      markUnrecognizedTermsSeen(visibleUnrecognizedTerms);
      window.setTimeout(() => setHighlightUnrecognized(false), 1800);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [apiError, shouldFocusUnrecognized, termsLoading, visibleUnrecognizedTerms]);

  const openForm = (technology) => {
    setForm(technology ? { ...technology, synonyms: normalizeSynonyms(technology.synonyms), synonymDraft: "", sourceTermId: null } : { ...blank });
    setModal(true);
  };

  const openPromoteForm = (term) => {
    setForm({
      ...blank,
      name: term.term,
      group: "other",
      synonyms: normalizeSynonyms([term.term]),
      sourceTermId: term.id,
    });
    setModal(true);
  };

  const addSynonym = () => {
    const next = normalizeSynonyms([...form.synonyms, form.synonymDraft]);
    setForm({ ...form, synonyms: next, synonymDraft: "" });
  };

  const removeSynonym = (synonym) => {
    setForm({ ...form, synonyms: form.synonyms.filter((item) => item.toLowerCase() !== synonym.toLowerCase()) });
  };

  const syncBackendSynonyms = async (technology, nextSynonyms) => {
    const currentItems = technology.synonymItems || [];
    const key = (value) => String(value || "").trim().toLowerCase();
    const currentKeys = new Set(currentItems.map((item) => key(item.synonym)));
    const nextKeys = new Set(nextSynonyms.map(key));
    const changedCurrent = currentItems.filter((item) => !nextKeys.has(key(item.synonym)) && item.id);
    const changedNext = nextSynonyms.filter((item) => !currentKeys.has(key(item)));
    const updates = changedNext.slice(0, changedCurrent.length).map((synonym, index) => ({
      id: changedCurrent[index].id,
      synonym,
    }));
    const additions = changedNext.slice(changedCurrent.length);
    const removals = changedCurrent.slice(changedNext.length);
    await Promise.all(updates.map((item) => updateTechnologySynonym(item.id, item.synonym)));
    await Promise.all(additions.map((synonym) => addTechnologySynonym(technology.id, synonym)));
    await Promise.all(removals.map((synonym) => deleteTechnologySynonym(synonym.id)));
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    setApiError("");
    setActionLoading(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      synonyms: normalizeSynonyms(form.synonyms),
    };
    try {
      if (form.id) {
        await updateBackendTechnology(form.id, payload);
        await syncBackendSynonyms(form, payload.synonyms);
        await loadTechnologies();
      } else if (form.sourceTermId) {
        await promoteUnrecognizedTerm(form.sourceTermId, payload);
        await loadTechnologies();
      } else {
        const created = await createBackendTechnology(payload);
        await syncBackendSynonyms(created, payload.synonyms);
        await loadTechnologies();
      }
      notify(form.sourceTermId ? "Термин добавлен в справочник." : "Технология сохранена.");
      setModal(false);
    } catch (caught) {
      setApiError(caught.message || "Не удалось сохранить технологию.");
    } finally {
      setActionLoading(false);
    }
  };

  const remove = async () => {
    setActionLoading(true);
    setApiError("");
    try {
      await deleteBackendTechnology(pendingDelete.id);
      await loadTechnologies();
      notify("Технология удалена.");
      setPendingDelete(null);
    } catch (caught) {
      setApiError(caught.message || "Не удалось удалить технологию.");
    } finally {
      setActionLoading(false);
    }
  };

  const ignoreTerm = (term) => {
    const key = termKey(term.term);
    const next = Array.from(new Set([...ignoredTerms, key])).filter(Boolean);
    writeIgnoredTerms(next);
    setIgnoredTerms(next);
    notify("Термин скрыт из списка.");
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Справочник</h1><p>Технологии, группы и синонимы для сверки резюме</p></div>
        <Button icon="bi-plus-lg" disabled={loading || Boolean(apiError)} onClick={() => openForm(null)}>Добавить технологию</Button>
      </div>
      <Card>
        {loading ? <div className="loading-line inline">Загружаем справочник...</div> : null}
        {apiError ? (
          <FeatureUnavailable
            title="Справочник технологий пока не подключён к backend."
            endpoint="GET /api/technologies"
            text={apiError}
          />
        ) : null}
        {!apiError ? (
          <div className="filters">
            <Input placeholder="Поиск по названию и синонимам" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        ) : null}
        {!loading && !apiError && grouped.length ? (
          <div className="dictionary-groups">
            {grouped.map(({ group, items }) => (
              <DictionarySection
                key={group}
                group={group}
                items={items}
                collapsed={Boolean(collapsedGroups[group])}
                onToggle={() => setCollapsedGroups({ ...collapsedGroups, [group]: !collapsedGroups[group] })}
                onEdit={openForm}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        ) : null}
        {!loading && !apiError && !grouped.length ? <EmptyState title="Технологии не найдены" text="Добавьте новую технологию или измените поиск." /> : null}
      </Card>
      {!apiError ? (
        <div id="unrecognized" ref={unrecognizedRef}>
        <span id="unrecognized-terms" className="anchor-target" aria-hidden="true" />
        <Card className={`resume-card ${highlightUnrecognized ? "highlight-card" : ""}`}>
          <div className="section-head">
            <div>
              <h2>Нераспознанные термины</h2>
              <p className="hint">Новые слова из резюме, которые можно добавить в справочник технологий</p>
            </div>
            {termsLoading ? <Badge>Загрузка</Badge> : <Badge>{visibleUnrecognizedTerms.length}</Badge>}
          </div>
          {termsLoading ? <div className="loading-line inline">Загружаем термины...</div> : null}
          {termsError ? (
            <FeatureUnavailable
              title="Нераспознанные термины пока не подключены к backend."
              endpoint="GET /api/unrecognized-terms"
              text={termsError}
            />
          ) : null}
          {!termsLoading && !termsError && visibleUnrecognizedTerms.length ? (
            <>
              <DataTable>
                <thead><tr><th>Термин</th><th>Контекст</th><th>Кандидат</th><th>Дата</th><th>Действие</th></tr></thead>
                <tbody>
                  {termPagination.pageItems.map((term) => (
                    <tr key={term.id}>
                      <td className="entity-name">{term.term}</td>
                      <td className="term-context-preview">{clip(term.context)}</td>
                      <td>{candidateLabel(term.candidateName)}</td>
                      <td>{formatOptionalDate(term.createdAt)}</td>
                      <td className="table-actions">
                        <Button variant="secondary" icon="bi-eye" onClick={() => setContextTerm(term)}>Контекст</Button>
                        <Button variant="secondary" icon="bi-arrow-up-circle" onClick={() => openPromoteForm(term)}>В технологию</Button>
                        <Button variant="ghost" icon="bi-eye-slash" onClick={() => ignoreTerm(term)}>Игнорировать</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              <Pagination
                page={termPagination.page}
                pageSize={termPagination.pageSize}
                totalPages={termPagination.totalPages}
                start={termPagination.start}
                end={termPagination.end}
                total={termPagination.total}
                onPageChange={termPagination.setPage}
                onPageSizeChange={termPagination.setPageSize}
              />
            </>
          ) : null}
          {!termsLoading && !termsError && !visibleUnrecognizedTerms.length ? (
            <EmptyState title="Новых терминов нет" text="Когда распознаватель найдёт незнакомые слова, они появятся здесь." />
          ) : null}
        </Card>
        </div>
      ) : null}
      {modal ? (
        <Modal title="Технология" onClose={() => setModal(false)}>
          {apiError ? <div className="alert danger">{apiError}</div> : null}
          <Field label="Название"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Группа">
            <Select value={form.group} onChange={(event) => setForm({ ...form, group: event.target.value })}>
              {technologyGroups.map((group) => <option key={group} value={group}>{groupLabels[group]}</option>)}
            </Select>
          </Field>
          <Field label="Синонимы">
            <div className="synonym-editor">
              <div className="synonym-chip-list">
                {form.synonyms.length ? form.synonyms.map((synonym) => (
                  <button key={synonym} type="button" className="tag-remove" onClick={() => removeSynonym(synonym)}>{synonym} ×</button>
                )) : <span className="hint">Синонимы не добавлены</span>}
              </div>
              <div className="add-line">
                <Input
                  value={form.synonymDraft}
                  onChange={(event) => setForm({ ...form, synonymDraft: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSynonym();
                    }
                  }}
                  placeholder="Например: php8"
                />
                <Button variant="secondary" icon="bi-plus-lg" onClick={addSynonym}>Добавить</Button>
              </div>
            </div>
          </Field>
          <div className="actions-bar">
            <Button icon="bi-check2" disabled={actionLoading} onClick={submit}>{actionLoading ? "Сохраняем..." : "Сохранить"}</Button>
            <Button variant="ghost" onClick={() => setModal(false)}>Отмена</Button>
          </div>
        </Modal>
      ) : null}
      {contextTerm ? (
        <Modal title="Контекст термина" className="wide-modal" onClose={() => setContextTerm(null)}>
          <div className="term-context-modal">
            <div className="detail-grid">
              <span><b>Термин:</b> {contextTerm.term}</span>
              <span><b>Кандидат:</b> {candidateLabel(contextTerm.candidateName)}</span>
              <span><b>Дата:</b> {formatOptionalDate(contextTerm.createdAt)}</span>
              {contextTerm.source ? <span><b>Источник:</b> {contextTerm.source}</span> : null}
            </div>
            <div className="context-text">{contextTerm.context || "Контекст не передан."}</div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setContextTerm(null)}>Закрыть</Button>
            </div>
          </div>
        </Modal>
      ) : null}
      {pendingDelete ? (
        <ConfirmModal
          title="Удалить технологию?"
          text={`Технология ${pendingDelete.name} будет удалена из справочника. Это действие нельзя отменить.`}
          loading={actionLoading}
          onCancel={() => setPendingDelete(null)}
          onConfirm={remove}
        />
      ) : null}
    </>
  );
}

function SynonymPreview({ synonyms = [] }) {
  const visible = synonyms.slice(0, 3);
  const hidden = synonyms.slice(3);
  if (!synonyms.length) return "—";
  return (
    <div className="synonym-cell">
      {visible.map((synonym) => <span key={synonym} className="synonym-token">{synonym}</span>)}
      {hidden.length ? <span className="badge synonym-more" title={synonyms.join(", ")}>+{hidden.length}</span> : null}
    </div>
  );
}

function DictionarySection({ group, items, collapsed, onToggle, onEdit, onDelete }) {
  const pagination = usePagination(items);

  return (
    <section className="dictionary-section">
      <div className="section-head">
        <h2>{groupLabels[group]}</h2>
        <div className="table-actions">
          <Badge>{items.length}</Badge>
          <Button variant="ghost" className="icon-only" aria-label={collapsed ? "Раскрыть группу" : "Скрыть группу"} onClick={onToggle}>
            <i className={`bi ${collapsed ? "bi-chevron-down" : "bi-chevron-up"}`} aria-hidden="true" />
          </Button>
        </div>
      </div>
      {!collapsed ? (
        <>
          <DataTable>
            <thead><tr><th>Название</th><th>Синонимы</th><th>Действия</th></tr></thead>
            <tbody>
              {pagination.pageItems.map((technology) => (
                <tr key={technology.id}>
                  <td className="entity-name">{technology.name}</td>
                  <td><SynonymPreview synonyms={technology.synonyms} /></td>
                  <td className="table-actions">
                    <Button variant="secondary" icon="bi-pencil" onClick={() => onEdit(technology)}>Редактировать</Button>
                    <Button variant="danger" icon="bi-trash3" onClick={() => onDelete(technology)}>Удалить</Button>
                  </td>
                </tr>
              ))}
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
    </section>
  );
}


