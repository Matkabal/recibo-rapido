import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('abre na tela inicial e navega pelas cinco abas', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading',{name:'Recibo Rápido'})).toBeVisible()
  for (const tab of ['Pessoas','Histórico','Configurações','Ajuda']) { await page.getByRole('button',{name:tab,exact:true}).click(); await expect(page.getByRole('heading',{name:tab,exact:true})).toBeVisible() }
})

test('cadastra uma pessoa e preserva após recarregar', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button',{name:'Pessoas',exact:true}).click(); await page.getByRole('button',{name:'Adicionar pessoa'}).click()
  await page.getByLabel('Nome completo').fill('Maria da Silva'); await page.getByLabel('CPF').fill('52998224725'); await page.getByLabel('Valor padrão do aluguel').fill('850'); await page.getByRole('button',{name:'Salvar',exact:true}).click()
  await expect(page.getByText('Maria da Silva')).toBeVisible(); await page.reload(); await page.getByRole('button',{name:'Pessoas',exact:true}).click(); await expect(page.getByText('Maria da Silva')).toBeVisible()
})

test('gera e preserva o PDF original no histórico', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button',{name:'Configurações',exact:true}).click()
  await page.getByLabel('Nome completo').fill('José Recebedor')
  await page.getByLabel('Cidade de emissão').fill('Salvador')
  await page.getByRole('button',{name:'Salvar dados'}).click()
  await page.getByRole('button',{name:'Pessoas',exact:true}).click()
  await page.getByRole('button',{name:'Adicionar pessoa'}).click()
  await page.getByLabel('Nome completo').fill('João da Silva')
  await page.getByLabel('CPF').fill('52998224725')
  await page.getByLabel('Valor padrão do aluguel').fill('850')
  await page.getByRole('button',{name:'Salvar',exact:true}).click()
  await page.getByRole('button',{name:'Início',exact:true}).click()
  await page.getByRole('button',{name:'Gerar novo recibo'}).click()
  await page.getByLabel('Pessoa').selectOption({label:'João da Silva'})
  await expect(page.getByLabel('Valor recebido')).toHaveValue(/R\$\s850,00/)
  await page.getByLabel('Valor recebido').fill('900')
  await page.getByLabel('Valor recebido').blur()
  await expect(page.getByLabel('Valor recebido')).toHaveValue(/R\$\s900,00/)
  await page.getByLabel('Confirmo que o pagamento acima foi realmente recebido.').check()
  await page.getByRole('dialog').getByRole('button',{name:'Gerar recibo',exact:true}).click()
  await page.getByRole('button',{name:'Gerar sem assinatura'}).click()
  await expect(page.getByRole('heading',{name:'Salvo no celular'})).toBeVisible({timeout:15000})
  await expect(page.getByRole('dialog').getByText(/Recibo Nº 2026-0001/)).toBeVisible()
  await page.getByRole('button',{name:'Concluir'}).click()
  await page.getByRole('button',{name:'Histórico',exact:true}).click()
  await expect(page.getByText('João da Silva')).toBeVisible()
  await expect(page.getByText('R$ 900,00')).toBeVisible()
  await page.getByRole('button',{name:'Pessoas',exact:true}).click()
  await expect(page.getByText('R$ 850,00')).toBeVisible()
})

test('expõe manifest e service worker no build', async ({ request }) => {
  const manifest = await request.get('./manifest.webmanifest')
  expect(manifest.ok()).toBeTruthy()
  expect((await manifest.json()).name).toBe('Recibo Rápido')
  expect((await request.get('./sw.js')).ok()).toBeTruthy()
})

test('desenha, salva e preserva a assinatura ao cancelar', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button',{name:'Configurações',exact:true}).click()
  await page.getByRole('button',{name:'Desenhar ou importar assinatura'}).click()
  const canvas = page.getByLabel('Área para desenhar assinatura')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Área de assinatura não encontrada')
  await page.mouse.move(box.x + 45, box.y + 110)
  await page.mouse.down()
  await page.mouse.move(box.x + 125, box.y + 70, {steps:8})
  await page.mouse.move(box.x + 210, box.y + 125, {steps:8})
  await page.mouse.up()
  await page.getByRole('button',{name:'OK'}).click()
  await expect(page.getByAltText('Assinatura atual')).toBeVisible()
  await page.getByRole('button',{name:'Substituir assinatura'}).click()
  await page.getByRole('button',{name:'Cancelar'}).click()
  await expect(page.getByAltText('Assinatura atual')).toBeVisible()
})

test('importa e confirma uma assinatura como imagem', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button',{name:'Configurações',exact:true}).click()
  await page.getByRole('button',{name:'Desenhar ou importar assinatura'}).click()
  await page.getByRole('button',{name:'Importar imagem'}).click()
  await page.locator('#signature-file').setInputFiles({name:'assinatura.svg',mimeType:'image/svg+xml',buffer:readFileSync(resolve('public/icon-source.svg'))})
  await expect(page.getByText('Zoom')).toBeVisible()
  await page.getByRole('button',{name:'Visualizar resultado'}).click()
  await expect(page.getByAltText('Prévia da assinatura importada')).toBeVisible()
  await page.getByRole('button',{name:'Salvar assinatura'}).click()
  await expect(page.getByAltText('Assinatura atual')).toBeVisible()
})

test('continua abrindo sem rede após preparar o service worker', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading',{name:'Recibo Rápido'})).toBeVisible()
})
