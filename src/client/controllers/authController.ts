import { autenticar } from "../models/authModel.js";
import { tokenSessionKey } from "../models/apiClient.js";
import { limparErro, mostrarErro } from "../views/dom.js";

const form = document.querySelector<HTMLFormElement>("#auth-form");
const toggle = document.querySelector<HTMLButtonElement>("#auth-toggle");
const submit = document.querySelector<HTMLButtonElement>("#auth-submit");
const password = document.querySelector<HTMLInputElement>("#auth-password");
let modo: "login" | "register" = "login";

toggle?.addEventListener("click", () => {
  modo = modo === "login" ? "register" : "login";
  if (submit) submit.textContent = modo === "login" ? "Entrar" : "Criar conta";
  if (toggle) {
    toggle.textContent =
      modo === "login" ? "Criar uma conta" : "Já tenho uma conta";
  }
  if (password) {
    password.autocomplete =
      modo === "login" ? "current-password" : "new-password";
  }
  limparErro();
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  limparErro();
  const dados = new FormData(form);
  const email = String(dados.get("email") || "");
  const senha = String(dados.get("password") || "");

  try {
    const sessao = await autenticar(modo, email, senha);
    sessionStorage.setItem(tokenSessionKey, sessao.token);
    const next = new URLSearchParams(location.search).get("next");
    const destino = next ? new URL(next, location.origin) : null;
    location.replace(
      destino?.origin === location.origin ? destino.href : "/index.html",
    );
  } catch (erro) {
    mostrarErro(erro);
  }
});
