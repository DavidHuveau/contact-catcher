const puppeteer = require("puppeteer");

const START_URLS = [
  "https://www.eventseye.com/fairs/c0_salons_belgique.html"
];
const FOLLOW_REGEX = /^https:\/\/www.eventseye.com\/fairs\/f-[\w\d_.-]{2,}.html$/;
const NEXT_PAGE_REGEX =/^https:\/\/www\.eventseye\.com\/fairs\/c0_salons_belgique_[\d]+.html$/;

let urlsToScrap = [];
let urlsVisited = [];

const getRandomInt = (min, max) => {
  return Math.random() * (max - min) + min;
}

const getAllUrl = async (browser, startUrl) => {
  console.log(">startUrl: ", startUrl);
  const page = await browser.newPage();
  let currentUrl = startUrl;
  let links = [];
  let linksFiltred = [];

  while(currentUrl) {
    console.log(">currentUrl: ", currentUrl);
    await page.waitFor(getRandomInt(100, 3000));
    await page.goto(currentUrl);
    // Wait for the selector to appear in page
    await page.waitForSelector('body');
    links = await getLinksInPage(page);
    linksFiltred.push(...await filterLinks(links));

    currentUrl = await findNextPage(links);
  }

  urlsToScrap.push(...linksFiltred);
  page.close();
}

const getLinksInPage = async (page) => {
  const links = await page.evaluate(() => {
    // debugger
    const a = [...document.querySelectorAll("a")];
    return a ? a.map(link => link.href) : [];
  });
  console.log(">gross count = ", links ? links.length : 0);
  return links;
}

const filterLinks = async (anchors) => {
  const linksFiltred = anchors.filter(link => link.match(FOLLOW_REGEX));
  console.log(">filtred count = ", linksFiltred ? linksFiltred.length : 0);
  return linksFiltred;
}

const findNextPage = async (links) => {
  return links.find(link => link.match(NEXT_PAGE_REGEX));
}

const getDatas = async (browser) => {
  // const results = await Promise.all(
  //   urlList.slice(0,5).map(url => getDataFromUrl(browser, url))
  // );
  // return results
}

const shouldVisitUrl = async (url) => {

}

// const scrapPage = async () =>

const main = async () => {
  // const browser = await puppeter.launch();
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true // use devtools when launching Puppeteer
  });
  const rootUrl = START_URLS[0];

  await getAllUrl(browser, rootUrl);
  if(urlsToScrap.length) await getDatas(browser);

  browser.close();
  return urlsToScrap;
}

main()
  .then(results => console.log(">results: ", results))
  .catch(err => console.log(`>error: ${err}`));
