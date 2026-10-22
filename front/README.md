# EventoSENAI — Front-end

Aplicação em Next.js (App Router) para consultar eventos escolares e integrar cadastro e inscrições à API Express.

## Rodar localmente

1. Inicie o MySQL e a API na porta 3333.
2. Na pasta `front`, instale as dependências com `npm install`.
3. Confira o endereço da API em `.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:3333`).
4. Rode `npm run dev` e acesse http://localhost:3000.

A tela consulta `GET /eventos` e `GET /participantes`, usa `POST /participantes` para cadastro, `POST /inscricoes` para inscrição e `GET /eventos/:id/inscritos` para mostrar a lista. Mensagens de sucesso e erros devolvidos pela API aparecem na tela; os dados e as vagas são recarregados após cada operação.
