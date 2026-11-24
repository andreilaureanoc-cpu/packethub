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

Esta seção descreve a execução no seu computador físico com Linux, sem o GitHub Codespaces.

### 1. Instale o Git, o Node.js e o tcpdump

No Ubuntu, Debian ou distribuições semelhantes:

```bash
sudo apt update
sudo apt install git curl tcpdump nodejs npm iproute2 openssl
```

É necessário Node.js 22.5 ou superior. Confira as versões instaladas:

```bash
node --version
npm --version
tcpdump --version
```

Se a versão do Node.js estiver desatualizada, instale o Node.js 24 pelo NVM:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
exec bash
nvm install 24
nvm use 24
```

### 2. Baixe o projeto

```bash
cd ~
git clone https://github.com/andreilaureanoc-cpu/packethub.git
cd packethub
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Configure o ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Gere uma chave de segurança:

```bash
openssl rand -hex 32
```

Abra o arquivo `.env`:

```bash
nano .env
```

Exemplo de configuração:

```env
PORT=8080
DATABASE_PATH=data/packethub.sqlite
JWT_SECRET=COLE_AQUI_A_CHAVE_GERADA

TCPDUMP_ENABLED=true
TCPDUMP_INTERFACES=eth0
TCPDUMP_PATH=tcpdump
TRUST_PROXY=false
```

Substitua `eth0` pela interface de rede ativa do seu computador.

Liste as interfaces disponíveis:

```bash
ip -br addr
```

O nome poderá ser `eth0`, `enp3s0`, `wlp2s0` ou semelhante.

### 5. Autorize a captura de pacotes

Instale a biblioteca de permissões:

```bash
sudo apt install libcap2-bin
```

Conceda ao `tcpdump` somente as permissões necessárias:

```bash
sudo setcap cap_net_raw,cap_net_admin=eip /usr/bin/tcpdump
```

Confirme as permissões:

```bash
getcap /usr/bin/tcpdump
```

Depois dessa configuração, não será necessário iniciar o PacketHub com `sudo`.

Se não quiser autorizar a captura real, deixe esta opção no `.env`:

```env
TCPDUMP_ENABLED=false
TCPDUMP_INTERFACES=
```

### 6. Inicie o servidor

Com captura habilitada:

```bash
npm start
```

O servidor compila o TypeScript e inicia a aplicação Express e a API REST. Acesse no navegador:

```text
http://localhost:8080/login.html
```

Para mudar a porta, altere `PORT` no arquivo `.env`.

### 7. Crie o usuário e teste a aplicação

1. Abra `http://localhost:8080/login.html`.
2. Cadastre um usuário.
3. Entre no painel.
4. Gere algum tráfego na rede.

Por exemplo:

```bash
ping 1.1.1.1
curl https://example.com
```

Depois, inicie a captura na interface do painel.

Para parar o PacketHub, pressione `Ctrl+C` no terminal.

### Desenvolvimento com atualização automática

Em um terminal, execute a compilação contínua:

```bash
npm run build:watch
```

Em outro terminal, execute o servidor com reinício automático:

```bash
npm run start:watch
```

Durante uma captura ativa, o painel consulta o estado e atualiza os pacotes a cada dois segundos.

### Testes e validação

Execute os testes de integração da API:

```bash
npm test
```

Valide os tipos TypeScript sem gerar arquivos:

```bash
npm run typecheck
```

### Problemas comuns

#### Interface não encontrada

Liste as interfaces:

```bash
ip -br addr
```

Depois, atualize `TCPDUMP_INTERFACES` no `.env` e reinicie o servidor.

#### Tcpdump não encontra permissões

Confirme que as capabilities foram instaladas:

```bash
getcap /usr/bin/tcpdump
```

Caso estejam vazias, execute novamente:

```bash
sudo setcap cap_net_raw,cap_net_admin=eip /usr/bin/tcpdump
```

#### Nenhum pacote aparece

Teste o `tcpdump` diretamente, substituindo `eth0` pela interface correta:

```bash
tcpdump -i eth0 -c 5
```

#### Porta 8080 já está ocupada

Altere a porta no `.env`:

```env
PORT=3000
```

Depois, acesse:

```text
http://localhost:3000/login.html
```

Os dados são persistidos em SQLite no arquivo `data/packethub.sqlite`. As migrations versionadas em `src/server/migrations/` criam e evoluem o schema; na primeira inicialização, [seed.sql](src/server/seed.sql) registra apenas a configuração inicial neutra da captura e das camadas. O projeto não cria nós ou pacotes fictícios automaticamente. O client nativo `node:sqlite` executa as consultas parametrizadas. Para usar outro caminho, defina `DATABASE_PATH`.

Ao iniciar uma captura, os registros demonstrativos existentes na tabela de pacotes são removidos; o filtro e o histórico mostram apenas os pacotes capturados desde a inicialização da captura. A captura fica desativada por padrão, não usa a interface genérica `any`, aceita somente filtros predefinidos, armazena metadados resumidos e para após 1.000 pacotes ou cinco minutos.

