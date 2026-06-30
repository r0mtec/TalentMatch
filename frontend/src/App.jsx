import React from 'react';
import { createRoot } from 'react-dom/client';
import { FileUp, ListFilter, Percent, Settings } from 'lucide-react';
import './styles.css';

const requests = [
  { id: 'REQ-001', title: 'Senior PHP / Laravel', grade: 'senior', status: 'active', score: 86 },
  { id: 'REQ-002', title: 'React Frontend', grade: 'middle+', status: 'draft', score: 74 }
];

function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">TalentMatch</div>
        <button className="nav-item active"><ListFilter size={18} /> Запросы</button>
        <button className="nav-item"><FileUp size={18} /> Резюме</button>
        <button className="nav-item"><Percent size={18} /> Отчеты</button>
        <button className="nav-item"><Settings size={18} /> Справочники</button>
      </aside>

      <section className="workspace">
        <header className="toolbar">
          <div>
            <h1>Запросы заказчиков</h1>
            <p>Каркас интерфейса для создания запроса, загрузки резюме и просмотра покрытия.</p>
          </div>
          <button className="primary-button">Создать запрос</button>
        </header>

        <div className="grid">
          <section className="panel">
            <h2>Активные запросы</h2>
            <div className="request-list">
              {requests.map((request) => (
                <article className="request-row" key={request.id}>
                  <div>
                    <strong>{request.title}</strong>
                    <span>{request.id} · {request.grade} · {request.status}</span>
                  </div>
                  <b>{request.score}%</b>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Последний assessment</h2>
            <div className="score">86%</div>
            <p className="muted">Must have: 80%, nice to have: 100%. Одно обязательное требование требует ручной проверки evidence.</p>
          </section>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
