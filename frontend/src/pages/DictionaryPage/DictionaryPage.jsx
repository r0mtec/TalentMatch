import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input, Select } from "../../components/ui/Form.jsx";
import { ConfirmModal, Modal } from "../../components/ui/Modal.jsx";
import { Pagination, usePagination } from "../../components/ui/Pagination.jsx";
import { DataTable, EmptyState } from "../../components/ui/Table.jsx";
import { useToast } from "../../components/ui/Toast.jsx";
import { technologyGroups } from "../../data/mockData.js";
import { useMockApi } from "../../services/mockApi.js";
import {
  addTechnologySynonym,
  createTechnology as createBackendTechnology,
  deleteTechnology as deleteBackendTechnology,
  deleteTechnologySynonym,
  getTechnologies,
  updateTechnology as updateBackendTechnology,
} from "../../services/technologiesApi.js";
import { groupLabels } from "../../utils/formatters.js";

const blank = { name: "", group: "languages", synonyms: "" };

export function DictionaryPage() {
  const { technologies: mockTechnologies, createTechnology, updateTechnology, deleteTechnology, loading } = useMockApi();
  const { notify } = useToast();
  const [technologies, setTechnologies] = useState([]);
  const [usingMockFallback, setUsingMockFallback] = useState(false);
  const [apiError, setApiError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setApiError("");
      try {
        const items = await getTechnologies({ include_inactive: true });
        if (!ignore) {
          setTechnologies(items);
          setUsingMockFallback(false);
        }
      } catch (caught) {
        if (!ignore) {
          setTechnologies(mockTechnologies);
          setUsingMockFallback(true);
          setApiError(caught.message || "Не удалось загрузить справочник с backend.");
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [mockTechnologies]);

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

  const openForm = (technology) => {
    setForm(technology ? { ...technology, synonyms: technology.synonyms.join(", ") } : blank);
    setModal(true);
  };

  const syncBackendSynonyms = async (technology, nextSynonyms) => {
    const currentItems = technology.synonymItems || [];
    const currentValues = currentItems.map((item) => item.synonym.toLowerCase());
    const nextValues = nextSynonyms.map((item) => item.toLowerCase());
    const additions = nextSynonyms.filter((item) => !currentValues.includes(item.toLowerCase()));
    const removals = currentItems.filter((item) => !nextValues.includes(item.synonym.toLowerCase()) && item.id);
    await Promise.all(additions.map((synonym) => addTechnologySynonym(technology.id, synonym)));
    await Promise.all(removals.map((synonym) => deleteTechnologySynonym(synonym.id)));
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      name: form.name.trim(),
      synonyms: form.synonyms.split(",").map((item) => item.trim()).filter(Boolean),
    };
    if (form.id) {
      if (usingMockFallback) {
        await updateTechnology(form.id, payload);
      } else {
        await updateBackendTechnology(form.id, payload);
        await syncBackendSynonyms(form, payload.synonyms);
        setTechnologies(await getTechnologies({ include_inactive: true }));
      }
    } else {
      if (usingMockFallback) {
        await createTechnology(payload);
      } else {
        const created = await createBackendTechnology(payload);
        await syncBackendSynonyms(created, payload.synonyms);
        setTechnologies(await getTechnologies({ include_inactive: true }));
      }
    }
    notify("Технология сохранена.");
    setModal(false);
  };

  const remove = async () => {
    if (usingMockFallback) {
      await deleteTechnology(pendingDelete.id);
    } else {
      await deleteBackendTechnology(pendingDelete.id);
      setTechnologies(await getTechnologies({ include_inactive: true }));
    }
    notify("Технология удалена.");
    setPendingDelete(null);
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Справочник</h1><p>Технологии, группы и синонимы для сверки резюме</p></div>
        <Button icon="bi-plus-lg" onClick={() => openForm(null)}>Добавить технологию</Button>
      </div>
      <Card>
        {usingMockFallback ? <div className="alert warning">Справочник показан в mock-режиме: {apiError}</div> : null}
        <div className="filters">
          <Input placeholder="Поиск по названию и синонимам" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        {grouped.length ? (
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
        ) : <EmptyState title="Технологии не найдены" text="Добавьте новую технологию или измените поиск." />}
      </Card>
      {modal ? (
        <Modal title="Технология" onClose={() => setModal(false)}>
          <Field label="Название"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Группа">
            <Select value={form.group} onChange={(event) => setForm({ ...form, group: event.target.value })}>
              {technologyGroups.map((group) => <option key={group} value={group}>{groupLabels[group]}</option>)}
            </Select>
          </Field>
          <Field label="Синонимы"><Input value={form.synonyms} onChange={(event) => setForm({ ...form, synonyms: event.target.value })} placeholder="php8, php 8.2" /></Field>
          <div className="actions-bar">
            <Button icon="bi-check2" disabled={loading} onClick={submit}>{loading ? "Сохраняем..." : "Сохранить"}</Button>
            <Button variant="ghost" onClick={() => setModal(false)}>Отмена</Button>
          </div>
        </Modal>
      ) : null}
      {pendingDelete ? (
        <ConfirmModal
          title="Удалить технологию?"
          text={`Технология ${pendingDelete.name} будет удалена из справочника. Это действие нельзя отменить.`}
          loading={loading}
          onCancel={() => setPendingDelete(null)}
          onConfirm={remove}
        />
      ) : null}
    </>
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
                  <td>{technology.synonyms.length ? technology.synonyms.join(", ") : "—"}</td>
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
