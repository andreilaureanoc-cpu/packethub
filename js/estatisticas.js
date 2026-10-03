import { formatarNumero } from "./dom.js";

const unidadesBytes = {
  B: 1,
  KB: 1000,
  KIB: 1024,
  MB: 1000 ** 2,
  MIB: 1024 ** 2,
  GB: 1000 ** 3,
  GIB: 1024 ** 3,
};

const rotulosProtocolos = {
  TCP: "Conexões observadas",
  UDP: "Datagramas observados",
  DNS: "Consultas resolvidas",
  HTTP: "Requisições analisadas",
};

const formatarDecimal = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});
const formatarPercentual = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

function converterTamanhoParaBytes(tamanho) {
  const correspondencia = String(tamanho ?? "")
    .trim()
    .replace(/,/g, "")
    .match(/^(\d+(?:\.\d+)?)\s*(B|KB|KIB|MB|MIB|GB|GIB)$/i);
  if (!correspondencia) return null;

  const valor = Number(correspondencia[1]);
  const unidade = correspondencia[2].toUpperCase();
  return valor * unidadesBytes[unidade];
}

function formatarTamanho(bytes) {
  const unidades = ["B", "KB", "MB", "GB"];
  let indice = 0;
  let valor = bytes;

  while (valor >= 1000 && indice < unidades.length - 1) {
    valor /= 1000;
    indice += 1;
  }

  return `${formatarDecimal.format(valor)} ${unidades[indice]}`;
}

function converterHorarioParaMilissegundos(horario) {
  const correspondencia = String(horario ?? "").match(
    /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/,
  );
  if (!correspondencia) return null;

  const [, horas, minutos, segundos, fracao = "0"] = correspondencia;
  const milissegundos = Number(fracao.slice(0, 3).padEnd(3, "0"));
  return (
    Number(horas) * 3_600_000 +
    Number(minutos) * 60_000 +
    Number(segundos) * 1000 +
    milissegundos
  );
}

function calcularTaxa(pacotes) {
  const horarios = pacotes
    .map((pacote) => converterHorarioParaMilissegundos(pacote.time))
    .filter((horario) => horario !== null)
    .sort((primeiro, segundo) => primeiro - segundo);
  if (horarios.length < 2) return 0;

  let duracao = horarios.at(-1) - horarios[0];
  const meioDia = 12 * 60 * 60 * 1000;
  const dia = 24 * 60 * 60 * 1000;
  if (duracao > meioDia) duracao = dia - duracao;
  if (duracao <= 0) return 0;

  return Math.round((horarios.length - 1) / (duracao / 1000));
}

export function calcularResumoPacotes(pacotes) {
  const totaisPorProtocolo = new Map();
  for (const pacote of pacotes) {
    const protocolo = String(pacote.protocol ?? "Não identificado");
    totaisPorProtocolo.set(
      protocolo,
      (totaisPorProtocolo.get(protocolo) || 0) + 1,
    );
  }

  const protocolos = Array.from(totaisPorProtocolo, ([name, total]) => ({
    name,
    total,
    percentage: formatarPercentual.format(total / pacotes.length),
    label: rotulosProtocolos[name] || `Pacotes ${name}`,
  })).sort((primeiro, segundo) => segundo.total - primeiro.total);

  const tamanhos = pacotes
    .map((pacote) => converterTamanhoParaBytes(pacote.size))
    .filter((tamanho) => tamanho !== null);
  const dataLabel = tamanhos.length
    ? formatarTamanho(tamanhos.reduce((total, tamanho) => total + tamanho, 0))
    : "N/D";

  const descarteMensurado =
    pacotes.length > 0 &&
    pacotes.every((pacote) => typeof pacote.dropped === "boolean");
  const droppedPct = descarteMensurado
    ? formatarPercentual.format(
        pacotes.filter((pacote) => pacote.dropped).length / pacotes.length,
      )
    : null;

  return {
    captured: pacotes.length,
    rate: calcularTaxa(pacotes),
    dataLabel,
    droppedPct,
    protocols: protocolos,
  };
}