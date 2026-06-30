import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input } from "../../components/ui/Form.jsx";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState("login");
  const [login, setLogin] = useState("anna.smirnova");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (!login.trim() || !password.trim()) {
      setError("Введите логин и пароль.");
      return;
    }
    window.localStorage.setItem(
      "talentmatch_user",
      JSON.stringify({ name: "Анна Смирнова", initials: "АС", role: "account_manager" }),
    );
    navigate(location.state?.from || "/dashboard", { replace: true });
  };

  return (
    <main className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <span className="brand-mark">HR</span>
          <h1>TalentMatch</h1>
        </div>
        <div className="tabs">
          <button type="button" className={tab === "login" ? "active" : ""} onClick={() => setTab("login")}>Войти</button>
          <button type="button" className={tab === "register" ? "active" : ""} onClick={() => setTab("register")}>Регистрация</button>
        </div>
        <form onSubmit={submit}>
          {error ? <div className="alert danger">{error}</div> : null}
          <Field label="Логин">
            <Input value={login} onChange={(event) => setLogin(event.target.value)} placeholder="anna.smirnova" />
          </Field>
          <Field label="Пароль">
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Введите пароль" />
          </Field>
          <a className="muted-link" href="#forgot">Забыли пароль?</a>
          <Button className="full" icon="bi-box-arrow-in-right" type="submit">Войти в систему</Button>
        </form>
        {tab === "register" ? <p className="hint">Регистрация пока работает как визуальная вкладка демо-режима.</p> : null}
      </Card>
    </main>
  );
}
