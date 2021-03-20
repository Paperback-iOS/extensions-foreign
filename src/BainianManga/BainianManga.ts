import {
    Source,
    Manga,
    Chapter,
    ChapterDetails,
    HomeSection,
    SearchRequest,
    TagSection,
    PagedResults,
    SourceInfo,
    MangaUpdates,
    RequestHeaders,
    TagType
  } from "paperback-extensions-common"
  import { generateSearch, isLastPage, parseChapterDetails, parseChapters, parseHomeSections, parseHotManga, parseNewManga, parseMangaDetails, parseSearch, parseTags, parseUpdatedManga, parseViewMore, UpdatedManga } from "./BainianMangaParser"
  
  const BM_DOMAIN = 'https://m.bnmanhua.com';
  const BM_IMAGE_DOMAIN = 'https://img.lxhy88.com'
  const method = 'GET';
  const headers = {
      referer: BM_DOMAIN
  };
  
  export const BainianMangaInfo: SourceInfo = {
    version: '1.0.0',
    name: 'BainianManga (百年漫画)',
    icon: 'favicon.png',
    author: 'getBoolean',
    authorWebsite: 'https://github.com/getBoolean',
    description: 'Extension that pulls manga from BainianManga',
    hentaiSource: false,
    websiteBaseURL: `${BM_DOMAIN}/comic.html`,
    sourceTags: [
        {
            text: "中文",
            type: TagType.GREY
        }
    ]
  }
  
  export class BainianManga extends Source {
    getMangaShareUrl(mangaId: string): string | null { return `${BM_DOMAIN}/comic/${mangaId}` }
    private imageDomain = BM_IMAGE_DOMAIN
  
    async getMangaDetails(mangaId: string): Promise<Manga> {
        this.imageDomain = BM_IMAGE_DOMAIN // Reset image domain back to this
        const request = createRequestObject({
            url: `${BM_DOMAIN}/comic/`,
            method,
            param: `${mangaId}.html`
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)

        let result : [Manga, string] = parseMangaDetails($, mangaId)

        // Hacky solution to get the image domain
        // Get image domain from (ex:) https://img.lxhy88.com/zhang/26110/1602252/d41ae644ddcd2e1edb8141f0b5abf8c1.jpg
        const image = result[1].replace('https://', '').replace('http://', '')
        const tempImageDomain = image.substring(0, image.indexOf('/')) // Set new image domain
        this.imageDomain = `https://${tempImageDomain}`
        // console.log(this.imageDomain)

        return result[0]
    }
  

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: `${BM_DOMAIN}/comic/`,
            method,
            param: `${mangaId}.html`
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseChapters($, mangaId)
    }
  

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        let request = createRequestObject({
            url: `${BM_DOMAIN}/comic/`,
            method,
            headers,
            param: `${mangaId}/${chapterId}.html`
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)

        return parseChapterDetails(this.imageDomain, mangaId, chapterId, response.data)
    }
  

    async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
        let page = 1
            let updatedManga: UpdatedManga = {
            ids: [],
            loadMore: true
        }

        while (updatedManga.loadMore) {
        const request = createRequestObject({
            url: `${BM_DOMAIN}/page/new/`,
            method,
            headers,
            param: `${String(page++)}.html`
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        updatedManga = parseUpdatedManga($, time, ids)

        if (updatedManga.ids.length > 0) {
            mangaUpdatesFoundCallback(createMangaUpdates({
            ids: updatedManga.ids
            }))
        }
        }
    }
  
 
    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        // Give Paperback a skeleton of what these home sections should look like to pre-render them
        const section1 = createHomeSection({ id: 'a_recommended', title: '推荐漫画' })
        const section3 = createHomeSection({ id: 'hot_comics', title: '热门漫画', view_more: true })
        const section2 = createHomeSection({ id: 'z_new_updates', title: '最近更新', view_more: true })

        // Fill the homsections with data
        const request1 = createRequestObject({
            url: `${BM_DOMAIN}/comic.html`,
            method,
        })

        const request2 = createRequestObject({
            url: `${BM_DOMAIN}/page/hot/1.html`,
            method,
        })

        const request3 = createRequestObject({
            url: `${BM_DOMAIN}/page/new/1.html`,
            method,
        })

        const response1 = await this.requestManager.schedule(request1, 1)
        const $1 = this.cheerio.load(response1.data)

        const response2 = await this.requestManager.schedule(request2, 1)
        const $2 = this.cheerio.load(response2.data)

        const response3 = await this.requestManager.schedule(request3, 1)
        const $3 = this.cheerio.load(response3.data)

        parseHomeSections($1, section1, sectionCallback)
        parseHotManga($2, section2, sectionCallback)
        parseNewManga($3, section3, sectionCallback)
    }
  

    async searchRequest(query: SearchRequest, metadata: any): Promise<PagedResults> {
        let page : number = metadata?.page ?? 1
        const search = generateSearch(query)
        const request = createRequestObject({
            url: `${BM_DOMAIN}/search/`,
            method,
            headers,
            param: `${search}/${page}.html`
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        const manga = parseSearch($)
        metadata = !isLastPage($) ? {page: page + 1} : undefined
        
        return createPagedResults({
            results: manga,
            metadata
        })
    }
  

    async getTags(): Promise<TagSection[] | null> {
        const request = createRequestObject({
            url: `${BM_DOMAIN}/page/list.html`,
            method,
            headers,
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        return parseTags($)
    }
  

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults | null> {
        // console.log('getViewMoreItems($)')
        let page : number = metadata?.page ?? 1
        let param = ''
        if (homepageSectionId === 'hot_comics')
            param = `/page/hot/${page}.html`
        else if (homepageSectionId === 'z_new_updates')
            param = `/page/new/${page}.html`
        else return Promise.resolve(null)

        const request = createRequestObject({
            url: `${BM_DOMAIN}`,
            method,
            param,
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data)
        const manga = parseViewMore($)
        // console.log('isLastPage($) ' + isLastPage($))
        metadata = !isLastPage($) ? { page: page + 1 } : undefined

        return createPagedResults({
            results: manga,
            metadata
        })
    }
  

    globalRequestHeaders(): RequestHeaders {
        return {
            referer: BM_DOMAIN
        }
    }
  }