# Recibo Rápido

PWA mobile-first para cadastrar inquilinos, gerar recibos tradicionais de aluguel em PDF e manter o histórico exclusivamente no dispositivo. Não há conta, backend, telemetria ou envio de dados pessoais.

## Requisitos

- Node.js 20 ou mais recente
- npm 10 ou mais recente
- Navegador moderno com IndexedDB; Chrome Android é o alvo principal

## Desenvolvimento

```bash
npm install
npm run icons
npm run dev
```

O endereço local será mostrado pelo Vite. Dados criados no desenvolvimento pertencem ao perfil desse navegador.

## Build e prévia de produção

```bash
npm run build
npm run preview -- --host
```

O build fica em `dist/`. Para testar instalação e service worker fora de `localhost`, acesse a prévia por HTTPS. O service worker não é ativado no modo `npm run dev`.

## Testes

```bash
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
```

Os testes E2E geram o build e iniciam a prévia automaticamente.

## Publicação

O conteúdo de `dist/` pode ser publicado em qualquer hospedagem estática com HTTPS. A hospedagem deve:

1. Servir `index.html` e todos os arquivos mantendo seus caminhos.
2. Usar HTTPS.
3. Não alterar os cabeçalhos dos arquivos do service worker.
4. Direcionar navegações desconhecidas para `index.html`, quando aplicável.

O projeto contém `.openai/hosting.json` para publicação pelo Sites.

## Instalação no Android

1. Abra o endereço HTTPS publicado no Chrome.
2. Abra o menu do navegador.
3. Toque em **Instalar app** ou **Adicionar à tela inicial**.
4. Confirme a instalação.

Depois do primeiro carregamento completo, as funções principais continuam disponíveis offline. Quando houver uma versão nova, o aplicativo mostra um aviso e só atualiza após a confirmação do usuário.

## Armazenamento local

Pessoas, configurações, assinatura, recibos e PDFs são armazenados no IndexedDB do navegador. Os valores monetários são guardados em centavos inteiros. Cada recibo contém uma cópia dos dados usados na emissão e o PDF original; editar ou excluir uma pessoa não altera documentos antigos.

Os dados podem ser perdidos se o aplicativo, o perfil do navegador ou os dados do site forem apagados. O aplicativo solicita armazenamento persistente quando o navegador permite, mas isso não substitui os backups.

## Backup e restauração

Em **Configurações → Dados e backup**:

- **Fazer backup** cria um ZIP versionado com manifesto, hashes SHA-256, registros, assinatura e PDFs.
- **Restaurar backup** valida integralmente o arquivo antes de pedir confirmação.
- A restauração substitui os dados atuais em uma única transação e reconcilia os contadores anuais para evitar números repetidos.

Guarde o ZIP fora do aparelho, especialmente antes de trocar de celular ou limpar dados do navegador.

## Decisões de confiabilidade

- A numeração anual é confirmada junto com o recibo e o PDF em uma transação IndexedDB. Emissões concorrentes repetem a tentativa com o próximo número disponível.
- Recibos não podem ser apagados nesta versão.
- O compartilhamento usa Web Share com arquivo quando disponível e recorre ao download do PDF.
- Imagens de assinatura são processadas no navegador e nunca enviadas para serviços externos.
