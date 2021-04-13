import {
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  HomeSection,
  SearchRequest,
  PagedResults,
  SourceInfo,
} from "paperback-extensions-common"
import {parseChapterDetails, parseChapters, parseHomeSections, parseMangaDetails, parseSearch} from "./ManaTokiParser"

const MANATOKI_DOMAIN = 'https://manatoki95.net'
const MANATOKI_COMIC = MANATOKI_DOMAIN + '/comic/'
const method = 'GET'


export const ManaTokiInfo: SourceInfo = {
  version: '1.0.0',
  name: '마나토끼',
  icon: 'icon.jpg',
  author: 'nar1n',
  authorWebsite: 'https://github.com/nar1n',
  description: 'Extension that pulls manga from ManaToki',
  hentaiSource: false,
  websiteBaseURL: MANATOKI_DOMAIN
}

export class ManaToki extends Source {
  getMangaShareUrl(mangaId: string): string | null { return `${MANATOKI_COMIC}${mangaId}` }

  requestManager = createRequestManager({
    requestsPerSecond: 1,
    requestTimeout: 25000
  })
  

  async getMangaDetails(mangaId: string): Promise<Manga> {
    const request = createRequestObject({
      url: MANATOKI_COMIC,
      method,
      param: mangaId
    })

    const response = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(response.data)

    // Checks whether a manga or chapter endpoint
    if ($('div.view-content', 'div.col-sm-9').attr('style') == 'margin-bottom: 5px;') {
      // Manga
      return parseMangaDetails($, mangaId)
    } else {
      // Chapter
      mangaId = $('a', $('div.toon-nav', 'div.navbar-wrapper')).last().attr('href')?.replace(MANATOKI_COMIC, '') ?? ''
      const request = createRequestObject({
        url: MANATOKI_COMIC,
        method,
        param: mangaId
      })
      const response = await this.requestManager.schedule(request, 1)
      $ = this.cheerio.load(response.data)
      return parseMangaDetails($, mangaId)
    }
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const request = createRequestObject({
      url: MANATOKI_COMIC,
      method,
      param: mangaId
    })

    const response = await this.requestManager.schedule(request, 1)
    let $ = this.cheerio.load(response.data)

    // Checks whether a manga or chapter endpoint
    if ($('div.view-content', 'div.col-sm-9').attr('style') == 'margin-bottom: 5px;') {
      // Manga
      return parseChapters($, mangaId)
    } else {
      // Chapter
      mangaId = $('a', $('div.toon-nav', 'div.navbar-wrapper')).last().attr('href')?.replace(MANATOKI_COMIC, '') ?? ''
      const request = createRequestObject({
        url: MANATOKI_COMIC,
        method,
        param: mangaId
      })
      const response = await this.requestManager.schedule(request, 1)
      $ = this.cheerio.load(response.data)
      return parseChapters($, mangaId)
    }
  }

  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
    const request = createRequestObject({
      url: MANATOKI_COMIC,
      method,
      param: chapterId
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    return parseChapterDetails($, this.cheerio.load, mangaId, chapterId)
  }

  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
    // Give Paperback a skeleton of what these home sections should look like to pre-render them
    const section1 = createHomeSection({ id: 'updates', title: '최신화' })
    const section2 = createHomeSection({ id: 'manga_list', title: '만화목록'})
    const sections = [section1, section2]

    // Fill the homsections with data
    const request = createRequestObject({
      url: MANATOKI_DOMAIN,
      method,
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    parseHomeSections($, sections, sectionCallback)
  }

  async searchRequest(query: SearchRequest): Promise<PagedResults> {
    const search = query.title ?? ''
    const request = createRequestObject({
      url: `${MANATOKI_DOMAIN}/comic?stx=`,
      method,
      param: encodeURI(search.replace(/ /g, '+'))
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    const manga = parseSearch($)
    
    return createPagedResults({
      results: manga,
    })
  }
}