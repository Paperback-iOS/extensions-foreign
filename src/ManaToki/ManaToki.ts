import {
    Source,
    Manga,
    Chapter,
    ChapterDetails,
    HomeSection,
    SearchRequest,
    PagedResults,
    SourceInfo,
    MangaUpdates,
    TagType
} from "paperback-extensions-common"
import {parseChapterDetails, parseChapters, parseHomeUpdates, parseHomeList, parseMangaDetails, parseSearch, parseUpdatedMangas} from "./ManaTokiParser"

const MANATOKI_DOMAIN = 'https://manatoki95.net'
const MANATOKI_COMIC = MANATOKI_DOMAIN + '/comic/'
const method = 'GET'


export const ManaTokiInfo: SourceInfo = {
    version: '1.0.3',
    name: '마나토끼',
    icon: 'icon.png',
    author: 'nar1n',
    authorWebsite: 'https://github.com/nar1n',
    description: 'Extension that pulls manga from ManaToki',
    hentaiSource: false,
    websiteBaseURL: MANATOKI_DOMAIN,
    sourceTags: [
        {
            text: "Korean",
            type: TagType.GREY
        }
    ]
}

export class ManaToki extends Source {
    getMangaShareUrl(mangaId: string): string | null { return `${MANATOKI_COMIC}${mangaId}` }

    requestManager = createRequestManager({
        requestsPerSecond: 2,
        requestTimeout: 10000
    })

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: MANATOKI_COMIC,
            method,
            param: mangaId
        })

        const response = await this.requestManager.schedule(request, 3)
        let $ = this.cheerio.load(response.data)

        return parseMangaDetails($, mangaId)
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = createRequestObject({
            url: MANATOKI_COMIC,
            method,
            param: mangaId
        })

        const response = await this.requestManager.schedule(request, 3)
        let $ = this.cheerio.load(response.data)

        return parseChapters($, mangaId)
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = createRequestObject({
            url: MANATOKI_COMIC,
            method,
            param: chapterId
        })

        const response = await this.requestManager.schedule(request, 3)
        const $ = this.cheerio.load(response.data)
        return parseChapterDetails($, this.cheerio.load, mangaId, chapterId)
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const sections = [
            {
                request: createRequestObject({
                    url: `${MANATOKI_DOMAIN}/bbs/page.php?hid=update`,
                    method: 'GET'
                }),
                section: createHomeSection({
                    id: 'updates',
                    title: '최신화',
                    view_more: true,
                }),
            },
            {
                request: createRequestObject({
                    url: `${MANATOKI_DOMAIN}/comic`,
                    method: 'GET'
                }),
                section: createHomeSection({
                    id: 'list',
                    title: '만화목록',
                    view_more: true
                }),
            },
        ]

    const promises: Promise<void>[] = []

    for (const section of sections) {
        // Let the app load empty sections
        sectionCallback(section.section)

        // Get the section data
        promises.push(
            this.requestManager.schedule(section.request, 3).then(response => {
                const $ = this.cheerio.load(response.data)
                switch (section.section.id) {
                    case 'updates':
                        section.section.items = parseHomeUpdates($).manga
                        break
                    case 'list':
                        section.section.items = parseHomeList($).manga
                        break
                }
                sectionCallback(section.section)
            }),
        )
    }

    // Make sure the function completes
    await Promise.all(promises)
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults | null> {
        let page: number = metadata?.page ?? 1
        let collectedIds: string[] = metadata?.collectedIds ?? []
        let manga
        let mData = undefined

        switch (homepageSectionId) {

            case 'updates': {
                let request = createRequestObject({
                    url: `${MANATOKI_DOMAIN}/bbs/page.php?hid=update&page=${page}`,
                    method: 'GET'
                })

                let data = await this.requestManager.schedule(request, 3)
                let $ = this.cheerio.load(data.data)

                let parsedData = parseHomeUpdates($, collectedIds)
                manga = parsedData.manga
                collectedIds = parsedData.collectedIds

                if (page <= 9) {
                    mData = {page: (page + 1), collectedIds: collectedIds}
                }
                break
            }
            case 'list': {
                let request = createRequestObject({
                    url: `${MANATOKI_DOMAIN}/comic/p${page}`,
                    method: 'GET'
                })

                let data = await this.requestManager.schedule(request, 3)
                let $ = this.cheerio.load(data.data)

                let parsedData = parseHomeList($, collectedIds)
                manga = parsedData.manga
                collectedIds = parsedData.collectedIds

                if (page <= 9) {
                    mData = {page: (page + 1), collectedIds: collectedIds}
                }
                break
            }
            default:
                return Promise.resolve(null)
        }

        return createPagedResults({
            results: manga,
            metadata: mData
        })
    }

    async searchRequest(query: SearchRequest): Promise<PagedResults> {
        const search = query.title ?? ''
        const request = createRequestObject({
            url: `${MANATOKI_DOMAIN}/comic?stx=`,
            method,
            param: encodeURI(search.replace(/ /g, '+'))
        })

        const response = await this.requestManager.schedule(request, 3)
        const $ = this.cheerio.load(response.data)
        const manga = parseSearch($)
        
        return createPagedResults({
            results: manga,
        })
    }

    // Commented out as this leads to IP ban
    // async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
    //     let page: number = 1
    //     let loadNextPage = true
    //     while (loadNextPage) {
    //         const request = createRequestObject({
    //             url: `${MANATOKI_DOMAIN}/bbs/page.php?hid=update&page=${page}`,
    //             method: 'GET'
    //         })

    //         let data = await this.requestManager.schedule(request, 3)
    //         let $ = this.cheerio.load(data.data)

    //         let updatedManga = parseUpdatedMangas($, time, ids, this)
    //         loadNextPage = updatedManga.loadNextPage
    //         if (loadNextPage) {
    //             page++
    //         }
    //         if (updatedManga.updates.length > 0) {
    //             mangaUpdatesFoundCallback(createMangaUpdates({
    //                 ids: updatedManga.updates
    //             }))
    //         }
    //     }
    // }
}