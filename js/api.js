const endpointRecurso = { packets: "packetRecords", nodes: "nodeRecords" };

async function requisitar(caminho, opcoes) {
  const resposta = await fetch(`/api${caminho}`, opcoes);
  const texto = await resposta.text();
  let dados = texto;

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
      mensagem = dados.message || dados.error;
    }
    throw new Error(
      `${mensagem || "Falha na requisição"} (HTTP ${resposta.status})`,
    );
  }
  return dados;
}

export function listarPacotes(protocolo = "") {
  const filtro = protocolo ? `?protocol=${encodeURIComponent(protocolo)}` : "";
  return requisitar(`/packetRecords${filtro}`);
}

export function listarNos() {
  return requisitar("/nodeRecords");
}

export function obterResumo() {
  return requisitar("/stats");
}

export function obterCaptura() {
  return requisitar("/capture");
}

export function listarCamadas() {
  return requisitar("/layers");
}

export function salvarRegistro(recurso, id, dados) {
  const caminho = `/${endpointRecurso[recurso]}${id === null ? "" : `/${encodeURIComponent(id)}`}`;
  return requisitar(caminho, {
    method: id === null ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
}

export function excluirRegistro(recurso, id) {
  return requisitar(
    `/${endpointRecurso[recurso]}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function atualizarCaptura(alteracoes) {
  return requisitar("/capture", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(alteracoes),
  });
}