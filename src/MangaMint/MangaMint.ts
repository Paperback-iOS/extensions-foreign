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
  TagType
} from "paperback-extensions-common"

const MANGAMINT_API_BASE = "https://mangamint.kaedenoki.net/api"

export const MangaMintInfo: SourceInfo = {
  version: "1.0.1",
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
      text: 'Buggy',
      type: TagType.RED
    },
    {
      text: 'Slow',
      type: TagType.RED
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

    while (requestTry <= 3 && mangaDetails["title"] == "") {
      response = await this.requestManager.schedule(request, 1)
      mangaDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data
      requestTry++
    }

    let mangaStatus = MangaStatus.COMPLETED
    if (mangaDetails["status"] == "Ongoing") {
      mangaStatus = MangaStatus.ONGOING
    }

    let manga = createManga({
      id: mangaDetails["manga_endpoint"],
      titles: [mangaDetails["title"]],
      image: mangaDetails["thumb"],
      rating: 5,
      status: mangaStatus,
      author: mangaDetails["author"],
      desc: mangaDetails["synopsis"]
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

    while (requestTry <= 3 && mangaDetails["title"] == "") {
      response = await this.requestManager.schedule(request, 1)
      mangaDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data
      requestTry++
    }

    let chapters = []
    for (const chapter of mangaDetails["chapter"]) {
      let chapterNumber = chapter["chapter_title"].match(/\d/g)
      chapterNumber = chapterNumber.join("")
      chapters.push(
        createChapter({
          id: chapter["chapter_endpoint"],
          mangaId: mangaId,
          chapNum: Number(chapter["chapter_title"].replace(/^\D+/, '')),
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

    let mangas = []
    for (const mangaDetails of searchResults["manga_list"]) {
      mangas.push(
        createMangaTile({
          id: mangaDetails["endpoint"],
          image: mangaDetails["thumb"],
          title: createIconText({ text: mangaDetails["title"] }),
        })
      )
    }

    return createPagedResults({
      results: mangas
    })
  }

  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {

    // Send the empty homesection back so the app can preload the section
    var recommendedSection = createHomeSection({ id: "recommended", title: "RECOMMENDED MANGAS" })
    sectionCallback(recommendedSection)
    var popularSection = createHomeSection({ id: "popular", title: "POPULAR MANGAS" })
    sectionCallback(popularSection)

    const requestRecommended = createRequestObject({
      url: `${MANGAMINT_API_BASE}/recommended`,
      method: "GET"
    })

    const responseRecommended = await this.requestManager.schedule(requestRecommended, 3)
    let resultRecommended = typeof responseRecommended.data === "string" ? JSON.parse(responseRecommended.data) : responseRecommended.data

    let recommendedMangas = []
    for (const mangaDetails of resultRecommended["manga_list"]) {
      recommendedMangas.push(
        createMangaTile({
          id: mangaDetails["endpoint"],
          image: mangaDetails["thumb"],
          title: createIconText({ text: mangaDetails["title"] }),
        })
      )
    }
    recommendedSection.items = recommendedMangas
    sectionCallback(recommendedSection)

    const requestPopular = createRequestObject({
      url: `${MANGAMINT_API_BASE}/manga/popular/1`,
      method: "GET"
    })

    const responsePopular = await this.requestManager.schedule(requestPopular, 3)
    let resultPopular = typeof responsePopular.data === "string" ? JSON.parse(responsePopular.data) : responsePopular.data

    let popularMangas = []
    for (const mangaDetails of resultPopular["manga_list"]) {
      popularMangas.push(
        createMangaTile({
          id: mangaDetails["endpoint"],
          image: mangaDetails["thumb"],
          title: createIconText({ text: mangaDetails["title"] }),
        })
      )
    }
    popularSection.items = popularMangas
    sectionCallback(popularSection)
  }

  getMangaShareUrl(mangaId: string) {
    return `${MANGAMINT_API_BASE}/manga/detail/${mangaId}`
  }
}
