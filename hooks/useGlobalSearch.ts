'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SearchFilters, SearchResultItem } from '@/types/search';
import { searchService } from '@/lib/services/searchService';
import { useDebounce } from './useDebounce';

const DEFAULT_FILTERS: SearchFilters = {
  category: 'all',
  genre: 'all',
  year: 'all',
  language: 'all',
  resolution: 'all',
  audio: 'all',
  recentlyAddedOnly: false,
};

export function useGlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const debouncedQuery = useDebounce(query, 160);

  // Load recent searches on mount / open
  useEffect(() => {
    if (isOpen) {
      startTransition(() => {
        setRecentSearches(searchService.getRecentSearches());
      });
    }
  }, [isOpen]);

  // Execute search when debouncedQuery or filters change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    startTransition(() => {
      setIsLoading(true);
    });

    searchService
      .search(debouncedQuery, filters)
      .then((res) => {
        if (isMounted) {
          startTransition(() => {
            setResults(res);
            setActiveIndex(0);
            setIsLoading(false);
          });
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, filters, isOpen]);

  // Open search overlay
  const openSearch = useCallback((initialQuery: string = '') => {
    setQuery(initialQuery);
    setIsOpen(true);
  }, []);

  // Close search overlay
  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(0);
  }, []);

  // Set filter partial
  const updateFilter = useCallback((partial: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Select search result item (play / navigate)
  const selectItem = useCallback(
    (item: SearchResultItem) => {
      if (query.trim()) {
        searchService.addRecentSearch(query.trim());
        setRecentSearches(searchService.getRecentSearches());
      }
      closeSearch();

      if (item.type === 'episode' && item.seriesId) {
        router.push(`/watch/${item.seriesId}?episode=${item.id}`);
      } else {
        router.push(`/watch/${item.id}`);
      }
    },
    [query, closeSearch, router]
  );

  // Execute a recent search query
  const executeRecentSearch = useCallback((searchTerm: string) => {
    setQuery(searchTerm);
  }, []);

  // Remove a recent search
  const removeRecentSearch = useCallback((searchTerm: string) => {
    searchService.removeRecentSearch(searchTerm);
    setRecentSearches(searchService.getRecentSearches());
  }, []);

  // Clear all recent searches
  const clearRecentSearches = useCallback(() => {
    searchService.clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Global Keyboard Shortcuts (Cmd+K, Ctrl+K, / to open, Esc to close, ArrowDown/Up, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Open shortcuts (Cmd+K, Ctrl+K, or / if not focused in an editable element)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag);

      if (!isOpen && e.key === '/' && !isInputFocused) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      if (!isOpen) return;

      // 2. In-overlay keyboard navigation
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeSearch();
          break;

        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
          break;

        case 'Enter':
          if (results.length > 0 && results[activeIndex]) {
            e.preventDefault();
            selectItem(results[activeIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeSearch, results, activeIndex, selectItem]);

  return {
    isOpen,
    query,
    setQuery,
    debouncedQuery,
    filters,
    updateFilter,
    resetFilters,
    results,
    isLoading,
    activeIndex,
    setActiveIndex,
    recentSearches,
    executeRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    openSearch,
    closeSearch,
    selectItem,
  };
}