O painel exige cadastro ou login em `login.html`. As senhas são armazenadas com scrypt; o servidor assina JWTs de uma hora com `JWT_SECRET`, protege as rotas da API e revoga o token no logout. O navegador mantém o token somente na sessão da aba.

## Organização do código TypeScript

O código segue MVC. No cliente, `models/` acessa a API e calcula dados, `views/` renderiza a interface e `controllers/` coordena eventos e fluxo da aplicação. No servidor Express, `routes/` encaminha as rotas, `middleware/` autentica JWTs, `controllers/` implementa os casos de uso e centraliza erros, `models/` consulta o SQLite e `infrastructure/` configura banco e autenticação.

### Fluxo recomendado para alterações

- Interfaces HTTP ficam nas páginas `.html` e nos controladores de cliente.
- Regras de apresentação ficam em `src/client/views/`.
- Chamadas à API e estado obtido do servidor ficam em `src/client/models/`.
- Coordenação de eventos fica em `src/client/controllers/`.
- Rotas REST ficam em `src/server/routes/`.
- Validação e casos de uso ficam em `src/server/controllers/`.
- Consultas e regras de persistência ficam em `src/server/models/`.
- Banco, autenticação e integração com `tcpdump` ficam em `src/server/infrastructure/`.
- Mudanças do banco devem ser adicionadas como uma migration numerada em `src/server/migrations/`.

Ao adicionar uma nova página, mantenha o mesmo fluxo:

1. Adicione o HTML da página.
2. Conecte-a ao `applicationController.ts` ou crie um controlador dedicado.
3. Coloque chamadas HTTP em `src/client/models/`.
4. Implemente a renderização em `src/client/views/`.
5. Exponha a operação em uma rota de `src/server/routes/apiRoutes.ts`.
6. Valide os dados em `src/server/controllers/`.
7. Execute consultas em `src/server/models/`.

## Captura de tráfego e registro de visitas

A captura real é opcional e fica desativada por padrão. Para habilitá-la, o servidor precisa ter `tcpdump` instalado e permissões de captura concedidas pelo administrador do host. Configure `TCPDUMP_ENABLED=true` e `TCPDUMP_INTERFACES` com uma lista explícita de interfaces autorizadas (por exemplo, `eth0`). Os controles usam a autenticação normal do painel, sem um token adicional de administração; o controle remoto exige HTTPS.

O painel oferece filtros predefinidos (todo tráfego, TCP, UDP, ICMP e DNS); comandos livres não são aceitos. O filtro “todo tráfego” inclui pacotes de protocolos que não tenham decodificação específica no PacketHub, preservando o resumo apresentado pelo tcpdump. O armazenamento de todos os pacotes tem limite de 100 MB (100.000.000 bytes); ao atingir o limite, os registros mais antigos são removidos primeiro, inclusive manuais ou demonstrativos. Esse limite conta os bytes UTF-8 dos campos dos pacotes, não o tamanho total do arquivo SQLite. A captura também para após 1.000 pacotes ou cinco minutos e requer HTTPS para controles remotos. Em implantação atrás de um proxy HTTPS confiável, configure `TRUST_PROXY=true`.

Na lista de pacotes, tráfego capturado com origem ou destino igual ao IP de um host cadastrado recebe destaque azul e o nome do host. Na lista de hosts, os protocolos observados na captura são exibidos com suas contagens, incluindo ICMP; sem tráfego capturado correspondente, a tela informa que ainda não há observações.

Cada carregamento de página HTML registra uma visita na tabela `access_logs` com endereço IP, User-Agent e página. Esses registros são removidos após um dia. Esse log não autentica nem identifica uma pessoa por si só.

## Funcionalidades Planejadas (Features)
- [x] Visualização de métricas de pacotes, nós monitorados e status de servidores a partir dos dados do servidor
- [x] Layout responsivo para as telas do sistema (Dashboard, Nós, Alertas e Configurações)
- [x] Filtro e busca dinâmica por IP, host, serviço e status dos nós
- [x] API REST local com persistência SQLite para pacotes, nós, captura e camadas
- [x] Autenticação e controle de acesso de operadores de rede (Cadastro/Login/Logout com JWT)
- [x] Exportação de pacotes e relatórios em CSV
- [ ] Histórico persistente e notificações externas de falhas de serviço

## Estratégia para Obtenção de Dados Reais (Hipóteses Técnicas)
- **Fontes de Dados & Coleta:** Execução do utilitário `tshark` (ou `tcpdump`) em segundo plano no servidor Linux capturando pacotes na interface de rede e exportando o tráfego diretamente em formato JSON estruturado (`tshark -T json -i any`).
- **Armazenamento & API:** A API REST local já persiste os dados em SQLite. Como evolução, a captura com `tshark` poderá transmitir pacotes em tempo real via WebSockets/SSE e ampliar o histórico armazenado.
