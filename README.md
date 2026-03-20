# Domain Checked

Aplicação full stack com React + Tailwind no front-end e Express + SQLite no back-end para cadastrar domínios, autenticar usuários e verificar o status dos domínios em tempo real por polling.

## Requisitos

- **Node.js 22 LTS**. O projeto usa `better-sqlite3`, então versões muito novas do Node podem ficar sem binário pré-compilado. No Windows, o Node `25.3.0` costuma cair em build nativo e falhar durante o `npm install`.
- **npm 11+**.
- **Python 3** instalado e disponível no `PATH` apenas se você insistir em usar uma versão do Node sem binário pronto para `better-sqlite3`.

> Recomendação: use Node 22 LTS com `npm install` para evitar compilar dependências nativas e também evitar depender do download do Yarn via Corepack.

## Recursos

- Cadastro, login e sessão com JWT.
- Fluxo de esqueci a senha com geração de token de redefinição.
- Cadastro e remoção de domínios por usuário.
- Checagem manual e automática dos domínios a cada 30 segundos.
- Consulta RDAP para estimar expiração de registro, registrador e janela de renovação.
- Persistência local em SQLite.
- Interface responsiva com Tailwind CSS.

## Como rodar

1. Copie `.env.example` para `.env`.
2. Se você usa `nvm`, rode `nvm use` para carregar a versão definida em `.nvmrc`.
3. Instale dependências com `npm install`.
4. Rode `npm run dev`.

A API sobe em `http://localhost:3001` e o front-end em `http://localhost:5173`.

## Se o Yarn falhar antes mesmo de instalar

Em alguns ambientes, o comando `yarn` é fornecido pelo **Corepack**. Nesses casos, o Corepack tenta baixar o Yarn de `https://registry.yarnpkg.com/` antes de executar qualquer coisa. Se sua rede, proxy ou firewall bloquear esse download, você pode ver um erro parecido com:

- `Error when performing the request to https://registry.yarnpkg.com/yarn/-/yarn-1.22.22.tgz`
- `Proxy response (403) !== 200 when HTTP Tunneling`

Quando isso acontecer, use **npm** neste projeto:

1. `npm install`
2. `npm run dev`

Este repositório agora inclui `package-lock.json` e `packageManager: npm@11.4.2` para deixar esse fluxo como padrão.

## Erro no Windows com `better-sqlite3`

Se o `npm install` falhar com uma mensagem parecida com `No prebuilt binaries found` e `gyp ERR! find Python`, isso normalmente significa que você está usando uma versão do Node nova demais para o binário publicado do `better-sqlite3`.

### Correção recomendada

1. Instale ou selecione o **Node 22 LTS**.
2. Apague `node_modules` e qualquer arquivo de lock gerado parcialmente.
3. Rode `npm install` novamente.

### Alternativa

Se você realmente precisar manter outra versão do Node, instale o Python 3 e as ferramentas de build do `node-gyp`, depois configure o caminho do Python para o npm. Ainda assim, a opção mais estável para este projeto é usar Node 22 LTS.
