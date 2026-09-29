export const formatarNumero = new Intl.NumberFormat("en-US");

export function elemento(tag, classe = "", texto = "") {
  const novoElemento = document.createElement(tag);
  novoElemento.className = classe;
  novoElemento.textContent = texto ?? "";
  return novoElemento;
}

export function mostrarErro(erro) {
  const aviso = document.querySelector("#api-feedback");
  if (!aviso) return;
  aviso.textContent = `Não foi possível concluir a operação: ${erro.message}`;
  aviso.classList.remove("hidden");
}

export function limparErro() {
  const aviso = document.querySelector("#api-feedback");
  if (!aviso) return;
  aviso.textContent = "";
  aviso.classList.add("hidden");
}