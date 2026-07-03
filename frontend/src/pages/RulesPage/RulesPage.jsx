import { Card } from "../../components/ui/Card.jsx";

export function RulesPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Правила оценки</h1>
          <p>Настройка правил сопоставления кандидатов и требований</p>
        </div>
      </div>
      <Card>
        <p className="hint">Настройка правил оценки будет доступна после подключения backend.</p>
      </Card>
    </>
  );
}

