export function FeatureUnavailable({ title = "Функция пока не подключена к backend.", endpoint, text }) {
  return (
    <div className="feature-unavailable">
      <div className="feature-unavailable-icon">
        <i className="bi bi-plug" aria-hidden="true" />
      </div>
      <div>
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
        {endpoint ? <code>{endpoint}</code> : null}
      </div>
    </div>
  );
}
