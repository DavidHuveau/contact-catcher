const puppeteer = require("puppeteer");
const fastcsv = require('fast-csv');
const fs = require('fs');

const START_URLS = [
  "https://www.eventseye.com/fairs/c0_salons_belgique.html"
];
const FOLLOW_REGEX = /^https:\/\/www.eventseye.com\/fairs\/f-[\w\d_.-]{2,}.html$/;
const NEXT_PAGE_REGEX =/^https:\/\/www\.eventseye\.com\/fairs\/c0_salons_belgique_[\d]+.html$/;

const IS_TEST_MODE = true;
const IS_LIMITED_RESULTS = false;
const NUMBER_OF_LIMITED_RESULTS = 5;

const IS_DELAY_BEFORE_URL_LOADING = true;
const MIN_DELAY_BEFORE_URL_LOADING = 100;
const MAX_DELAY_BEFORE_URL_LOADING = 3000;

const QUEUE_SIZE = 3;

let urlsToScrap = [];
let urlsVisited = [];
let dataCatched = [];

const getRandomDelay = () => {
  if (!IS_DELAY_BEFORE_URL_LOADING) return 0;
  return Math.random() * (MAX_DELAY_BEFORE_URL_LOADING - MIN_DELAY_BEFORE_URL_LOADING) + MIN_DELAY_BEFORE_URL_LOADING;
}

const getAllUrl = async (browser, startUrl) => {
  console.log(">startUrl: ", startUrl);
  const page = await browser.newPage();
  let currentUrl = startUrl;
  let links = [];
  let linksFiltred = [];

  while(currentUrl) {
    console.log(">currentUrl: ", currentUrl);
    await page.waitFor(getRandomDelay());
    await page.goto(currentUrl);
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
    return a ? a.map(link => link.href.trim()) : [];
  });
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

const getContacts = async (browser) => {
  const limit = IS_LIMITED_RESULTS ? NUMBER_OF_LIMITED_RESULTS : urlsToScrap.length - 1;
  const startData = urlsToScrap.slice(0,limit);

  let queue = [];
  let cursor = 0;

  for (let index = 0; index < Math.ceil(startData.length / QUEUE_SIZE); index++) {
    cursor = index * QUEUE_SIZE;
    queue = startData.slice(cursor, cursor + QUEUE_SIZE)
    console.log(index, cursor, cursor + QUEUE_SIZE);
    console.log(queue);

    const results = await Promise.all(
      queue.map(url => {
        if (shouldVisitUrl(url)) {
          urlsVisited.push(url);
          return scrapPage(browser, url);
        }
      })
    );
  }
}

const shouldVisitUrl = async (checkUrl) => {
  return !urlsVisited.find(url => url === checkUrl);
}

const scrapPage = async (browser, url) => {
  const page = await browser.newPage();
  await page.waitFor(getRandomDelay());
  await page.goto(url);
  const resultSelector = "div.orgs div.body";
  await page.waitForSelector(resultSelector);
  console.log(url);


  const result = await page.evaluate(() => {
    // debugger
    const organizer = document.querySelector("body > div.orgs > div > div > div > div > a.orglink").innerText;
    const phone = document.querySelector("body > div.orgs > div > div > div > div > div.ev-phone").innerText;
    const email = document.querySelector("body > div.orgs > div > div > div > div > a.ev-mail").href;
    const webSite = document.querySelector("body > div.orgs > div > div > div > div > a.ev-web").href;
    const country = document.querySelector("body > div.orgs > div > div > div > div > strong").innerText;

    return { organizer, country, phone, email, webSite };
  });
  await page.close();
  await dataCatched.push(result);
}

const setTestUrls = () => {
  urlsToScrap.push(
    "https://www.eventseye.com/fairs/f-salon-zen-topia-villers-la-ville-25967-0.html",
    "https://www.eventseye.com/fairs/f-dempforest-22535-0.html",
    "https://www.eventseye.com/fairs/f-estetika-11579-0.html",
    "https://www.eventseye.com/fairs/f-realty-13478-0.html",
    "https://www.eventseye.com/fairs/f-fedoba-6885-0.html")
}

const main = async () => {
  // const browser = await puppeter.launch();
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });
  const rootUrl = START_URLS[0];

  if (IS_TEST_MODE)
    setTestUrls();
  else
    await getAllUrl(browser, rootUrl);

  if(urlsToScrap.length) await getContacts(browser);

  if(dataCatched)
  {
    const ws = fs.createWriteStream("out.csv");
    fastcsv
      .write(dataCatched, { headers: true })
      .pipe(ws);
  }

  browser.close();
  return `${urlsVisited.length} urls scraped`;
}

main()
  .then(summary => console.log(`>END: ${summary}`))
  .catch(err => console.log(`>ERROR: ${err}`));
