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
    const chunkSize = 50;
    
    for (let i = 0; i < articles.length; i += chunkSize) {
      const chunk = articles.slice(i, i + chunkSize);
      const url = `https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllimit=max&redirects=1&format=json&titles=${chunk.join('|')}`;
      
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': 'WikiGeoDataScraper/1.0 (mucadoo@personal.dev)' }
        });
        const query = response.data.query;
        const pages = query.pages;
        
        // Map redirects back to original requested title
        const redirectMap: Record<string, string> = {};
        query.redirects?.forEach((r: any) => { redirectMap[r.to] = r.from; });

        Object.values(pages).forEach((page: any) => {
          const originalTitle = redirectMap[page.title] || page.title;
          if (!mapping[originalTitle]) mapping[originalTitle] = {};
          
          if (page.langlinks) {
            page.langlinks.forEach((link: any) => {
              if (targetLangs.includes(link.lang)) {
                mapping[originalTitle][link.lang] = link['*'];
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
