# PacketHub

> Aplicação Web para captura, análise visual e inspeção por camadas de pacotes de rede em tempo real.

## Ideia, Objetivo Principal & Público-Alvo
- **Ideia & Objetivo:** Criar um "Wireshark na Web" simplificado que permita capturar, filtrar e inspecionar pacotes de rede e seus cabeçalhos por camadas (Modelo OSI/TCP-IP) diretamente pelo navegador.
- **Público-Alvo:** Administradores de rede, estudantes de TI, analistas de segurança e desenvolvedores que buscam analisar tráfego de rede de forma rápida e acessível sem instalar softwares desktop complexos.
- **Problema:** A análise de pacotes no terminal via CLI (`tcpdump` / `tshark`) é difícil e exige comandos complexos. Já softwares como o Wireshark exigem instalação local pesada e possuem interfaces poluídas para tarefas rápidas.
- **Solução & Valor:** O PacketHub oferece uma interface gráfica moderna e responsiva no navegador, organizando a captura em tabelas limpas, filtros de protocolo e um inspetor visual de camadas e payload permitindo realizar a análise dos dados.

## Benchmarking (Análise Comparativa)
| Ferramenta | Pontos Fortes | Limitações | Diferencial da Solução |
| ---------- | ------------- | ---------- | ---------------------- |
| Wireshark  | Inspeção profunda e suporte a diferentes tipos de protocolos | Aplicação desktop pesada com curva de aprendizado alta | Interface Web moderna, focada e acessível via navegador sem instalações |
| TShark     | Captura leve de alta performance via linha de comando | Exige domínio de terminal e filtros CLI complexos | Visualização gráfica intuitiva com tabela interativa e painel de inspeção |
| CloudShark | Análise colaborativa de arquivos PCAP na Web | Solução comercial paga e focada em arquivos estáticos | Aplicação open-source para captura em tempo real e foco didático/operacional |

## Equipe
- **Andrei Laureano Cordeiro** - 20251380031 | [GitHub](https://github.com/andreilaureanoc-cpu)
- **Eduardo William Cavalcante Martins** - 20251380019 | [GitHub](https://github.com/eduardowilliam-oss)
- **Gabriel Farias Palmeira** - 20251380016 | [GitHub](https://github.com/GabrielIFP2005)

## Documentação & Recursos
- **Pitch / Apresentação:** [Link dos slides da proposta](docs/pitch.pdf)
- **Protótipos / Design:** [Ver protótipos](docs/prototypes/) | [Figma](https://figma.com)
- **Workflow / Kanban:** [GitHub Projects](https://github.com/orgs/usuario/projects/1)
- **Documentação do Projeto:** [Ver pasta de documentação](docs/)

## Páginas da Aplicação
- [Visão geral](index.html)
- [Nós monitorados](nodes.html)
- [Pacotes](packets.html)
- [Protocolos](protocols.html)
- [Alertas](alerts.html)
- [Relatórios](reports.html)

## Funcionalidades Planejadas (Features)
- [x] Visualização de métricas (CPU, Memória, Latência) e status de servidores no Dashboard com dados fictícios
- [x] Layout responsivo para as telas do sistema (Dashboard, Nós, Alertas e Configurações)
- [ ] Filtro e busca dinâmica por IP, host e status dos serviços de rede (HTTP, DNS, SSH, DHCP)
- [x] Consumo de API simulada via `json-server` com dados dinâmicos de servidores e incidentes (Projeto 1.1)
- [ ] Autenticação e controle de acesso de operadores de rede (Login/Logout com JWT)
- [ ] Servidor de API RESTful em Express.js para coleta e gerenciamento dos nós de rede (Projeto 1.2)
- [ ] Persistência de registros de métricas, histórico de uptime e incidentes em Banco de Dados com Prisma ORM
- [ ] Notificação automática de falhas de serviço e exportação de relatórios de tráfego/disponibilidade

## Estratégia para Obtenção de Dados Reais (Hipóteses Técnicas)
- **Fontes de Dados & Coleta:** Execução do utilitário `tshark` (ou `tcpdump`) em segundo plano no servidor Linux capturando pacotes na interface de rede e exportando o tráfego diretamente em formato JSON estruturado (`tshark -T json -i any`).
- **Armazenamento & API:** Construção de uma API REST em Express.js com integração de WebSockets/SSE em Node.js para transmitir os pacotes capturados pelo `tshark` em tempo real para o front-end, persistindo sessões de captura e estatísticas de tráfego em banco de dados com Prisma ORM.
