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

## Executar localmente

Requer Node.js 22.5 ou superior. Instale as dependências com `npm install`, copie `.env.example` para `.env` e defina `JWT_SECRET` com pelo menos 32 caracteres aleatórios (gere um valor com `openssl rand -hex 32`). Depois inicie a aplicação com `npm start`. O comando compila o TypeScript e inicia o servidor Express e a API REST na porta configurada em `PORT`.

Os dados são persistidos em SQLite no arquivo `data/packethub.sqlite`. Migrations versionadas em `src/server/migrations/` criam e evoluem o schema; na primeira inicialização, o banco também recebe os dados de demonstração de [seed.sql](src/server/seed.sql). O client nativo `node:sqlite` executa as consultas parametrizadas. Para usar outro caminho, defina `DATABASE_PATH`.

Os pacotes exibidos passam a ser exclusivamente dados reais do `tcpdump`. Ao iniciar uma captura, os registros demonstrativos existentes na tabela de pacotes são removidos; o filtro e o histórico mostram apenas os pacotes capturados desde a inicialização da captura.

O painel exige cadastro ou login em `login.html`. As senhas são armazenadas com scrypt; o servidor assina JWTs de uma hora com `JWT_SECRET`, protege as rotas da API e revoga o token no logout. O navegador mantém o token somente na sessão da aba. Registros de pacotes e nós criados por usuários guardam uma relação opcional com o usuário autor.

Use `npm test` para compilar e executar os testes de integração da API. `npm run typecheck` valida os tipos sem gerar arquivos.

Para desenvolvimento com recompilação de TypeScript e reinício automático do servidor, inicie a tarefa **Start PacketHub** no VS Code. No terminal, execute `npm run build:watch` e `npm run start:watch` em terminais separados. Durante uma captura ativa, o painel consulta o estado e atualiza os pacotes a cada dois segundos.

Para captura pelo VS Code, instale `tcpdump` (por exemplo, `sudo apt install tcpdump`) e conceda ao processo as permissões de captura necessárias; depois pare a tarefa **Start PacketHub** e inicie **Start PacketHub (tcpdump)**. A tarefa solicitará a interface autorizada. Alternativamente, defina `TCPDUMP_ENABLED=true` e `TCPDUMP_INTERFACES` como uma lista explícita de interfaces autorizadas no `.env`. Os controles de captura exigem uma sessão autenticada no painel e HTTPS para acessos remotos. A captura fica desativada por padrão, não usa a interface genérica `any`, aceita somente filtros predefinidos, armazena metadados resumidos e para após 1.000 pacotes ou cinco minutos. O tcpdump captura tráfego; ele não o gera.

## Organização do código TypeScript

O código segue MVC. No cliente, `models/` acessa a API e calcula dados, `views/` renderiza a interface e `controllers/` coordena eventos e fluxo da aplicação. No servidor Express, `routes/` encaminha as rotas, `middleware/` autentica JWTs, `controllers/` implementa os casos de uso e centraliza erros, `models/` consulta o SQLite e `infrastructure/` configura banco e autenticação.

## Captura de tráfego e registro de visitas

A captura real é opcional e fica desativada por padrão. Para habilitá-la, o servidor precisa ter `tcpdump` instalado e permissões de captura concedidas pelo administrador do host. Configure `TCPDUMP_ENABLED=true` e `TCPDUMP_INTERFACES` com uma lista explícita de interfaces autorizadas (por exemplo, `eth0`). Os controles usam a autenticação normal do painel, sem um token adicional de administração; o controle remoto exige HTTPS.

O painel oferece filtros predefinidos (todo tráfego, TCP, UDP, ICMP e DNS); comandos livres não são aceitos. A captura guarda somente metadados resumidos, para no máximo 1.000 pacotes ou após cinco minutos e requer HTTPS para controles remotos. Em implantação atrás de um proxy HTTPS confiável, configure `TRUST_PROXY=true`.

Cada carregamento de página HTML registra uma visita na tabela `access_logs` com endereço IP, User-Agent e página. Esses registros são removidos após um dia. Esse log não autentica nem identifica uma pessoa por si só.

## Funcionalidades Planejadas (Features)
- [x] Visualização de métricas (CPU, Memória, Latência) e status de servidores no Dashboard com dados fictícios
- [x] Layout responsivo para as telas do sistema (Dashboard, Nós, Alertas e Configurações)
- [ ] Filtro e busca dinâmica por IP, host e status dos serviços de rede (HTTP, DNS, SSH, DHCP)
- [x] API REST local com persistência SQLite para pacotes, nós, captura e camadas
- [x] Autenticação e controle de acesso de operadores de rede (Cadastro/Login/Logout com JWT)
- [ ] Notificação automática de falhas de serviço e exportação de relatórios de tráfego/disponibilidade

## Estratégia para Obtenção de Dados Reais (Hipóteses Técnicas)
- **Fontes de Dados & Coleta:** Execução do utilitário `tshark` (ou `tcpdump`) em segundo plano no servidor Linux capturando pacotes na interface de rede e exportando o tráfego diretamente em formato JSON estruturado (`tshark -T json -i any`).
- **Armazenamento & API:** A API REST local já persiste os dados em SQLite. Como evolução, a captura com `tshark` poderá transmitir pacotes em tempo real via WebSockets/SSE e ampliar o histórico armazenado.
