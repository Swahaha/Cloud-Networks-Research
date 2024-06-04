const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Function to perform the search and get results
  const searchGoogle = async (searchTerm) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    // Wait for the results to load
    await page.waitForSelector('h3');

    // Extract the results
    const results = await page.evaluate(() => {
      const searchResults = [];
      const items = document.querySelectorAll('div.g');
      items.forEach((item, index) => {
        if (index < 3) { // Limit to the top 3 results
          const titleElement = item.querySelector('h3');
          const linkElement = item.querySelector('a');
          if (titleElement && linkElement) {
            const title = titleElement.innerText;
            const link = linkElement.href;
            searchResults.push({ title, link });
          }
        }
      });
      return searchResults;
    });

    return results;
  };

  // Perform the search
  const searchTerm = 'Hurricane Electric Network Map';
  const results = await searchGoogle(searchTerm);
  console.log('Top 3 Search results:', results);
  await browser.close();
})();
