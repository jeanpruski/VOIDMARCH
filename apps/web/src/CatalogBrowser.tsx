import { useEffect, useState, type ReactNode } from 'react';
import { Search, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export function useCatalogPage<T>(items: T[], filterKey: string) {
  const [position, setPosition] = useState({ filterKey, page: 0 });
  useEffect(() => setPosition({ filterKey, page: 0 }), [filterKey]);
  const pages = Math.max(1, Math.ceil(items.length / 18));
  const page = Math.min(position.filterKey === filterKey ? position.page : 0, pages - 1);
  return {
    items: items.slice(page * 18, (page + 1) * 18),
    page,
    pages,
    start: items.length ? page * 18 + 1 : 0,
    end: Math.min((page + 1) * 18, items.length),
    change: (page: number) =>
      setPosition({ filterKey, page: Math.max(0, Math.min(pages - 1, page)) }),
  };
}
export function CatalogToolbar({
  query,
  onQuery,
  available,
  total,
  count,
  readyOnly,
  onReadyOnly,
  onReset,
  children,
  pagination,
}: {
  query: string;
  onQuery: (v: string) => void;
  available: number;
  total: number;
  count: number;
  readyOnly: boolean;
  onReadyOnly: (v: boolean) => void;
  onReset: () => void;
  children: ReactNode;
  pagination: ReturnType<typeof useCatalogPage>;
}) {
  const changePage = (event: React.MouseEvent<HTMLButtonElement>, page: number) => {
    pagination.change(page);
    event.currentTarget.closest('.modal-body')?.scrollTo({ top: 0 });
  };
  return (
    <div className="catalog-toolbar">
      <div className="catalog-search-row">
        <label className="catalog-search-box">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Rechercher dans le catalogue</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Nom, rôle, ressource…"
          />
        </label>
        <button
          className="catalog-reset"
          onClick={onReset}
          title="Réinitialiser tous les filtres"
          aria-label="Réinitialiser les filtres"
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="catalog-filter-row">{children}</div>
      <div className="catalog-results-bar">
        <label className="catalog-check">
          <input
            type="checkbox"
            checked={readyOnly}
            onChange={(e) => onReadyOnly(e.target.checked)}
          />{' '}
          Disponibles maintenant <strong>{available}</strong>
        </label>
        <span role="status">
          {count} résultat{count === 1 ? '' : 's'} / {total}
        </span>
        {pagination.pages > 1 && (
          <nav className="catalog-pagination" aria-label="Pages du catalogue">
            {pagination.page > 0 && (
              <button
                aria-label="Page précédente"
                onClick={(e) => changePage(e, pagination.page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <span>
              Page {pagination.page + 1} / {pagination.pages}
            </span>
            {pagination.page < pagination.pages - 1 && (
              <button
                aria-label="Page suivante"
                onClick={(e) => changePage(e, pagination.page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
export function CatalogDetails({ children }: { children: ReactNode }) {
  return (
    <details className="catalog-details">
      <summary>Détails et prérequis</summary>
      <div>{children}</div>
    </details>
  );
}
