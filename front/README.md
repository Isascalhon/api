# TURBO CHAOS

Corrida arcade 3D original para navegador, criada com Next.js, React e Three.js. A primeira versão jogável inclui a fase Cidade Turbo, carro controlável, dois rivais, turbo, baterias, obstáculos, três voltas, pausa e tela de resultados.

## Requisitos

- Node.js 20 ou superior
- npm
- Navegador moderno com WebGL 2

## Instalação e execução

```bash
cd front
npm install
npm run dev
```

Acesse http://localhost:3000. Para produção, use `npm run build` e `npm run start`.

## Controles

- W ou ↑: acelerar
- S ou ↓: frear e ré
- A/D ou ←/→: direcionar
- Espaço: derrapagem/freio de mão
- Shift: turbo
- Esc: pausar ou continuar

Os botões na tela também funcionam como controles táteis.

## Estrutura

- `app/`: configuração Next.js, tela principal e estilos
- `components/TurboChaos.js`: menus, HUD, configurações e integração com React
- `game/GameManager.js`: cena Three.js, controles, física arcade, IA, colisões, itens, voltas, áudio e câmera

## Conteúdo da primeira versão

- Cidade Turbo é a única fase jogável nesta versão.
- Luna e seu carro artesanal são jogáveis. Max Veloz e Nix são rivais controlados por IA.
- O áudio é sintetizado localmente com Web Audio e começa após interação do usuário.
- Modelos e cenário são construídos com geometrias próprias do Three.js; não há recursos externos ou serviços pagos.

A campanha Deserto das Engrenagens, Floresta Caótica e Circuito do Caos, personagens de história completos, modelos externos e músicas compostas são conteúdo futuro.
