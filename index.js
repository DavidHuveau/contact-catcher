const puppeteer = require("puppeteer");

const START_URLS = [
  "https://www.eventseye.com/fairs/c0_salons_belgique.html"
];
const FOLLOW_REGEX = /^https:\/\/www.eventseye.com\/fairs\/f-[\w\d_.-]{2,}.html$/;
const NEXT_PAGE_REGEX =/^https:\/\/www\.eventseye\.com\/fairs\/c0_salons_belgique_[\d]+.html$/;

let navigateTo = [];

const getRandomInt = (min, max) => {
  return Math.random() * (max - min) + min;
}

const getAllUrl = async (browser, startUrl) => {
  console.log(">startUrl: ", startUrl);
  const page = await browser.newPage();
  let currentUrl = startUrl;


  console.log(">", currentUrl);
  await page.waitFor(getRandomInt(100, 3000));
  await page.goto(currentUrl);
  // Wait for the selector to appear in page
  await page.waitForSelector('body');
  const links = await getLinksInPage(page);
  const linksFiltred = await filterLinks(links);

  currentUrl = await findNextPage(links);


  return linksFiltred;
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

const scrap = async () => {
  // const browser = await puppeter.launch();
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true // use devtools when launching Puppeteer
  });

  const rootUrl = START_URLS[0];
  const urlList = await getAllUrl(browser, rootUrl);
  if(urlList.length) {
    navigateTo.push(...urlList);
  }
  browser.close();
  return navigateTo;
}

scrap()
  .then(results => console.log(">results: ", results.slice(0,5)))
  .catch(err => console.log(`>error: ${err}`));
