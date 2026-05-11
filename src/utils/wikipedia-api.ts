import axios from 'axios';
import fs from 'fs';

interface WikipediaLangLink {
  lang: string;
  '*': string;
}

interface WikipediaPage {
  title: string;
  langlinks?: WikipediaLangLink[];
}

interface WikipediaRedirect {
  from: string;
  to: string;
}

interface WikipediaQueryResponse {
  query?: {
    pages?: Record<string, WikipediaPage>;
    redirects?: WikipediaRedirect[];
  };
}

export class WikipediaAPI {
  private static snapshotData: Record<string, Record<string, string>> | null = null;
  private static isSnapshotMode = false;

  /**
   * Enables snapshot mode and loads translations from a file.
   * Useful for offline tests.
   */
  static useSnapshots(filePath: string = 'tests/snapshots/translations.json'): void {
    this.isSnapshotMode = true;
    if (fs.existsSync(filePath)) {
      this.snapshotData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  }

  /**
   * Fetches translations for given Wikipedia article titles.
   * @param articles List of Wikipedia article titles (e.g., 'Paris', 'Euro').
   * @param targetLangs Array of target language codes (e.g., ['pt', 'fr', 'it', 'es']).
   * @returns Mapping of article titles to translated titles per language: Record<ArticleTitle, Record<LangCode, TranslatedTitle>>
   */
  static async fetchTranslations(articles: string[], targetLangs: string[]): Promise<Record<string, Record<string, string>>> {
    if (articles.length === 0) return {};

    if (this.isSnapshotMode && this.snapshotData) {
      const result: Record<string, Record<string, string>> = {};
      articles.forEach(article => {
        const normalized = article.replace(/_/g, ' ');
        if (this.snapshotData![normalized]) {
          result[normalized] = this.snapshotData![normalized];
        }
      });
      return result;
    }

    const mapping: Record<string, Record<string, string>> = {};
    const chunkSize = 50;
    
    for (let i = 0; i < articles.length; i += chunkSize) {
      const chunk = articles.slice(i, i + chunkSize);
      
      for (const targetLang of targetLangs) {
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=${targetLang}&lllimit=max&redirects=1&format=json&titles=${chunk.map(encodeURIComponent).join('|')}`;
        
        let retries = 3;
        while (retries > 0) {
          try {
            const response = await axios.get(url, {
              headers: { 'User-Agent': 'WikiGeoDataScraper/1.0 (mucadoo@personal.dev)' }
            });
            const query = (response.data as WikipediaQueryResponse).query;
            if (!query || !query.pages) break;
            const pages = query.pages;
            
            // Map redirects back to original requested title
            const redirectMap: Record<string, string> = {};
            query.redirects?.forEach((r) => { redirectMap[r.to] = r.from; });

            Object.values(pages).forEach((page) => {
              const originalTitle = redirectMap[page.title] || page.title;
              if (!mapping[originalTitle]) mapping[originalTitle] = {};
              
              if (page.langlinks) {
                page.langlinks.forEach((link) => {
                  mapping[originalTitle][link.lang] = link['*'];
                });
              }
            });
            break; // Success
          } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.status === 429 && retries > 1) {
              const delay = (4 - retries) * 2000;
              await new Promise(resolve => setTimeout(resolve, delay));
              retries--;
              continue;
            }
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Failed to fetch translations for chunk (${targetLang}): ${message}`);
            break;
          }
        }
      }
    }

    return mapping;
  }
}
