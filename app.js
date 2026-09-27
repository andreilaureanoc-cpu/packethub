// Endereço do JSON Server.
const api = "http://localhost:3000";
const formatarNumero = new Intl.NumberFormat("en-US");

// Dados que a página recebe do servidor.
let pacotes = [];
let nos = [];
let captura = {};
let recursoEditado = "";
let idEditado = null;

function elemento(tag, classe = "", texto = "") {
  const novoElemento = document.createElement(tag);
  novoElemento.className = classe;
  novoElemento.textContent = texto ?? "";
  return novoElemento;
}

function mostrarErro(erro) {
  const aviso = document.querySelector("#api-feedback");
  aviso.textContent = `Não foi possível concluir a operação: ${erro.message}`;
  aviso.classList.remove("hidden");
}

function limparErro() {
  const aviso = document.querySelector("#api-feedback");
  aviso.textContent = "";
  aviso.classList.add("hidden");
}

// Lê a resposta e interrompe o fluxo se o status HTTP indicar erro.
async function lerResposta(resposta) {
  const texto = await resposta.text();
  let dados = texto;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    if (resposta.ok)
      throw new Error("O servidor retornou uma resposta inválida.");
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

function adicionarCelula(linha, valor, classe = "") {
  const celula = elemento("td", classe, valor);
  linha.appendChild(celula);
  return celula;
}

function mostrarLinhaVazia(tabela, quantidadeColunas, mensagem, classe) {
  const linha = elemento("tr");
  const celula = elemento("td", classe, mensagem);
  celula.colSpan = quantidadeColunas;
  linha.appendChild(celula);
  tabela.replaceChildren(linha);
}

function textoDaInformacao(pacote) {
  if (typeof pacote.info === "string") return pacote.info;
  if (pacote.info && pacote.info.flags) {
    let texto = `[${pacote.info.flags.join(", ")}]`;
    if (pacote.info.sequenceNumber)
      texto += ` Seq=${pacote.info.sequenceNumber}`;
    if (pacote.info.windowSize) texto += ` Win=${pacote.info.windowSize}`;
    if (pacote.info.payloadLength) texto += ` Len=${pacote.info.payloadLength}`;
    return texto;
  }
  if (pacote.info && pacote.info.queryType) {
    return `${pacote.info.queryType} ${pacote.info.recordType} ${pacote.info.domain}`;
  }
  return (pacote.info && pacote.info.summary) || "—";
}

function adicionarBotoesDeAcao(celula, recurso, registro) {
  const grupo = elemento("div", "flex gap-2 font-sans whitespace-nowrap");
  const editar = elemento(
    "button",
    "font-semibold text-teal hover:underline",
    "Editar",
  );
  editar.type = "button";
  editar.addEventListener("click", () => abrirFormulario(recurso, registro));

  const excluir = elemento(
    "button",
    "font-semibold text-signal hover:underline",
    "Excluir",
  );
  excluir.type = "button";
  excluir.addEventListener("click", () =>
    excluirRegistro(recurso, registro.id),
  );

  grupo.appendChild(editar);
  grupo.appendChild(excluir);
  celula.appendChild(grupo);
}

function mostrarPacotes() {
  const tabela = document.querySelector("#packets-body");
  const busca = document.querySelector("#packet-search").value.toLowerCase();
  const limite = document.querySelector("#packet-limit").value;

  let pacotesVisiveis = pacotes.filter((pacote) => {
    const texto = `${pacote.id} ${pacote.time} ${pacote.src} ${pacote.dst} ${pacote.protocol} ${textoDaInformacao(pacote)}`;
    return texto.toLowerCase().includes(busca);
  });
  pacotesVisiveis.sort((primeiro, segundo) =>
    segundo.time.localeCompare(primeiro.time),
  );
  if (limite !== "all") {
    pacotesVisiveis = pacotesVisiveis.slice(0, Number(limite));
  }

  if (pacotesVisiveis.length === 0) {
    mostrarLinhaVazia(
      tabela,
      8,
      "Nenhum pacote encontrado.",
      "px-5 py-8 text-center font-sans text-[#78918b]",
    );
    return;
  }

  const cores = {
    TCP: "bg-[#e7f6ee] text-teal",
    UDP: "bg-[#fff3da] text-[#a26900]",
    DNS: "bg-[#eef3ff] text-[#526fa6]",
    HTTP: "bg-[#fff0ed] text-signal",
  };

  tabela.replaceChildren();
  for (let indice = 0; indice < pacotesVisiveis.length; indice++) {
    const pacote = pacotesVisiveis[indice];
    const linha = elemento("tr", indice === 0 ? "bg-[#fffaf8]" : "");
    let idExibido = pacote.id;
    if (/^\d+$/.test(String(pacote.id))) {
      idExibido = formatarNumero.format(Number(pacote.id));
    }

    adicionarCelula(
      linha,
      idExibido,
      `px-5 py-4 font-bold ${indice === 0 ? "text-signal" : "text-[#78918b]"}`,
    );
    adicionarCelula(linha, pacote.time, "px-5 py-4 text-[#66817a]");
    adicionarCelula(linha, pacote.src, "px-5 py-4");
    adicionarCelula(linha, pacote.dst, "px-5 py-4");

    const etiqueta = elemento(
      "b",
      `rounded px-2 py-1 font-sans ${cores[pacote.protocol] || "bg-[#eef6f1] text-[#66817a]"}`,
      pacote.protocol,
    );
    adicionarCelula(linha, "", "px-5 py-4").appendChild(etiqueta);
    adicionarCelula(linha, textoDaInformacao(pacote), "px-5 py-4");
    adicionarCelula(linha, pacote.size, "px-5 py-4");
    adicionarBotoesDeAcao(
      adicionarCelula(linha, "", "px-5 py-4"),
      "packets",
      pacote,
    );
    tabela.appendChild(linha);
  }
}

function mostrarNos() {
  const tabela = document.querySelector("#nodes-body");
  const contador = document.querySelector("#node-count");
  contador.textContent = `${nos.length} ${nos.length === 1 ? "host ativo" : "hosts ativos"}`;

  if (nos.length === 0) {
    mostrarLinhaVazia(
      tabela,
      7,
      "Nenhum nó cadastrado.",
      "px-3 py-8 text-center text-[#78918b]",
    );
    return;
  }

  tabela.replaceChildren();
  for (const no of nos) {
    const linha = elemento("tr");
    let corStatus = "signal";
    if (no.status === "Operacional") corStatus = "teal";
    if (no.status === "Atenção") corStatus = "[#b27608]";

    adicionarCelula(linha, no.host, "px-3 py-3 font-semibold");
    adicionarCelula(linha, no.ip, "px-3 py-3 font-mono");
    adicionarCelula(linha, no.service, "px-3 py-3");
    adicionarCelula(linha, no.latency, "px-3 py-3");
    adicionarCelula(linha, no.load, "px-3 py-3");
    adicionarCelula(
      linha,
      `● ${no.status}`,
      `px-3 py-3 font-bold text-${corStatus}`,
    );
    adicionarBotoesDeAcao(adicionarCelula(linha, "", "px-3 py-3"), "nodes", no);
    tabela.appendChild(linha);
  }
}

async function carregarPacotes() {
  const protocolo = document.querySelector("#protocol-filter").value;
  let url = `${api}/packets`;
  if (protocolo) url += `?protocol=${encodeURIComponent(protocolo)}`;

  const resposta = await fetch(url);
  pacotes = await lerResposta(resposta);
  mostrarPacotes();
}

async function carregarNos() {
  const resposta = await fetch(`${api}/nodes`);
  nos = await lerResposta(resposta);
  mostrarNos();
}

async function carregarResumo() {
  const resposta = await fetch(`${api}/stats`);
  const resumo = await lerResposta(resposta);
  document.querySelector("#stat-captured").textContent = formatarNumero.format(
    resumo.captured,
  );
  document.querySelector("#stat-rate").textContent = formatarNumero.format(
    resumo.rate,
  );
  document.querySelector("#stat-data").textContent = formatarNumero.format(
    resumo.dataMB,
  );
  document.querySelector("#stat-dropped").textContent = resumo.droppedPct;

  for (const protocolo of resumo.protocols) {
    const cartao = document.querySelector(
      `[data-protocol="${protocolo.name}"]`,
    );
    if (cartao) {
      cartao.querySelector("span").textContent = protocolo.percentage;
      cartao.querySelector("strong").textContent = formatarNumero.format(
        protocolo.total,
      );
      cartao.querySelector("p").textContent = protocolo.label;
    }
  }
}

async function carregarCaptura() {
  const resposta = await fetch(`${api}/capture`);
  captura = await lerResposta(resposta);
  document.querySelector("#capture-interface").textContent = captura.interface;
  document.querySelector("#capture-command").textContent = captura.command;
  document.querySelector("#capture-duration").textContent = captura.duration;
  document.querySelector("#capture-filter").value = captura.filter;

  const status = document.querySelector("#capture-status");
  status.lastChild.textContent = captura.active
    ? " Captura em andamento"
    : " Captura pausada";
  status.classList.toggle("text-signal", captura.active);
  status.classList.toggle("text-[#78918b]", !captura.active);
  status.querySelector("i").classList.toggle("bg-signal", captura.active);
  status.querySelector("i").classList.toggle("bg-[#78918b]", !captura.active);

  const botao = document.querySelector("#capture-toggle");
  botao.textContent = captura.active ? "Parar captura" : "Retomar captura";
}

async function carregarCamadas() {
  const resposta = await fetch(`${api}/layers`);
  const camadas = await lerResposta(resposta);
  for (const camada of camadas) {
    const linha = document.querySelector(`#layer-${camada.id}`);
    if (linha)
      linha.querySelector("b").textContent = camada.protocols.join(" · ");
  }
}

async function carregarPagina() {
  limparErro();
  try {
    await carregarPacotes();
    await carregarNos();
    await carregarResumo();
    await carregarCaptura();
    await carregarCamadas();
  } catch (erro) {
    mostrarErro(erro);
  }
}

const campos = {
  packets: [
    ["time", "Tempo", "text"],
    ["src", "Origem", "text"],
    ["dst", "Destino", "text"],
    ["protocol", "Protocolo", "select", ["TCP", "UDP", "DNS", "HTTP"]],
    ["info", "Informação", "text"],
    ["size", "Tamanho", "text"],
  ],
  nodes: [
    ["host", "Host", "text"],
    ["ip", "IP", "text"],
    ["service", "Serviço", "text"],
    ["latency", "Latência", "text"],
    ["load", "Carga", "text"],
    ["status", "Status", "select", ["Operacional", "Atenção", "Indisponível"]],
  ],
};

function abrirFormulario(recurso, registro = null) {
  recursoEditado = recurso;
  idEditado = registro ? registro.id : null;
  document.querySelector("#dialog-kicker").textContent =
    recurso === "packets" ? "Pacote" : "Nó monitorado";
  document.querySelector("#dialog-title").textContent = registro
    ? "Editar registro"
    : "Novo registro";
  document.querySelector("#dialog-submit").textContent = registro
    ? "Salvar alterações"
    : "Criar registro";

  const formulario = document.querySelector("#record-fields");
  formulario.replaceChildren();

  for (const campo of campos[recurso]) {
    const nome = campo[0];
    const rotulo = campo[1];
    const tipo = campo[2];
    const opcoes = campo[3];
    const etiqueta = elemento(
      "label",
      "text-xs font-semibold text-[#52635f]",
      rotulo,
    );
    const entrada = document.createElement(
      tipo === "select" ? "select" : "input",
    );
    entrada.id = `field-${nome}`;
    entrada.name = nome;
    entrada.required = true;
    entrada.className =
      tipo === "select"
        ? "mt-1 w-full rounded-lg border border-[#d3e1db] bg-white px-3 py-2.5 text-sm"
        : "mt-1 w-full rounded-lg border border-[#d3e1db] px-3 py-2.5 text-sm outline-none focus:border-[#137f78]";

    if (tipo === "select") {
      for (const opcao of opcoes) {
        const item = elemento("option", "", opcao);
        item.value = opcao;
        entrada.appendChild(item);
      }
      if (registro) entrada.value = registro[nome];
    } else {
      entrada.type = "text";
      if (registro) entrada.value = registro[nome] || "";
    }

    etiqueta.appendChild(entrada);
    formulario.appendChild(etiqueta);
  }
  document.querySelector("#record-dialog").showModal();
}

async function salvarRegistro(evento) {
  evento.preventDefault();
  limparErro();

  const formulario = evento.currentTarget;
  const entradas = formulario.querySelectorAll("[name]");
  const dados = {};
  for (const entrada of entradas) dados[entrada.name] = entrada.value;

  let url = `${api}/${recursoEditado}`;
  let metodo = "POST";
  if (idEditado) {
    url += `/${encodeURIComponent(idEditado)}`;
    metodo = "PATCH";
  }

  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    await lerResposta(resposta);
    document.querySelector("#record-dialog").close();

    if (recursoEditado === "packets") await carregarPacotes();
    else await carregarNos();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function excluirRegistro(recurso, id) {
  if (!confirm(`Excluir o registro ${id}?`)) return;
  limparErro();

  try {
    const resposta = await fetch(
      `${api}/${recurso}/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
    await lerResposta(resposta);

    if (recurso === "packets") await carregarPacotes();
    else await carregarNos();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function atualizarCaptura(alteracoes) {
  limparErro();
  try {
    const resposta = await fetch(`${api}/capture`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alteracoes),
    });
    captura = await lerResposta(resposta);
    await carregarCaptura();
  } catch (erro) {
    mostrarErro(erro);
  }
}

document
  .querySelector("#add-packet")
  .addEventListener("click", () => abrirFormulario("packets"));
document
  .querySelector("#add-node")
  .addEventListener("click", () => abrirFormulario("nodes"));
document
  .querySelector("#packet-search")
  .addEventListener("input", mostrarPacotes);
document
  .querySelector("#packet-limit")
  .addEventListener("change", mostrarPacotes);
document
  .querySelector("#protocol-filter")
  .addEventListener("change", () => carregarPacotes().catch(mostrarErro));
document
  .querySelector("#dialog-close")
  .addEventListener("click", () =>
    document.querySelector("#record-dialog").close(),
  );
document
  .querySelector("#dialog-cancel")
  .addEventListener("click", () =>
    document.querySelector("#record-dialog").close(),
  );
document
  .querySelector("#record-form")
  .addEventListener("submit", salvarRegistro);
document
  .querySelector("#capture-toggle")
  .addEventListener("click", () =>
    atualizarCaptura({ active: !captura.active }),
  );
document
  .querySelector("#capture-filter")
  .addEventListener("change", (evento) =>
    atualizarCaptura({ filter: evento.currentTarget.value }),
  );

carregarPagina();
