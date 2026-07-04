import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input } from "../../components/ui/Form.jsx";
import { login as backendLogin } from "../../services/authApi.js";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!login.trim() || !password.trim()) {
      setError("Введите логин и пароль.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await backendLogin({ login, password });
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (caught) {
      setError(caught.message || "Не удалось войти в систему.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <span className="brand-mark">HR</span>
          <h1>TalentMatch</h1>
        </div>
        <form onSubmit={submit}>
          {error ? <div className="alert danger">{error}</div> : null}
          <Field label="Логин">
            <Input value={login} onChange={(event) => setLogin(event.target.value)} placeholder="anna.smirnova" />
          </Field>
          <Field label="Пароль">
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Введите пароль" />
          </Field>
          <Button className="full" icon="bi-box-arrow-in-right" type="submit" disabled={loading}>{loading ? "Входим..." : "Войти в систему"}</Button>
        </form>
      </Card>
    </main>
  );
}
