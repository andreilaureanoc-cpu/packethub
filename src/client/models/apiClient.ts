export const tokenSessionKey = "packethub.jwt";

export async function apiRequest<T>(
  caminho: string,
  opcoes?: RequestInit,
): Promise<T> {
  const headers = new Headers(opcoes?.headers);
  const token = sessionStorage.getItem(tokenSessionKey);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const resposta = await fetch(`/api${caminho}`, { ...opcoes, headers });
  if (
    resposta.status === 401 &&
    caminho !== "/auth/login" &&
    caminho !== "/auth/register"
  ) {
    sessionStorage.removeItem(tokenSessionKey);
    const next = encodeURIComponent(location.pathname + location.search);
    window.location.replace(`/login.html?next=${next}`);
  }
  const texto = await resposta.text();
  let dados: unknown = texto;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    if (resposta.ok) {
      throw new Error("O servidor retornou uma resposta inválida.");
    }
  }

  if (!resposta.ok) {
    let mensagem = dados;
    if (dados && typeof dados === "object") {
      const respostaErro = dados as { message?: string; error?: string };
      mensagem = respostaErro.message || respostaErro.error;
    }
    throw new Error(
      `${mensagem || "Falha na requisição"} (HTTP ${resposta.status})`,
    );
  }
  return dados as T;
}
