export async function apiRequest<T>(
  caminho: string,
  opcoes?: RequestInit,
): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, opcoes);
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
