import { Chapter, ChapterDetails, HomeSection, LanguageCode, Manga, MangaStatus, MangaTile, SearchRequest, Tag } from "paperback-extensions-common";

function parseTime(timeString: string): Date {
  if (timeString.includes(':')) {
    // Time
    let currentKoreaDate = new Date().toLocaleDateString('en-US', {timeZone: 'Asia/Seoul'}).split('/')
    currentKoreaDate = [currentKoreaDate[2], currentKoreaDate[0],  currentKoreaDate[1]]
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
  var i=0;
  var out='';
  var l=str.length;
  for(;i < l; i += 3) {
  out+=String.fromCharCode(parseInt(str.substr(i,2),16));
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

export const parseHomeSections = ($: CheerioStatic, sections: HomeSection[], sectionCallback: (section: HomeSection) => void): void => {
  for (const section of sections) sectionCallback(section)
  const updates: MangaTile[] = []
  const manga_list: MangaTile[] = []

  for(const item of $('.post-row', $('.post-wrap', $('.miso-post-gallery').first())).toArray()) {
    updates.push(createMangaTile({
      id: $('a', item).attr('href')?.split('/').pop() ?? '',
      image: $('img', item).attr('src') ?? '',
      title: createIconText({text: $('b', item).text().split(' ').slice(0, -1).join(' ')})
    }))
  }

  for(const item of $('.post-row', $('.post-wrap', $('.miso-post-gallery').last())).toArray()) {
    manga_list.push(createMangaTile({
      id: $('a', item).attr('href')?.split('/').pop() ?? '',
      image: $('img', item).attr('src') ?? '',
      title: createIconText({text: $('.in-subject', item).text().replace('\n', '').split(' ').slice(0, -1).join(' ')})
    }))
  }

  sections[0].items = updates
  sections[1].items = manga_list

  // Perform the callbacks again now that the home page sections are filled with data
  for (const section of sections) sectionCallback(section)
}

export const generateSearch = (query: SearchRequest): string => {
    // Format the search query into a proper request
    const genres = (query.includeGenre ?? []).concat(query.includeDemographic ?? []).join('_')
    const excluded = (query.excludeGenre ?? []).concat(query.excludeDemographic ?? []).join('_')
    let status = ""
    switch (query.status) {
      case 0: status = 'completed'; break
      case 1: status = 'ongoing'; break
      default: status = ''
    }

    let keyword = (query.title ?? '').replace(/ /g, '_')
    if (query.author)
      keyword += (query.author ?? '').replace(/ /g, '_')
    let search: string = `s=all&keyw=${keyword}`
    search += `&g_i=${genres}&g_e=${excluded}`
    if (status) {
      search += `&sts=${status}`
    }

    return search
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
    // for (const item of items) {
    //   const id = $('.genres-item-name', item).attr('href')?.split('/').pop() ?? ''
    //   const title = $('.genres-item-name', item).text()
    //   const subTitle = $('.genres-item-chap', item).text()
    //   const image = $('.img-loading', item).attr('src') ?? ''
    //   const rating = $('.genres-item-rate', item).text()
    //   const updated = $('.genres-item-time', item).text()

    //   manga.push(createMangaTile({
    //     id,
    //     image,
    //     title: createIconText({ text: title }),
    //     subtitleText: createIconText({ text: subTitle }),
    //     primaryText: createIconText({ text: rating, icon: 'star.fill' }),
    //     secondaryText: createIconText({ text: updated, icon: 'clock.fill' })
    //   }))
    // }
    return manga
}