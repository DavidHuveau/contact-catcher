const puppeteer = require("puppeteer");
const fastcsv = require('fast-csv');
const fs = require('fs');

const START_URLS = [
  "https://www.eventseye.com/fairs/c0_salons_belgique.html"
];
const FOLLOW_REGEX = /^https:\/\/www.eventseye.com\/fairs\/f-[\w\d_.-]{2,}.html$/;
const NEXT_PAGE_REGEX =/^https:\/\/www\.eventseye\.com\/fairs\/c0_salons_belgique_[\d]+.html$/;

let urlsToScrap = [];
let urlsVisited = [];
let dataCatched = [];

const getRandomInt = (min, max) => {
  return Math.random() * (max - min) + min;
}

const getAllUrl = async (browser, startUrl) => {
  console.log(">StartUrl: ", startUrl);
  const page = await browser.newPage();
  let currentUrl = startUrl;
  let links = [];
  let linksFiltred = [];

  while(currentUrl) {
    console.log(">currentUrl: ", currentUrl);
    await page.waitFor(getRandomInt(100, 3000));
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
  const results = await Promise.all(
    urlsToScrap.slice(0,5).map(url => {
      if (shouldVisitUrl(url)) {
        urlsVisited.push(url);
        return scrapPage(browser, url);
      }
    })
  );
  return results
}

const shouldVisitUrl = async (checkUrl) => {
  // return true;
  return !urlsVisited.find(url => url === checkUrl);
}

const scrapPage = async (browser, url) => {
  const page = await browser.newPage();
  await page.waitFor(getRandomInt(100, 3000));
  await page.goto(url);
  const resultSelector = "div.orgs div.body";
  await page.waitForSelector(resultSelector);

  const result = await page.evaluate(() => {
    // debugger
    const organizer = document.querySelector("body > div.orgs > div > div > div > div > a.orglink").innerText;
    const phone = document.querySelector("body > div.orgs > div > div > div > div > div.ev-phone").innerText;
    const email = document.querySelector("body > div.orgs > div > div > div > div > a.ev-mail").href;
    const webSite = document.querySelector("body > div.orgs > div > div > div > div > a.ev-web").href;
    const country = document.querySelector("body > div.orgs > div > div > div > div > strong").innerText;

    return { organizer, country, phone, email, webSite };
  });
  page.close();
  // console.log(result);
  await dataCatched.push(result);
}

const setTestUrls = () => {
  urlsToScrap.push(
    "https://www.eventseye.com/fairs/f-salon-zen-topia-villers-la-ville-25967-0.html",
    "https://www.eventseye.com/fairs/f-dempforest-22535-0.html");
}

const main = async () => {
  // const browser = await puppeter.launch();
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });
  const rootUrl = START_URLS[0];

  setTestUrls();
  // await getAllUrl(browser, rootUrl);

  if(urlsToScrap.length) await getDatas(browser);
  if(dataCatched)
  {
    console.log(dataCatched);
    const ws = fs.createWriteStream("out.csv");
    fastcsv
      .write(dataCatched, { headers: true })
      .pipe(ws);
  }

  browser.close();
  return urlsVisited.length;
}

main()
  .then(res => console.log(`>END: ${res} urls scraped`))
  .catch(err => console.log(`>ERROR: ${err}`));
