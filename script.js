"use strict";
// Paginação automática: cada meditação mantém seu número e seu título na
// primeira folha; continuações são páginas físicas do mesmo texto.
const bookElement = document.getElementById('book');
const previousButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const pageLabel = document.getElementById('page-label');
const pageTotal = document.getElementById('page-total');
const portraitModal = document.getElementById('portrait-modal');
let flipBook = null;

function roman(n) {
  const table = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let result=''; for (const [value, letter] of table) while (n>=value) { result+=letter;n-=value; }
  return result;
}
function addFooter(sheet, number, date) {
  const pageNumber=document.createElement('div');
  pageNumber.className='page-number'; pageNumber.textContent=roman(number);
  const meta=document.createElement('div'); meta.className='page-meta';
  meta.setAttribute('aria-label','Assinatura e data de publicação');
  const sig=document.createElement('span');sig.className='page-signature';sig.textContent='ERS';
  const dateEl=document.createElement('span');dateEl.className='page-date';dateEl.textContent=date || 'Data a informar';
  meta.append(sig,dateEl);sheet.append(pageNumber,meta);
}
function newSheet(original, isContinuation, chapterText) {
  const sheet=document.createElement('div');
  sheet.className=original.className;
  sheet.dataset.publicacao=original.dataset.publicacao||'Data a informar';
  const border=document.createElement('div');border.className='page-border';
  const content=document.createElement('div');
  content.className='page-content'+(isContinuation?' continuation':'');
  if (!isContinuation && original.querySelector('.title-leaf')) content.classList.add('title-leaf');
  if (isContinuation) {
    const label=document.createElement('div');label.className='continuation-label';
    label.textContent=chapterText+' · CONTINUAÇÃO';content.append(label);
  }
  sheet.append(border,content);return sheet;
}
function fits(content) {return content.scrollHeight<=content.clientHeight+1;}
// Divide um parágrafo longo por palavras, sem nunca descartar seu final.
function splitParagraph(paragraph, content) {
  const fullText=paragraph.textContent.trim();
  const words=fullText.split(/\s+/).filter(Boolean);
  if(!words.length) return [null,null];
  const probe=paragraph.cloneNode(false);
  probe.classList.remove('dropcap'); // capitular apenas na primeira folha
  let lo=1,hi=words.length,best=0;
  while(lo<=hi) {
    const mid=Math.floor((lo+hi)/2);
    probe.textContent=words.slice(0,mid).join(' ');
    content.append(probe);
    const ok=fits(content);probe.remove();
    if(ok){best=mid;lo=mid+1;}else hi=mid-1;
  }
  if(!best) return [null,paragraph];
  const first=paragraph.cloneNode(false);
  first.textContent=words.slice(0,best).join(' ');
  const rest=words.slice(best);
  const remaining=rest.length?paragraph.cloneNode(false):null;
  if(remaining){remaining.classList.remove('dropcap');remaining.textContent=rest.join(' ');}
  return [first,remaining];
}
// Divide listas por itens, preservando os marcadores e a mesma meditação.
function splitTopicList(list, content) {
  const items=[...list.children];
  const partial=list.cloneNode(false);
  let count=0;
  for (const item of items) {
    partial.append(item.cloneNode(true));
    content.append(partial);
    const ok=fits(content);
    partial.remove();
    if(!ok){partial.lastElementChild.remove();break;}
    count++;
  }
  if(!count)return [null,list];
  const remaining=list.cloneNode(false);
  items.slice(count).forEach(item=>remaining.append(item.cloneNode(true)));
  return [partial,remaining.children.length?remaining:null];
}
function paginate() {
  const originals=[...bookElement.querySelectorAll(':scope > .sheet')];
  const measurer=document.createElement('div');measurer.id='page-measurer';
  document.body.append(measurer);
  const output=[];
  for(const original of originals) {
    if(original.classList.contains('cover')) {output.push(original);continue;}
    const contentOriginal=original.querySelector('.page-content');
    const chapter=contentOriginal.querySelector('.chapter-no')?.textContent?.trim()||'TEXTO';
    let sheet=newSheet(original,false,chapter);
    measurer.append(sheet);
    let content=sheet.querySelector('.page-content');
    const blocks=[...contentOriginal.children].filter(n=>!n.classList.contains('page-number')&&!n.classList.contains('page-meta')&&!(n.classList.contains('editorial-note')&&!n.textContent.trim()));
    for(const block of blocks) {
      if(!block.textContent.trim() && !block.querySelector('img'))continue;
      let pending=block.cloneNode(true);
      let safety=0;
      while(pending && safety++<100) {
        content.append(pending);
        if(fits(content)){pending=null;break;}
        pending.remove();
        if(pending.tagName==='UL' && pending.classList.contains('meditation-topics')) {
          const [part,rest]=splitTopicList(pending,content);
          if(part){content.append(part);pending=rest;if(!pending)break;}
        }
        if(pending && pending.tagName==='P' && pending.textContent.trim().split(/\s+/).length>1) {
          const [part,rest]=splitParagraph(pending,content);
          if(part){content.append(part);pending=rest;if(!pending)break;}
        }
        // Se o conteúdo não cabe e a página já contém texto, vira a folha.
        // Se um bloco é indivisível (ex. retrato), move-o integralmente.
        if(content.children.length===0 || (content.children.length===1 && content.querySelector('.continuation-label'))) {
          if(pending){ content.append(pending);pending=null; }break;
        }
        output.push(sheet);sheet=newSheet(original,true,chapter);measurer.append(sheet);
        content=sheet.querySelector('.page-content');
      }
    }
    output.push(sheet);
  }
  measurer.remove();
  bookElement.replaceChildren(...output);
  let counter=0;
  for(const sheet of output){if(sheet.classList.contains('parchment'))addFooter(sheet,++counter,sheet.dataset.publicacao);}
  pageTotal.textContent=`${counter} páginas de leitura`;
  return output;
}
function setupPortrait(){
  document.querySelectorAll('.author-photo-button').forEach(button=>{
    button.addEventListener('pointerdown',e=>e.stopPropagation());
    button.addEventListener('click',e=>{e.stopPropagation();portraitModal.hidden=false;document.querySelector('.portrait-close').focus();});
  });
  const close=()=>{portraitModal.hidden=true;};
  portraitModal.querySelector('.portrait-close').addEventListener('click',close);
  portraitModal.addEventListener('click',e=>{if(e.target===portraitModal)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!portraitModal.hidden)close();});
}
function refreshControls(page=flipBook?.getCurrentPageIndex()||0){
  const sheets=[...bookElement.querySelectorAll(':scope > .sheet')];
  if(page===0)pageLabel.textContent='Capa';
  else if(page===sheets.length-1)pageLabel.textContent='Contracapa';
  else if(sheets[page]?.classList.contains('author-page'))pageLabel.textContent='Sobre o autor';
  else pageLabel.textContent=`Página ${roman(page)}`;
  previousButton.disabled=page===0;
  nextButton.disabled=page>=sheets.length-1;
}
async function start(){
  if(document.fonts?.ready)await document.fonts.ready;
  const sheets=paginate();
  setupPortrait();
  if(!window.St?.PageFlip){pageLabel.textContent='Biblioteca de páginas não carregada. Confira sua conexão.';previousButton.disabled=true;nextButton.disabled=true;return;}
  flipBook=new St.PageFlip(bookElement,{
    width:390,height:540,size:'stretch',minWidth:240,maxWidth:390,minHeight:332,maxHeight:540,
    autoSize:true,showCover:true,drawShadow:true,maxShadowOpacity:.78,
    flippingTime:1050,useMouseEvents:true,mobileScrollSupport:false,
    clickEventForward:true,swipeDistance:25,usePortrait:true
  });
  flipBook.loadFromHTML(sheets);
  previousButton.addEventListener('click',()=>flipBook.flipPrev('bottom'));
  nextButton.addEventListener('click',()=>flipBook.flipNext('bottom'));
  document.addEventListener('keydown',event=>{
    if(!portraitModal.hidden||event.target.closest('button,input,textarea,select'))return;
    if(event.key==='ArrowRight')flipBook.flipNext('bottom');
    if(event.key==='ArrowLeft')flipBook.flipPrev('bottom');
  });
  flipBook.on('flip',event=>refreshControls(event.data));
  flipBook.on('init',()=>refreshControls());refreshControls();
}
start().catch(err=>{console.error('Falha ao abrir o livro:',err);pageLabel.textContent='Não foi possível abrir o livro';});
