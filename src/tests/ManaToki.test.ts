import cheerio from 'cheerio'
import { APIWrapper, Source } from 'paperback-extensions-common';
import { ManaToki } from '../ManaToki/ManaToki';

describe('ManaToki Tests', function () {

    var wrapper: APIWrapper = new APIWrapper();
    var source: Source = new ManaToki(cheerio);
    var chai = require('chai'), expect = chai.expect, should = chai.should();
    var chaiAsPromised = require('chai-as-promised');
    chai.use(chaiAsPromised);

    /**
     * The Manga ID which this unit test uses to base it's details off of.
     * Try to choose a manga which is updated frequently, so that the historical checking test can 
     * return proper results, as it is limited to searching 30 days back due to extremely long processing times otherwise.
     */
    var mangaId = "132221"; // Attack on Titan

    it("Retrieve Manga Details", async () => {
        let details = await wrapper.getMangaDetails(source, mangaId);
        expect(details, "No results found with test-defined ID [" + mangaId + "]").to.exist

        // Validate that the fields are filled
        let data = details;
        expect(data.id, "Missing ID").to.be.not.empty;
        expect(data.image, "Missing Image").to.be.not.empty;
        expect(data.status, "Missing Status").to.exist;
        expect(data.author, "Missing Author").to.be.not.empty;
        expect(data.titles, "Missing Titles").to.be.not.empty;
        expect(data.rating, "Missing Rating").to.exist;
    });

    it("Get Chapters", async () => {
        let data = await wrapper.getChapters(source, mangaId);

        expect(data, "No chapters present for: [" + mangaId + "]").to.not.be.empty;

        let entry = data[0]
        expect(entry.id, "No ID present").to.not.be.empty;
        expect(entry.time, "No date present").to.exist
        expect(entry.name, "No title available").to.not.be.empty
        expect(entry.chapNum, "No chapter number present").to.exist
    });

    it("Get Chapter Details", async () => {

        let chapters = await wrapper.getChapters(source, mangaId);
        let data = await wrapper.getChapterDetails(source, mangaId, chapters[0].id);

        expect(data, "No server response").to.exist;
        expect(data, "Empty server response").to.not.be.empty;

        expect(data.id, "Missing ID").to.be.not.empty;
        expect(data.mangaId, "Missing MangaID").to.be.not.empty;
        expect(data.pages, "No pages present").to.be.not.empty;
    });

    it("Testing search", async () => {
        let testSearch = createSearchRequest({
            title: '진격의 거인' // Attack on Titan
        });

        let search = await wrapper.searchRequest(source, testSearch, {page: 1});
        let result = search.results[0]

        expect(result, "No response from server").to.exist;

        expect(result.id, "No ID found for search query").to.be.not.empty;
        expect(result.image, "No image found for search").to.be.not.empty;
        expect(result.title, "No title").to.be.not.null;
    });

    it("Testing home page results for 최신화", async () => {
        const resultsPage1 = await wrapper.getViewMoreItems(source, "list", { page: 1 }, 1);
        const resultsPage3 = await wrapper.getViewMoreItems(source, "list", { page: 3 }, 1);
    
        expect(resultsPage1, "No results for page 1 for this section").to.exist;
        expect(resultsPage3, "No results for page 3 for this section").to.exist;
        expect(resultsPage1, "Page 1 and 3 are the same").to.not.be.eql(resultsPage3);
    
        const data = resultsPage1![0];
    
        expect(data.id, "No ID present").to.exist;
        expect(data.image, "No image present").to.exist;
        expect(data.title.text, "No title present").to.exist;
    });
    
    it("Testing home page results for 만화목록", async () => {
        const resultsPage1 = await wrapper.getViewMoreItems(source, "list", { page: 1 }, 1);
        const resultsPage3 = await wrapper.getViewMoreItems(source, "list", { page: 3 }, 1);
    
        expect(resultsPage1, "No results for page 1 for this section").to.exist;
        expect(resultsPage3, "No results for page 3 for this section").to.exist;
        expect(resultsPage1, "Page 1 and 3 are the same").to.not.be.eql(resultsPage3);
    
        const data = resultsPage1![0];
    
        expect(data.id, "No ID present").to.exist;
        expect(data.image, "No image present").to.exist;
        expect(data.title.text, "No title present").to.exist;
    });
    
    // CAN GET IP BANNED
    // it("Testing Notifications", async () => {
    //     const updates = await wrapper.filterUpdatedManga(source, new Date("2021-03-26"), [mangaId]);
    
    //     expect(updates, "No server response").to.exist;
    //     expect(updates, "Empty server response").to.not.be.empty;
    //     expect(updates[0].ids, "No updates").to.not.be.empty;
    // });

})