import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile} from '@oai/artifact-tool';
const base=path.resolve('materiais-store-2026-09-23'),out=path.join(base,'microsoft-store');
const skill='C:/Users/Admin/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations';
const {finalizePresentation,resolvePresentationFont}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
const font=resolvePresentationFont({fontFamily:'Arial'});console.log('font',font);
const p=Presentation.create({slideSize:{width:1280,height:720}});
function txt(s,text,x,y,w,h,size=28,color='#FFFFFF',bold=false){const a=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});a.text=text;a.text.style={typeface:font,fontSize:size,color,bold,autoFit:'none'};return a;}
async function img(s,file,x,y,w,h){s.images.add({blob:new Uint8Array(await fs.readFile(file)),contentType:'image/png',alt:path.basename(file),fit:'contain',position:{left:x,top:y,width:w,height:h}});}
const bg=path.join(out,'imagens/fundo-promocional.png');
let s=p.slides.add();s.background.fill='#0B0D0F';await img(s,bg,0,0,1280,720);
txt(s,'RB Gestão\nFinanceira',76,174,850,174,70,'#FFFFFF',true);
txt(s,'Suas finanças no Windows',80,383,800,54,34,'#B7FF3C');
txt(s,'Planejamento mensal e acompanhamento do patrimônio',80,463,700,80,26);
s.speakerNotes.textFrame.setText('Produto: RB Gestão Financeira 2.4.22. Fonte: package.json e app/app.js. Arte abstrata de fundo gerada com ImageGen, sem representação da interface.');
const slides=[
['01-dashboard.png','Visão geral do seu dinheiro','Saldo previsto, despesas do mês e patrimônio em uma visão consolidada.'],
['02-accounts.png','Contas e reservas','Saldos, transferências e caixinhas com metas para organizar o dinheiro.'],
['03-investments.png','Acompanhamento de investimentos','Capital aplicado, valor atual e distribuição da carteira cadastrada.'],
['04-cards.png','Cartões e faturas','Compras parceladas, limites e vencimentos reunidos no aplicativo.'],
['05-home-expenses.png','Gastos compartilhados da casa','Contas por competência, participação dos moradores e acertos entre pessoas.'],
['06-reports.png','Relatórios para acompanhar sua rotina','Consultas por módulo e competência, com opção de impressão e PDF.']
];
for(const [file,title,body]of slides){s=p.slides.add();s.background.fill='#0B0D0F';txt(s,title,64,28,1152,65,43,'#FFFFFF',true);txt(s,body,64,102,1152,43,23,'#C5C8CA');await img(s,path.join(out,'imagens',file),175,166,930,523.125);txt(s,'Dados fictícios para demonstração',64,689,900,23,13,'#9EA6AD');s.speakerNotes.textFrame.setText('Captura real da interface local da versão 2.4.22, com base de demonstração isolada. Todos os nomes e valores são fictícios. Fonte funcional: app/app.js. Nenhuma integração bancária automática é representada.');}
s=p.slides.add();s.background.fill='#0B0D0F';await img(s,bg,0,0,1280,720);txt(s,'Uma rotina financeira\nmais organizada',72,62,900,128,52,'#FFFFFF',true);
txt(s,'Salário e compromissos',76,240,780,48,30,'#B7FF3C',true);txt(s,'Proventos, descontos, empréstimos e assinaturas recorrentes.',76,294,805,70,25);
txt(s,'Dados locais e cópias de segurança',76,403,870,48,30,'#B7FF3C',true);txt(s,'Backups manuais e automáticos, temas claro e escuro\ne permissões por usuário.',76,457,840,94,25);
txt(s,'RB Gestão Financeira para Windows',76,623,950,48,29);
s.speakerNotes.textFrame.setText('Fonte: app/app.js, electron-main.cjs e README_INSTALACAO.txt, com prioridade para o código atual. Backup diário depende de aplicativo aberto no horário. Acesso mobile requer desktop acessível e pareamento aprovado. A apresentação não afirma publicação ou certificação na Microsoft Store.');
await fs.mkdir(path.join(base,'.build/slides'),{recursive:true});
await(await PresentationFile.exportPptx(p)).save(path.join(base,'.build/candidate.pptx'));
for(let i=0;i<p.slides.items.length;i++){const slide=p.slides.items[i];const preview=await p.export({slide,format:'png',scale:1.5});await fs.writeFile(path.join(base,'.build/slides',`slide-${i+1}.png`),new Uint8Array(await preview.arrayBuffer()));}
await fs.copyFile(path.join(base,'.build/slides/slide-1.png'),path.join(out,'imagens/07-capa-promocional.png'));
await finalizePresentation({workspaceDir:base,candidatePath:path.join(base,'.build/candidate.pptx'),finalPath:path.join(out,'RB-Gestao-Financeira-Apresentacao-Final.pptx'),pythonExecutable:'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,receiptPath:path.join(base,'.build/validation-final.json')});
console.log('Apresentação finalizada, 8 slides.');

