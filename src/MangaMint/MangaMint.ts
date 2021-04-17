import {
    Source,
    Manga,
    Chapter,
    ChapterDetails,
    HomeSection,
    SearchRequest,
    LanguageCode,
    MangaStatus,
    PagedResults,
    SourceInfo,
    Tag,
    TagType,
    MangaTile
} from "paperback-extensions-common"

const MANGAMINT_API_BASE = "https://mangamint.kaedenoki.net/api"

export const MangaMintInfo: SourceInfo = {
    version: "1.0.3",
    name: "MangaMint",
    icon: "icon.png",
    author: "nar1n",
    authorWebsite: "https://github.com/nar1n",
    description: "Extension that pulls manga from mangamint.kaedenoki.net",
    language: LanguageCode.INDONESIAN,
    hentaiSource: false,
    websiteBaseURL: MANGAMINT_API_BASE,
    sourceTags: [
        {
            text: 'Slow',
            type: TagType.BLUE
        }
    ]
}

export class MangaMint extends Source {
    requestManager = createRequestManager({
        requestsPerSecond: 2,
        requestTimeout: 25000,
    })

    async getMangaDetails(mangaId: string): Promise<Manga> {
        let requestTry = 1
        let request = createRequestObject({
            url: `${MANGAMINT_API_BASE}/manga/detail/`,
            method: "GET",
            param: encodeURIComponent(mangaId)
        })

        let response = await this.requestManager.schedule(request, 1)
        let mangaDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data

        // Checks that json returned is not empty
        while (requestTry <= 3 && mangaDetails["title"] == "") {
            response = await this.requestManager.schedule(request, 1)
            mangaDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data
            requestTry++
        }

        let mangaStatus = MangaStatus.COMPLETED
        if (mangaDetails["status"] == "Ongoing") {
            mangaStatus = MangaStatus.ONGOING
        }

        const tags: Tag[] = []
        for (const tag of mangaDetails["genre_list"]) {
            tags.push(createTag({
                id: tag['genre_name'],
                label: tag['genre_name']
            }))
        }
        const tagSections = [createTagSection({
            id: 'genre',
            label: 'Genre',
            tags
        })]

        let manga = createManga({
            id: mangaDetails["manga_endpoint"],
            titles: [mangaDetails["title"]],
            image: mangaDetails["thumb"],
            tags: tagSections,
            rating: 5,
            status: mangaStatus,
            author: mangaDetails["author"],
            desc: mangaDetails["synopsis"].split('\n\t\t\t\t\t\t')[1]
        })

        return manga
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        let requestTry = 1
        let request = createRequestObject({
            url: `${MANGAMINT_API_BASE}/manga/detail/`,
            method: "GET",
            param: encodeURIComponent(mangaId)
        })

        let response = await this.requestManager.schedule(request, 1)
        let mangaDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data

        // Checks that json returned is not empty
        while (requestTry <= 3 && mangaDetails["title"] == "") {
            response = await this.requestManager.schedule(request, 1)
            mangaDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data
            requestTry++
        }

        let chapters = []
        for (const chapter of mangaDetails["chapter"]) {
            chapters.push(
                createChapter({
                    id: chapter["chapter_endpoint"],
                    mangaId: mangaId,
                    chapNum: Number(chapter["chapter_title"].split(' ').pop()),
                    langCode: LanguageCode.INDONESIAN,
                    name: chapter["chapter_title"],
                    time: new Date()
                })
            )
        }
        return chapters
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        let requestTry = 1
        let request = createRequestObject({
            url: `${MANGAMINT_API_BASE}/chapter/`,
            method: "GET",
            param: encodeURIComponent(chapterId)
        })

        let response = await this.requestManager.schedule(request, 1)
        let chapterDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data

        // Checks that json returned is not empty
        while (requestTry <= 3 && chapterDetails["chapter_pages"] == 0) {
            response = await this.requestManager.schedule(request, 1)
            chapterDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data
            requestTry++
        }

        let chapterPages = []
        for (const pageInfo of chapterDetails["chapter_image"]) {
            chapterPages.push(pageInfo["chapter_image_link"])
        }
        
        return createChapterDetails({
            id: chapterId,
            longStrip: false,
            mangaId: mangaId,
            pages: chapterPages,
        })
    }

    async searchRequest(searchQuery: SearchRequest, metadata: any): Promise<PagedResults> {
        let searchTitle = searchQuery.title ?? ''

        let request = createRequestObject({
            url: `${MANGAMINT_API_BASE}/search/`,
            method: "GET",
            param: searchTitle.replace(' ', '%20')
        })

        const response = await this.requestManager.schedule(request, 3)
        let searchResults = typeof response.data === "string" ? JSON.parse(response.data) : response.data

        let collectedIds: string[] = []
        let mangas = []
        for (const mangaDetails of searchResults["manga_list"]) {
            const id = mangaDetails["endpoint"]
            if (!collectedIds.includes(id)) {
                mangas.push(
                    createMangaTile({
                        id: id,
                        image: mangaDetails["thumb"],
                        title: createIconText({ text: mangaDetails["title"]})
                    })
                )
                collectedIds.push(id)
            }
        }

        return createPagedResults({
            results: mangas
        })
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const sections = [
            {
                request: createRequestObject({
                    url: `${MANGAMINT_API_BASE}/recommended`,
                    method: 'GET'
                }),
                section: createHomeSection({
                    id: 'recommended',
                    title: 'RECOMMENDED MANGA',
                    view_more: false,
                }),
            },
            {
                request: createRequestObject({
                    url: `${MANGAMINT_API_BASE}/manga/popular/1`,
                    method: 'GET'
                }),
                section: createHomeSection({
                    id: 'popular',
                    title: 'POPULAR MANGA',
                    view_more: true
                }),
            },
        ]

        const promises: Promise<void>[] = []

        for (const section of sections) {
            // Let the app load empty sections
            sectionCallback(section.section)

            const response = await this.requestManager.schedule(section.request, 3)
            const result = typeof response.data === "string" ? JSON.parse(response.data) : response.data

            let sectionManga = []
            for (const manga of result["manga_list"]) {
                sectionManga.push(
                    createMangaTile({
                        id: manga["endpoint"],
                        image: manga["thumb"],
                        title: createIconText({ text: manga["title"]})
                    })
                )
            }
            section.section.items = sectionManga
            sectionCallback(section.section)
        }

        await Promise.all(promises)
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults | null> {
        let page: number = metadata?.page ?? 1
        let collectedIds: string[] = metadata?.collectedIds ?? []
        let mangaTiles: MangaTile[] = []
        let mData = undefined

        const request = createRequestObject({
            url: `${MANGAMINT_API_BASE}/manga/popular/${page}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 3)
        const result = typeof response.data === "string" ? JSON.parse(response.data) : response.data

        for (const manga of result["manga_list"]) {
            const id = manga["endpoint"]
            if (!collectedIds.includes(id)) {
                mangaTiles.push(
                    createMangaTile({
                        id: id,
                        image: manga["thumb"],
                        title: createIconText({ text: manga["title"]})
                    })
                )
                collectedIds.push(id)
            }
        }

        if (page <= 29) {
            mData = {page: (page + 1), collectedIds: collectedIds}
        }

        return createPagedResults({
            results: mangaTiles,
            metadata: mData
        })
    }
}