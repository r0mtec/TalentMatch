import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input, Select } from "../../components/ui/Form.jsx";
import { Pagination, usePagination } from "../../components/ui/Pagination.jsx";
import { DataTable, EmptyState } from "../../components/ui/Table.jsx";
import { gradeOptions } from "../../data/mockData.js";
import { useMockApi } from "../../services/mockApi.js";
import { formatDate, gradeBadge } from "../../utils/formatters.js";

export function ComparisonPage() {
  const navigate = useNavigate();
  const { requests, candidates } = useMockApi();
  const [requestId, setRequestId] = useState("Все");
  const [grade, setGrade] = useState("Все");
  const [coverageStatus, setCoverageStatus] = useState("Все");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("coverage-desc");
  const requestById = useMemo(() => Object.fromEntries(requests.map((request) => [request.id, request])), [requests]);

  const rows = useMemo(() => candidates
    .filter((candidate) => {
      const skills = candidate.recognizedSkills || candidate.skills || [];
      const missingMust = candidate.assessment?.missingMustRequirements?.length || 0;
      const text = `${candidate.fullName || candidate.fio || ""} ${skills.map((skill) => skill.title || skill.raw_text).join(" ")}`.toLowerCase();
      return candidate.requestId
        && candidate.assessment
        && (requestId === "Все" || candidate.requestId === requestId)
        && (grade === "Все" || candidate.grade === grade)
        && (coverageStatus === "Все" || (coverageStatus === "Подходит" ? missingMust === 0 : missingMust > 0))
        && (!query.trim() || text.includes(query.trim().toLowerCase()));
    })
    .sort((a, b) => {
      if (sort === "coverage-desc") return b.assessment.totalCoverage - a.assessment.totalCoverage;
      if (sort === "coverage-asc") return a.assessment.totalCoverage - b.assessment.totalCoverage;
      if (sort === "name") return (a.fullName || "").localeCompare(b.fullName || "", "ru");
      return new Date(b.uploadedAt || b.created_at) - new Date(a.uploadedAt || a.created_at);
    }), [candidates, coverageStatus, grade, query, requestId, sort]);
  const pagination = usePagination(rows);

  return (
    <>
      <div className="page-head">
        <div><h1>Сравнение кандидатов</h1><p>Сравнение всех кандидатов или кандидатов выбранной заявки</p></div>
      </div>
      <Card>
        <div className="filters">
          <Input placeholder="Поиск по ФИО или навыкам" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select value={requestId} onChange={(event) => setRequestId(event.target.value)}>
            <option value="Все">Запрос: Все</option>
            {requests.map((item) => <option key={item.id} value={item.id}>{item.id} {item.position}</option>)}
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
            <option value="name">По ФИО</option>
            <option value="uploaded">По дате загрузки</option>
          </Select>
        </div>
        {rows.length ? (
          <>
            <DataTable>
              <thead><tr><th>Кандидат</th><th>Связанный запрос</th><th>Грейд</th><th>Общее</th><th>Must have</th><th>Nice to have</th><th>Нет must</th><th>Статус</th><th>Действие</th></tr></thead>
              <tbody>
                {pagination.pageItems.map((candidate) => {
                  const assessment = candidate.assessment;
                  const request = requestById[candidate.requestId];
                  return (
                    <tr key={candidate.id}>
                      <td className="entity-name">{candidate.fullName || candidate.fio || candidate.fileName || "Кандидат без имени"}</td>
                      <td>{request ? `${request.id} ${request.position}` : "Не привязан"}</td>
                      <td><Badge tone={gradeBadge(candidate.grade)}>{candidate.grade}</Badge></td>
                      <td>{assessment.totalCoverage}%</td>
                      <td>{assessment.mustCoverage}%</td>
                      <td>{assessment.niceCoverage}%</td>
                      <td>{assessment.missingMustRequirements.length}</td>
                      <td><Badge tone={assessment.missingMustRequirements.length ? "status-draft" : "status-active"}>{assessment.missingMustRequirements.length ? "Неполное" : "Подходит"}</Badge></td>
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
        ) : <EmptyState title="Нет кандидатов для сравнения" text="Измените фильтры или прикрепите резюме к заявке." />}
      </Card>
    </>
  );
}
