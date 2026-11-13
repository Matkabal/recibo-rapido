const items = [
  ['Como cadastrar uma pessoa?', 'Abra Pessoas, toque no botão +, preencha os dados e toque em Salvar.'],
  ['Como gerar um recibo?', 'Na tela Início, toque em Gerar novo recibo. Escolha a pessoa, confira mês e valor, confirme o recebimento e gere o PDF.'],
  ['Como alterar o mês do aluguel?', 'Na tela de geração, toque em Mês do aluguel e escolha outro mês e ano. A data de emissão continuará sendo a data atual.'],
  ['Como cadastrar minha assinatura?', 'Abra Configurações, vá até Minha assinatura e escolha desenhar ou importar uma imagem.'],
  ['Como apagar e refazer minha assinatura?', 'No desenho, toque em Apagar tudo. Sua assinatura antiga só será substituída quando você tocar em OK.'],
  ['Como importar uma assinatura?', 'Em Minha assinatura, toque em Importar imagem. Escolha uma foto, recorte, ajuste e confirme a prévia.'],
  ['Onde encontro os recibos antigos?', 'Abra a aba Histórico. Você pode pesquisar pelo nome e filtrar por mês ou ano.'],
  ['Como compartilhar um PDF?', 'Abra um recibo e toque em Compartilhar. Se o celular não oferecer essa opção, o PDF será baixado para você enviá-lo manualmente.'],
  ['Como fazer backup?', 'Abra Configurações, vá até Dados e backup e toque em Fazer backup. Guarde o arquivo em um lugar seguro.'],
  ['Como restaurar meus dados?', 'Em Dados e backup, toque em Restaurar backup e escolha um arquivo criado pelo aplicativo. Confira o resumo antes de confirmar.'],
  ['O aplicativo funciona sem internet?', 'Sim. Depois do primeiro carregamento, cadastro, recibos, PDFs, histórico e backup funcionam offline.'],
  ['O que acontece se eu trocar de celular?', 'Faça um backup no aparelho antigo, transfira o arquivo e use Restaurar backup no aparelho novo.']
]

export function HelpPage(){return <section className="page"><header className="page-header"><div><h1>Ajuda</h1><p>Respostas rápidas, quando você precisar.</p></div></header>{items.map(([question,answer])=><details className="accordion" key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>}
