// Cada folha tem um rodapé separado da área rolável.
// A data de publicação é editável no atributo data-publicacao do HTML.
document.querySelectorAll('#book .sheet.parchment').forEach(sheet => {
  const meta = document.createElement('div');
  meta.className = 'page-meta';
  meta.setAttribute('aria-label', 'Assinatura e data de publicação');
  const signature = document.createElement('span');
  signature.className = 'page-signature';
  signature.textContent = 'ERS';
  const date = document.createElement('span');
  date.className = 'page-date';
  date.textContent = sheet.dataset.publicacao || 'Data a informar';
  meta.append(signature, date);
  sheet.appendChild(meta);
});

// Separar os números de página da área rolável para proteger o rodapé.
document.querySelectorAll('#book .sheet.parchment').forEach(sheet => {
  const pageNumber = sheet.querySelector('.page-content > .page-number');
  if (pageNumber) sheet.appendChild(pageNumber);
});

const bookElement = document.getElementById('book');
const sheets = document.querySelectorAll('#book .sheet');
const previousButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const pageLabel = document.getElementById('page-label');

if (!window.St?.PageFlip) {
  pageLabel.textContent = 'Biblioteca não carregada. Confira sua conexão.';
  previousButton.disabled = true;
  nextButton.disabled = true;
} else {
  const book = new St.PageFlip(bookElement, {
    width: 390,
    height: 540,
    size: 'stretch',
    minWidth: 240,
    maxWidth: 390,
    minHeight: 332,
    maxHeight: 540,
    autoSize: true,
    showCover: true,
    drawShadow: true,
    maxShadowOpacity: 0.78,
    flippingTime: 1100,
    useMouseEvents: true,
    mobileScrollSupport: false,
    clickEventForward: true,
    swipeDistance: 25,
    usePortrait: true
  });

  book.loadFromHTML(sheets);

  function refreshControls(page = book.getCurrentPageIndex()) {
    pageLabel.textContent = page === 0 ? 'Capa' :
      page === sheets.length - 1 ? 'Contracapa' :
      page === sheets.length - 2 ? 'Sobre o autor' :
      page === 1 ? 'Apresentação' : `Página ${page}`;
    previousButton.disabled = page === 0;
    nextButton.disabled = page >= sheets.length - 1;
  }

  previousButton.addEventListener('click', () => book.flipPrev('bottom'));
  nextButton.addEventListener('click', () => book.flipNext('bottom'));
  document.addEventListener('keydown', (event) => {
    if (event.target.closest('button, input, textarea, select')) return;
    if (event.key === 'ArrowRight') book.flipNext('bottom');
    if (event.key === 'ArrowLeft') book.flipPrev('bottom');
  });
  book.on('flip', (event) => refreshControls(event.data));
  book.on('init', () => refreshControls());
  refreshControls();
}
