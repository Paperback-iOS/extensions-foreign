import cheerio from 'cheerio'
import axios from 'axios'
import { APIWrapper, Source } from "paperback-extensions-common";
import { MangaMint } from "../MangaMint/MangaMint";
 
describe("MangaMint Tests", function () {
    const wrapper: APIWrapper = new APIWrapper();
    const source: Source = new MangaMint(cheerio);
    const chai = require("chai");
    const expect = chai.expect;
    const chaiAsPromised = require("chai-as-promised");
 
    chai.use(chaiAsPromised);
 
    /**
     * The Manga ID which this unit test uses to base it's details off of.
     * Try to choose a manga which is updated frequently, so that the historical checking test can
     * return proper results, as it is limited to searching 30 days back due to extremely long processing times otherwise.
     */
    const mangaId = "kimi-no-koto-ga-dai-dai-dai-dai-daisuki-na-100-ri-no-kanojo";
 
    it("Retrieve Manga Details", async () => {
        const details = await wrapper.getMangaDetails(source, mangaId);
 
        expect(details, "No results found with test-defined ID [" + mangaId + "]").to.exist;
 
        const data = details;
 
        expect(data.id, "Missing ID").to.be.not.empty;
        expect(data.image, "Missing Image").to.be.not.empty;
        // Ensure that we can resolve the image
        const promises: Promise<void>[] = []
        promises.push(axios.get(data.image).then((imageResult: { status: any; }) => {expect(imageResult.status).to.equal(200)}))
        await Promise.all(promises)
        expect(data.status, "Missing Status").to.exist;
        expect(data.author, "Missing Author").to.be.not.empty;
        expect(data.desc, "Missing Description").to.be.not.empty;
        expect(data.titles, "Missing Titles").to.be.not.empty;
        expect(data.rating, "Missing Rating").to.exist;
    });
 
    it("Get Chapters", async () => {
        const data = await wrapper.getChapters(source, mangaId);
 
        expect(data, "No chapters present for: [" + mangaId + "]").to.not.be.empty;
 
        const entry = data[0];
 
        expect(entry.id, "No ID present").to.not.be.empty;
        expect(entry.time, "No date present").to.exist;
        expect(entry.name, "No title available").to.not.be.empty;
        expect(entry.chapNum, "No chapter number present").to.exist;
    });
 
    it("Get Chapter Details", async () => {
        const chapters = await wrapper.getChapters(source, mangaId);
        const data = await wrapper.getChapterDetails(source, mangaId, chapters[0].id);
 
        expect(data, "No server response").to.exist;
        expect(data, "Empty server response").to.not.be.empty;
        expect(data.id, "Missing ID").to.be.not.empty;
        expect(data.mangaId, "Missing MangaID").to.be.not.empty;
        expect(data.pages, "No pages present").to.be.not.empty;
    });
 
    it("Testing search", async () => {
        const testSearch = createSearchRequest({ title: "he" });
        const search = await wrapper.searchRequest(source, testSearch, { page: 0 });
        const data = search.results[0];
 
        expect(data, "No response from server").to.exist;
        expect(data.id, "No ID found for search query").to.be.not.empty;
        expect(data.image, "No image found for search").to.be.not.empty;
        expect(data.title, "No title").to.be.not.null;
        expect(data.subtitleText, "No subtitle text").to.be.not.null;
    });
 
    it("Testing Home-Page aquisition", async () => {
        const homePages = await wrapper.getHomePageSections(source);
 
        expect(homePages, "No response from server").to.exist;
    });

    it("Testing view more page results for POPULAR MANGA titles", async () => {
        const resultsPage1 = await wrapper.getViewMoreItems(source, "popular", {page:1}, 1);
        const resultsPage3 = await wrapper.getViewMoreItems(source, "popular", {page:3}, 1);
    
        expect(resultsPage1, "No results for page 1 for this section").to.exist;
        expect(resultsPage3, "No results for page 3 for this section").to.exist;
        expect(resultsPage1, "Page 1 and 3 are the same").to.not.be.eql(resultsPage3);
    
        const data = resultsPage1![0];
    
        expect(data.id, "No ID present").to.exist;
        expect(data.image, "No image present").to.exist;
        // Ensure that we can resolve the image
        const promises: Promise<void>[] = [];
        promises.push(
            axios.get(data.image).then((imageResult: { status: any }) => {
                expect(imageResult.status).to.equal(200);
            })
        );
        await Promise.all(promises);
        expect(data.title.text, "No title present").to.exist;
    });
});
 