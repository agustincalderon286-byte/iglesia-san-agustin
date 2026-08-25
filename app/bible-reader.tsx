'use client';

import { useEffect, useMemo, useState } from 'react';
import { trackAnalytics } from './analytics-client';

type BookSummary = { number: number; name: string; chapters: number; file: string };
type BooksIndex = { translation: string; license: string; source: string; books: BookSummary[] };
type BibleBook = { number: number; name: string; chapters: Array<Array<[number, string]>> };
type DailyReading = { book: number; chapter: number; verse: number };

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

  useEffect(() => {
    fetch('/bible/books.json').then(response => response.json()).then(setIndex);
    try { setFavorites(JSON.parse(localStorage.getItem('san-agustin-bible-favorites') || '[]')); } catch { setFavorites([]); }
    setDaily(DAILY_READINGS[Math.floor(Date.now() / 86400000) % DAILY_READINGS.length]);
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

  async function shareVerse(reference: string, text: string) {
    const message = `${reference} — ${text}`;
    if (navigator.share) await navigator.share({ title: reference, text: message, url: `${window.location.origin}/#biblia` });
    else await navigator.clipboard.writeText(`${message} ${window.location.origin}/#biblia`);
    trackAnalytics('bible_share', { reference });
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
          return <div className="verse-row" key={number} id={`versiculo-${number}`}><sup>{number}</sup><p>{text}</p><div className="verse-actions"><button className={favorite ? 'is-favorite' : ''} onClick={() => toggleFavorite(reference)} aria-label={favorite ? `Quitar ${reference} de favoritos` : `Guardar ${reference} en favoritos`}>{favorite ? '♥' : '♡'}</button><button onClick={() => shareVerse(reference, text)} aria-label={`Compartir ${reference}`}>↗</button></div></div>;
        })}
      </article>
      <p className="bible-license">Reina‑Valera 1909 · Dominio público, CC0 1.0. Los favoritos se guardan solamente en este teléfono.</p>
    </div>
  </section>;
}
