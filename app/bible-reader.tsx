'use client';

import { useEffect, useMemo, useState } from 'react';
import { trackAnalytics } from './analytics-client';

type BookSummary = { number: number; name: string; chapters: number; file: string };
type BooksIndex = { translation: string; license: string; source: string; books: BookSummary[] };
type BibleBook = { number: number; name: string; chapters: Array<Array<[number, string]>> };
type DailyReading = { book: number; chapter: number; verse: number };
type ShareTarget = { reference: string; text: string; book: number; chapter: number; verse: number };

const DAILY_READINGS: DailyReading[] = [
  { book: 43, chapter: 3, verse: 16 }, { book: 19, chapter: 23, verse: 1 },
  { book: 50, chapter: 4, verse: 13 }, { book: 20, chapter: 3, verse: 5 },
  { book: 23, chapter: 41, verse: 10 }, { book: 40, chapter: 11, verse: 28 },
  { book: 45, chapter: 8, verse: 28 },
];

export default function BibleReader() {
  const [index, setIndex] = useState<BooksIndex | null>(null);
  const [bookNumber, setBookNumber] = useState(43);
  const [chapter, setChapter] = useState(3);
  const [book, setBook] = useState<BibleBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [daily, setDaily] = useState<DailyReading>(DAILY_READINGS[0]);
  const [targetVerse, setTargetVerse] = useState<number | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    fetch('/bible/books.json').then(response => response.json()).then(setIndex);
    try { setFavorites(JSON.parse(localStorage.getItem('san-agustin-bible-favorites') || '[]')); } catch { setFavorites([]); }
    setDaily(DAILY_READINGS[Math.floor(Date.now() / 86400000) % DAILY_READINGS.length]);
    const params = new URLSearchParams(window.location.search);
    const requestedBook = Number(params.get('libro'));
    const requestedChapter = Number(params.get('capitulo'));
    const requestedVerse = Number(params.get('versiculo'));
    if (requestedBook >= 1 && requestedBook <= 66) setBookNumber(requestedBook);
    if (requestedChapter >= 1 && requestedChapter <= 150) setChapter(requestedChapter);
    if (requestedVerse >= 1 && requestedVerse <= 176) setTargetVerse(requestedVerse);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/bible/${String(bookNumber).padStart(2, '0')}.json`)
      .then(response => response.json())
      .then(data => { setBook(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [bookNumber]);

  useEffect(() => {
    if (book) trackAnalytics('bible_chapter', { book: book.name, chapter });
  }, [book, chapter]);

  useEffect(() => {
    if (!book || !targetVerse || !book.chapters[chapter - 1]) return;
    const timer = window.setTimeout(() => document.getElementById(`versiculo-${targetVerse}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    return () => window.clearTimeout(timer);
  }, [book, chapter, targetVerse]);

  const verses = book?.chapters[chapter - 1] || [];
  const bookSummary = index?.books.find(item => item.number === bookNumber);
  const dailyBook = index?.books.find(item => item.number === daily.book);
  const dailyText = useMemo(() => {
    if (bookNumber !== daily.book || chapter !== daily.chapter) return '';
    return verses.find(([number]) => number === daily.verse)?.[1] || '';
  }, [bookNumber, chapter, daily, verses]);

  function goToDailyReading() {
    setBookNumber(daily.book);
    setChapter(daily.chapter);
    document.getElementById('biblia')?.scrollIntoView({ behavior: 'smooth' });
  }

  function toggleFavorite(reference: string) {
    const next = favorites.includes(reference) ? favorites.filter(item => item !== reference) : [...favorites, reference];
    setFavorites(next);
    localStorage.setItem('san-agustin-bible-favorites', JSON.stringify(next));
    trackAnalytics('bible_favorite');
  }

  function verseUrl(bookValue: number, chapterValue: number, verseValue: number) {
    const url = new URL('/biblia', window.location.origin);
    url.searchParams.set('libro', String(bookValue));
    url.searchParams.set('capitulo', String(chapterValue));
    url.searchParams.set('versiculo', String(verseValue));
    return url.toString();
  }

  function openVerseShare(reference: string, text: string, verse: number) {
    setShareStatus('');
    setShareTarget({ reference, text, book: bookNumber, chapter, verse });
  }

  function trackVerseShare(channel: string) {
    if (shareTarget) trackAnalytics('bible_share', { reference: shareTarget.reference, channel });
  }

  async function copyVerseLink() {
    if (!shareTarget) return;
    const url = verseUrl(shareTarget.book, shareTarget.chapter, shareTarget.verse);
    await navigator.clipboard.writeText(`${shareTarget.reference} — ${shareTarget.text} ${url}`);
    setShareStatus('¡Versículo y enlace copiados!');
    trackVerseShare('copy');
  }

  async function shareMore() {
    if (!shareTarget) return;
    const url = verseUrl(shareTarget.book, shareTarget.chapter, shareTarget.verse);
    try {
      if (navigator.share) await navigator.share({ title: shareTarget.reference, text: `${shareTarget.reference} — ${shareTarget.text}`, url });
      else await copyVerseLink();
      trackVerseShare('native');
    } catch {
      // Cerrar la hoja de compartir no es un error para la persona.
    }
  }

  return <section className="bible-section" id="biblia">
    <div className="bible-heading">
      <div><p className="section-kicker">Palabra para cada día</p><h2>Biblia digital</h2><p>Lee, guarda y comparte la Palabra desde cualquier teléfono.</p></div>
      <aside className="daily-reading"><span>Lectura del día</span><strong>{dailyBook?.name || 'Juan'} {daily.chapter}:{daily.verse}</strong>{dailyText && <p>{dailyText}</p>}<button onClick={goToDailyReading}>Abrir lectura <span>→</span></button></aside>
    </div>
    <div className="bible-reader">
      <div className="bible-toolbar">
        <label>Libro<select value={bookNumber} onChange={event => { setBookNumber(Number(event.target.value)); setChapter(1); }}>{index?.books.map(item => <option key={item.number} value={item.number}>{item.name}</option>)}</select></label>
        <label>Capítulo<select value={chapter} onChange={event => setChapter(Number(event.target.value))}>{Array.from({ length: bookSummary?.chapters || book?.chapters.length || 1 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
        <div className="font-controls" aria-label="Tamaño de texto"><button onClick={() => setFontSize(size => Math.max(15, size - 1))} aria-label="Reducir texto">A−</button><button onClick={() => setFontSize(size => Math.min(25, size + 1))} aria-label="Aumentar texto">A+</button></div>
      </div>
      <article className="scripture" style={{ fontSize }} aria-live="polite">
        <header><p>Reina-Valera 1909</p><h3>{book?.name || bookSummary?.name || 'Cargando'} {chapter}</h3></header>
        {loading && <p className="bible-loading">Cargando capítulo…</p>}
        {!loading && verses.map(([number, text]) => {
          const reference = `${book?.name} ${chapter}:${number}`;
          const favorite = favorites.includes(reference);
          return <div className={`verse-row${targetVerse === number ? ' is-targeted' : ''}`} key={number} id={`versiculo-${number}`}><sup>{number}</sup><p>{text}</p><div className="verse-actions"><button className={favorite ? 'is-favorite' : ''} onClick={() => toggleFavorite(reference)} aria-label={favorite ? `Quitar ${reference} de favoritos` : `Guardar ${reference} en favoritos`}>{favorite ? '♥' : '♡'}</button><button onClick={() => openVerseShare(reference, text, number)} aria-label={`Compartir ${reference}`}>↗</button></div></div>;
        })}
      </article>
      <p className="bible-license">Reina‑Valera 1909 · Dominio público, CC0 1.0. Los favoritos se guardan solamente en este teléfono.</p>
    </div>
    {shareTarget && <div className="verse-share-backdrop" onMouseDown={() => setShareTarget(null)}>
      <section className="verse-share-panel" role="dialog" aria-modal="true" aria-label={`Compartir ${shareTarget.reference}`} onMouseDown={event => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={() => setShareTarget(null)} aria-label="Cerrar">×</button>
        <p className="section-kicker">Comparte la Palabra</p><h3>{shareTarget.reference}</h3><blockquote>{shareTarget.text}</blockquote>
        <div className="verse-share-options">
          <a className="share-option share-sms" href={`sms:?body=${encodeURIComponent(`${shareTarget.reference} — ${shareTarget.text} ${verseUrl(shareTarget.book, shareTarget.chapter, shareTarget.verse)}`)}`} onClick={() => trackVerseShare('sms')}><span aria-hidden="true">✉</span><strong>Mensaje</strong></a>
          <a className="share-option share-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(`${shareTarget.reference} — ${shareTarget.text} ${verseUrl(shareTarget.book, shareTarget.chapter, shareTarget.verse)}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackVerseShare('whatsapp')}><span aria-hidden="true">W</span><strong>WhatsApp</strong></a>
          <a className="share-option share-facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verseUrl(shareTarget.book, shareTarget.chapter, shareTarget.verse))}`} target="_blank" rel="noopener noreferrer" onClick={() => trackVerseShare('facebook')}><span aria-hidden="true">f</span><strong>Facebook</strong></a>
          <button className="share-option share-copy" type="button" onClick={copyVerseLink}><span aria-hidden="true">⧉</span><strong>Copiar</strong></button>
        </div>
        <button className="button button-outline share-more" type="button" onClick={shareMore}>Más aplicaciones</button>
        {shareStatus && <p className="verse-share-status" role="status">{shareStatus}</p>}
      </section>
    </div>}
  </section>;
}
