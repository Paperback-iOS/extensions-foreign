import { Chapter, ChapterDetails, LanguageCode, Manga, MangaStatus, MangaTile, Tag } from "paperback-extensions-common";

function parseTime(timeString: string): Date {
    if (timeString.includes(':')) {
        // Time
        let currentKoreaDate = new Date().toLocaleDateString('en-US', {timeZone: 'Asia/Seoul'}).split('/')
        currentKoreaDate = [currentKoreaDate[2], currentKoreaDate[0], currentKoreaDate[1]]
        for (var [index, item] of currentKoreaDate.entries()) {
            if (item.length < 2) {
                currentKoreaDate[index] = '0' + item
            }
        }
        return new Date(currentKoreaDate.join('-') + 'T' + timeString + ':00+09:00')
    }
    else {
        // Date
        return new Date(timeString.replace(/\./g, '-') + 'T00:00:00+09:00')
    }
}

function html_encoder(str: string){
    var i = 0;
    var out = '';
    var l = str.length;
    for(;i < l; i += 3) {
    out += String.fromCharCode(parseInt(str.substr(i, 2), 16));
    }
    return out;
}

export const parseMangaDetails = ($: CheerioStatic, mangaId: string): Manga => {
    let rating = 0
    for (const star of $('i', 'th.active').toArray()) {
        const starClass = $(star).attr('class')
        if (starClass == 'fa fa-star crimson') {
            rating += 1
        } else if (starClass == 'fa fa-star-half-empty crimson') {
            rating += 0.5
        }
    }

    let status = MangaStatus.ONGOING
    if ($('a', 'div.col-sm-9').last().text() == '완결') {
        status = MangaStatus.COMPLETED
    }
    
    const tags: Tag[] = []
    const tagsList = $('a', 'div.tags').toArray().map(x => $(x).text())
    for (const tag of tagsList) {
        tags.push(createTag({
            id: tag,
            label: tag
        }))
    }
    const tagSections = [createTagSection({
        id: '분류',
        label: '분류',
        tags: tags
    })]

    const lastUpdate = parseTime($('div.wr-date.hidden-xs', 'div.serial-list').first().text().replace('\n', '').replace(' ', '').trim())

    return createManga({
        id: mangaId,
        titles: [$('b', 'div.col-sm-9').first().text()],
        image: $('img.img-tag').attr('src') ?? '',
        rating,
        status,
        author: $('a', 'div.col-sm-9').first().text(),
        follows: Number($('b#wr_good').text()),
        tags: tagSections,
        lastUpdate: lastUpdate.toString(),
        // hentai: tagsList.includes('17')
        hentai: false
    })
}

export const parseChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    for (const chapter of $('li', $('ul.list-body', 'div.serial-list').first()).toArray()) {
        const name = $('a', chapter).first().text().split('\n')[5].split(' ').filter(x => x != '').slice(0, -1).join(' ').trim()
        const id = $('a', chapter).first().attr('href')?.split('/').pop()?.split('?')[0] ?? ''
        const time = parseTime($('div.wr-date.hidden-xs', chapter).text().replace('\n', '').trim())
        chapters.push(createChapter({
            id,
            mangaId,
            name,
            langCode: LanguageCode.KOREAN,
            chapNum: Number($('div.wr-num', chapter).text()),
            time
        }))
    }

    return chapters
}

export const parseChapterDetails = ($: CheerioStatic, load: Function, mangaId: string, chapterId: string): ChapterDetails => {
    const script = $('script[type="text/javascript"]').toArray().map(x => $(x).html()).filter(x => x?.includes('html_data+='))[0]
    const imgdivs = html_encoder(script?.split('html_data+=').slice(1, -1).map(x => x.replace(/[\';/\n]/g, '')).join('') ?? '')
    $ = load(imgdivs)
    let pages: string[] = []
    let maxImg = 0
    for (const div of $('div', imgdivs).toArray()) {
        const length = $('img', div).length
        if (length >= maxImg) {
            pages = $(div).html()?.split('data-').map(x => x.split('"')[1]).slice(1) ?? []
            maxImg = length
        }
    }

    return createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages,
        longStrip: false
    })
}

export const parseHomeUpdates = ($: CheerioStatic, collectedIds?: string[]): {manga: MangaTile[], collectedIds: string[]} => {
    let mangaTiles: MangaTile[] = []
    if (!collectedIds) {
        collectedIds = []
    }

    for (const item of $('.post-row', '.miso-post-webzine').toArray()) {
        const id = $('a', $('.pull-right.post-info', item)).attr('href')?.split('/').pop() ?? ''
        const title = $('a', $('.post-subject', item)).children().remove().end().text().trim()
        const image = $('img', item).attr('src') ?? ''

        if (!collectedIds.includes(id)) {
            mangaTiles.push(createMangaTile({
                id: id,
                title: createIconText({text: title}),
                image: image
            }))
            collectedIds.push(id)
        }
    }

    return {manga: mangaTiles, collectedIds: collectedIds}
}

export const parseHomeList = ($: CheerioStatic, collectedIds?: string[]): {manga: MangaTile[], collectedIds: string[]} => {
    let mangaTiles: MangaTile[] = []
    if (!collectedIds) {
        collectedIds = []
    }

    for (const item of $('li', '#webtoon-list-all').toArray()) {
        const id = $('a', item).attr('href')?.split('/').pop() ?? ''
        const title = $('span.title.white', item).text()
        const image = $('img', item).attr('src') ?? ''

        if (!collectedIds.includes(id)) {
            mangaTiles.push(createMangaTile({
                id: id,
                title: createIconText({text: title}),
                image: image
            }))
            collectedIds.push(id)
        }
    }

    return {manga: mangaTiles, collectedIds: collectedIds}
}

export const parseSearch = ($: CheerioStatic): MangaTile[] => {
    const manga: MangaTile[] = []
    const items = $('li', '#webtoon-list-all').toArray()
    for (const item of items) {
        const id = $('a', item).attr('href')?.split('?')[0].split('/').pop() ?? ''
        const image = $('img', item).attr('src') ?? ''
        const title = $('span.title.white', item).text() ?? ''

        manga.push(createMangaTile({
            id,
            image,
            title: createIconText({text: title})
        }))
    }

    return manga
}

export const parseUpdatedMangas = ($: CheerioSelector, time: Date, ids: string[], source: any): {updates: string[], loadNextPage: boolean} => {
    let passedReferenceTime = false
    let updatedManga: string[] = []

    for (const item of $('.post-row', '.miso-post-webzine').toArray()) {
        const id = $('a', $('.pull-right.post-info', item)).attr('href')?.split('/').pop() ?? ''
        const mangaTime = $('span.txt-normal', item).text().split(' ')
        const parsedTime = new Date('2021-' + mangaTime[0] + 'T' + mangaTime[1] + ':00+09:00')

        passedReferenceTime = parsedTime <= time
        if (!passedReferenceTime) {
            if (ids.includes(id)) {
                updatedManga.push(id)
            }
        } else break
    }

    if (!passedReferenceTime) {
        return {updates: updatedManga, loadNextPage: true}
    } else {
        return {updates: updatedManga, loadNextPage: false}
    }
}