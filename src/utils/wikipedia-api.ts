import axios from 'axios';

export class WikipediaAPI {
  /**
   * Fetches translations for given Wikipedia article titles.
   * @param articles List of Wikipedia article titles (e.g., 'Paris', 'Euro').
   * @param targetLangs Array of target language codes (e.g., ['pt', 'fr', 'it', 'es']).
   * @returns Mapping of article titles to translated titles per language: Record<ArticleTitle, Record<LangCode, TranslatedTitle>>
   */
  static async fetchTranslations(articles: string[], targetLangs: string[]): Promise<Record<string, Record<string, string>>> {
    if (articles.length === 0) return {};

    const mapping: Record<string, Record<string, string>> = {};
    // Chunking to handle API URL length limits (50 titles per chunk)
    const chunkSize = 50;
    
    for (let i = 0; i < articles.length; i += chunkSize) {
      const chunk = articles.slice(i, i + chunkSize);
      const url = `https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllimit=max&format=json&titles=${chunk.join('|')}`;
      
      try {
        const response = await axios.get(url);
        const pages = response.data.query.pages;

        Object.values(pages).forEach((page: any) => {
          if (page.langlinks) {
            const title = page.title;
            if (!mapping[title]) mapping[title] = {};
            
            page.langlinks.forEach((link: any) => {
              if (targetLangs.includes(link.lang)) {
                mapping[title][link.lang] = link['*'];
              }
            });
          }
        });
      } catch (error) {
        console.error(`Failed to fetch translations for chunk: ${error}`);
      }
    }

    return mapping;
  }
}
