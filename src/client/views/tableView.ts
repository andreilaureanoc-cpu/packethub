import { elemento } from "./dom.js";
import type { NodeRecord, PacketRecord, Resource } from "../models/types.js";
import type { DataTableApi, RecordActions } from "./types.js";

const instanciasTabela = new WeakMap<HTMLTableElement, DataTableApi>();

const idiomaDataTables = {
  info: "Exibindo _START_ a _END_ de _TOTAL_ registros",
  infoEmpty: "Exibindo 0 registros",
  infoFiltered: "(filtrados de _MAX_ registros)",
  lengthMenu: "Exibir _MENU_ registros",
  loadingRecords: "Carregando...",
  processing: "Processando...",
  search: "Buscar:",
  searchPlaceholder: "Buscar registros",
  zeroRecords: "Nenhum registro correspondente encontrado.",
  paginate: {
    first: "Primeira",
    last: "Última",
    next: "Próxima",
    previous: "Anterior",
  },
};

export function atualizarTabela(
  corpoTabela: HTMLTableSectionElement | null,
  linhas: HTMLTableRowElement[],
  configuracao: {
    pageLength: number;
    lengthMenu: unknown;
    order: [number, "asc" | "desc"][];
    emptyTable: string;
  },
): void {
  const tabela = corpoTabela?.closest("table");
  if (!tabela) return;

  let instancia = instanciasTabela.get(tabela);
  if (!instancia) {
    instancia = new window.DataTable(tabela, {
      pageLength: configuracao.pageLength,
      lengthMenu: configuracao.lengthMenu,
      order: configuracao.order,
      columnDefs: [{ targets: -1, orderable: false, searchable: false }],
      language: {
        ...idiomaDataTables,
        emptyTable: configuracao.emptyTable,
      },
    });
    instanciasTabela.set(tabela, instancia);
  }

  instancia.clear().rows.add(linhas).draw();
}

export function obterInstanciaTabela(
  tabela: HTMLTableElement,
): DataTableApi | undefined {
  return instanciasTabela.get(tabela);
}

export function adicionarCelula(
  linha: HTMLTableRowElement,
  valor: string,
  classe = "",
): HTMLTableCellElement {
  const celula = elemento("td", classe, valor);
  linha.appendChild(celula);
  return celula;
}

export function adicionarBotoesDeAcao(
  celula: HTMLTableCellElement,
  recurso: Resource,
  registro: PacketRecord | NodeRecord,
  acoes: RecordActions,
): void {
  const grupo = elemento("div", "d-flex gap-2 text-nowrap");
  const editar = elemento(
    "button",
    "btn btn-link btn-sm p-0 fw-semibold text-teal",
    "Editar",
  );
  editar.type = "button";
  editar.addEventListener("click", () => acoes.editar(recurso, registro));

  const excluir = elemento(
    "button",
    "btn btn-link btn-sm p-0 fw-semibold text-coral",
    "Excluir",
  );
  excluir.type = "button";
  excluir.addEventListener("click", () => acoes.excluir(recurso, registro.id));

  grupo.append(editar, excluir);
  celula.appendChild(grupo);
}
