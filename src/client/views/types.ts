import type {
  NodeRecord,
  PacketRecord,
  Resource,
} from "../models/types.js";

export type RecordActions = {
  editar: (recurso: Resource, registro: PacketRecord | NodeRecord) => void;
  excluir: (recurso: Resource, id: string) => void;
};

export type DataTableApi = {
  clear(): DataTableApi;
  search(expression: string): DataTableApi;
  rows: {
    add(rows: HTMLTableRowElement[]): DataTableApi;
    (options: { search: string; order: string }): {
      nodes(): { toArray(): HTMLTableRowElement[] };
    };
  };
  draw(): DataTableApi;
  column(index: number): {
    search(expression: string, regex: boolean, smart: boolean): DataTableApi;
  };
};

declare global {
  interface Window {
    DataTable: new (
      table: HTMLTableElement,
      options: Record<string, unknown>,
    ) => DataTableApi;
  }
}
