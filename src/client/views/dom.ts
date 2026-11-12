export const formatarNumero = new Intl.NumberFormat("pt-BR");

export function elemento<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classe = "",
  texto = "",
): HTMLElementTagNameMap[K] {
  const novoElemento = document.createElement(tag);
  novoElemento.className = classe;
  novoElemento.textContent = texto ?? "";
  return novoElemento;
}

export function mostrarErro(erro: unknown) {
  const aviso = document.querySelector("#api-feedback");
  if (!aviso) return;
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  aviso.textContent = `Não foi possível concluir a operação: ${mensagem}`;
  aviso.classList.remove("d-none");
}

export function limparErro() {
  const aviso = document.querySelector("#api-feedback");
  if (!aviso) return;
  aviso.textContent = "";
  aviso.classList.add("d-none");
}
