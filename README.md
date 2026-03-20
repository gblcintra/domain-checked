# Domain Checked

Aplicação full stack com React + Tailwind no front-end e Express + SQLite no back-end para cadastrar domínios, autenticar usuários e verificar o status dos domínios em tempo real por polling.

## Requisitos

- **Node.js 22 LTS**. O projeto usa `better-sqlite3`, então versões muito novas do Node podem ficar sem binário pré-compilado. No Windows, o Node `25.3.0` costuma cair em build nativo e falhar durante o `yarn install`.
- **Yarn 1.22.22** ou **npm**.
- **Python 3** instalado e disponível no `PATH` apenas se você insistir em usar uma versão do Node sem binário pronto para `better-sqlite3`.

> Recomendação: use Node 22 LTS para evitar compilar dependências nativas.

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
3. Instale dependências com `yarn install` ou `npm install`.
4. Rode `yarn dev` ou `npm run dev`.

A API sobe em `http://localhost:3001` e o front-end em `http://localhost:5173`.

## Erro no Windows com `better-sqlite3`

Se o `yarn install` falhar com uma mensagem parecida com `No prebuilt binaries found` e `gyp ERR! find Python`, isso normalmente significa que você está usando uma versão do Node nova demais para o binário publicado do `better-sqlite3`.

### Correção recomendada

1. Instale ou selecione o **Node 22 LTS**.
2. Apague `node_modules` e qualquer arquivo de lock gerado parcialmente.
3. Rode `yarn install` novamente.

### Alternativa

Se você realmente precisar manter outra versão do Node, instale o Python 3 e as ferramentas de build do `node-gyp`, depois configure o caminho do Python para o npm. Ainda assim, a opção mais estável para este projeto é usar Node 22 LTS.
