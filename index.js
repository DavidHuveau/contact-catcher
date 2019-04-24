const puppeteer = require("puppeteer");

const START_URLS = [
  "https://www.eventseye.com/fairs/c0_salons_belgique.html"
];
const FOLLOW_REGEX = /https:\/\/www.eventseye.com\/fairs\/f-[\w\d_.-]{2,}.html/;

let navigateTo = [];

const getRandomInt = (min, max) => {
  return Math.random() * (max - min) + min;
}

const getAllUrl = async (browser, startUrl) => {
  console.log(">getAllUrl: ", startUrl);
  const page = await browser.newPage();
  await page.waitFor(getRandomInt(100, 3000));
  await page.goto(startUrl);
  // Wait for the selector to appear in page
  await page.waitForSelector('body');
  const links = await getAllUrlInPage(page);
  // console.log(">gross count = ", links.length);
  const linksFiltred = links.filter(link => link.match(FOLLOW_REGEX));
  console.log(">filtred count = ", linksFiltred.length);
  return linksFiltred;
}

const getAllUrlInPage = async (page) => {
  const allLinks = await page.evaluate(() => {
    // debugger
    const links = [...document.querySelectorAll("a")];
    return links ? links.map(link => link.href) : [];
  });
  // console.log(grossLinks);
  return allLinks;
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
