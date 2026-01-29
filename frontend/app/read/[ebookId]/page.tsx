"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ReactReader } from "react-reader";
import type { Rendition, NavItem } from "epubjs";
import Header from "@/app/components/Header";
import { getEbookReadUrl } from "@/lib/api/creator";
import { useAuth } from "@/app/context/AuthContext";

type FontSize = "small" | "medium" | "large";

const FONT_SIZES: Record<FontSize, number> = {
  small: 90,
  medium: 100,
  large: 120,
};

export default function EbookReaderPage() {
  const router = useRouter();
  const params = useParams();
  const ebookId = params.ebookId as string;
  const { user, loading: authLoading } = useAuth();

  const [ebookUrl, setEbookUrl] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string>("");
  const [currentChapter, setCurrentChapter] = useState<string>("Loading...");
  const [location, setLocation] = useState<string | number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const renditionRef = useRef<Rendition | null>(null);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch ebook URL
  useEffect(() => {
    async function fetchEbook() {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await getEbookReadUrl(ebookId);
        setEbookUrl(data.url);
        setBookTitle(data.title);
      } catch (err) {
        console.error("Error fetching ebook:", err);
        setError(err instanceof Error ? err.message : "Failed to load ebook");
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      if (user) {
        fetchEbook();
      } else {
        setError("Please sign in to read this ebook");
        setIsLoading(false);
      }
    }
  }, [ebookId, user, authLoading]);

  // Handle location change
  const locationChanged = useCallback((epubcfi: string) => {
    setLocation(epubcfi);

    if (renditionRef.current) {
      const displayed = renditionRef.current.location;
      if (displayed && displayed.start) {
        const page = displayed.start.displayed.page;
        const total = displayed.start.displayed.total;
        setCurrentPage(page);
        setTotalPages(total);
      }
    }
  }, []);

  // Handle rendition
  const handleRendition = useCallback((rendition: Rendition) => {
    renditionRef.current = rendition;

    // Apply initial font size
    rendition.themes.fontSize(`${FONT_SIZES[fontSize]}%`);

    // Style the reader content
    rendition.themes.default({
      body: {
        "font-family": "Georgia, serif !important",
        "line-height": "1.8 !important",
        color: "#1a1a1a !important",
      },
      p: {
        "margin-bottom": "1em !important",
      },
    });

    // Get table of contents
    rendition.book.loaded.navigation.then((nav) => {
      setToc(nav.toc);
    });

    // Track chapter changes
    rendition.on("relocated", (location: { start: { href: string } }) => {
      const chapter = rendition.book.navigation.get(location.start.href);
      if (chapter) {
        setCurrentChapter(chapter.label);
      }
    });
  }, [fontSize]);

  // Update font size
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${FONT_SIZES[fontSize]}%`);
    }
  }, [fontSize]);

  // Navigation handlers
  const goBack = () => {
    router.back();
  };

  const goToChapter = (href: string) => {
    if (renditionRef.current) {
      renditionRef.current.display(href);
      setShowToc(false);
    }
  };

  const prevPage = () => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  };

  const nextPage = () => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ebook...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center p-8">
            <h2 className="text-white text-xl font-semibold mb-4">
              Unable to load ebook
            </h2>
            <p className="text-white/60 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Table of Contents view
  if (showToc) {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        {/* Header for TOC */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setShowToc(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <span className="text-gray-900 font-medium">{bookTitle}</span>
          </div>
        </header>

        {/* TOC Content */}
        <main className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Table of Contents
          </h1>
          <nav>
            <ul className="space-y-3">
              {toc.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => goToChapter(item.href)}
                    className="text-gray-900 hover:text-blue-600 text-lg text-left w-full py-2"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </main>
      </div>
    );
  }

  // Reader view
  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col">
      {/* Desktop header */}
      {!isMobile && (
        <Header />
      )}

      {/* Reader header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left: Back + Book name (desktop) or just chapter (mobile) */}
          <div className="flex items-center gap-4">
            <button
              onClick={goBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            {!isMobile && (
              <span className="text-gray-900 font-medium">{bookTitle}</span>
            )}
          </div>

          {/* Center: Chapter name */}
          <button
            onClick={() => setShowToc(true)}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            {currentChapter}
          </button>

          {/* Right: Font size controls */}
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setFontSize("small")}
              className={`px-2 py-1 text-sm ${
                fontSize === "small"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize("medium")}
              className={`px-2 py-1 text-base ${
                fontSize === "medium"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              A
            </button>
            {!isMobile && (
              <button
                onClick={() => setFontSize("large")}
                className={`px-2 py-1 text-lg ${
                  fontSize === "large"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                A
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Reader content */}
      <div className="flex-1 relative">
        {/* Navigation arrows - desktop only */}
        {!isMobile && (
          <>
            <button
              onClick={prevPage}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-gray-600 p-2"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <button
              onClick={nextPage}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-gray-600 p-2"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </button>
          </>
        )}

        {/* EPUB Reader */}
        {ebookUrl && (
          <div className="h-[calc(100vh-160px)] max-w-5xl mx-auto px-12">
            <ReactReader
              url={ebookUrl}
              location={location}
              locationChanged={locationChanged}
              getRendition={handleRendition}
              epubOptions={{
                flow: "paginated",
                spread: isMobile ? "none" : "always",
              }}
            />
          </div>
        )}
      </div>

      {/* Footer with page count */}
      <footer className="bg-[#F5F5F0] border-t border-gray-200 py-3 text-center">
        <span className="text-gray-500 text-sm">
          Page {currentPage} out of {totalPages || "..."}
        </span>
      </footer>
    </div>
  );
}
