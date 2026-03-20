# Domain Checked

Aplicação full stack com React + Tailwind no front-end e Express + SQLite no back-end para cadastrar domínios, autenticar usuários e verificar o status dos domínios em tempo real por polling.

## Recursos

- Cadastro, login e sessão com JWT.
- Fluxo de esqueci a senha com geração de token de redefinição.
- Cadastro e remoção de domínios por usuário.
- Checagem manual e automática dos domínios a cada 30 segundos.
- Persistência local em SQLite.
- Interface responsiva com Tailwind CSS.

## Como rodar

1. Copie `.env.example` para `.env`.
2. Instale dependências com `npm install`.
3. Rode `npm run dev`.

A API sobe em `http://localhost:3001` e o front-end em `http://localhost:5173`.
