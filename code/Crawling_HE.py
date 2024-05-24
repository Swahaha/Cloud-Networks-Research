import os
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

class CrawlingHE:
    _SLEEP_DURATION = 5*60
    _MAX_RETRIES = 10

    def __init__(self, out_dir):
        self._ixp_summary_url = "http://bgp.he.net/report/exchanges"
        self._ixp_base_url = "http://bgp.he.net/exchange"
        self._out_dir = out_dir        

    def run_steps(self):
        print("Retrieving IXP data from Hurricane Electric")
        self._ixps = self._fetch_ixp_list()
        self._fill_ixps()
        self.save_json(self._out_dir / ("he_dump_" + time.strftime("%Y%m%d") + ".json"))

    def _fetch_ixp_list(self):
        options = FirefoxOptions()
        options.add_argument("--headless")
        profile = webdriver.FirefoxProfile()
        profile.set_preference("general.useragent.override", 
            "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:44.0) Gecko/20100101 Firefox/44.0")
        
        browser = webdriver.Firefox(options=options, firefox_profile=profile)
        browser.get(self._ixp_summary_url)
        ixps = {}
        ixp_table = browser.find_element(By.XPATH, "id('exchangestable')/tbody")
        ixp_rows = ixp_table.find_elements(By.TAG_NAME, "tr")
        for row in ixp_rows:
            tds = row.find_elements(By.TAG_NAME, "td")
            if tds:
                a_element = tds[0].find_element(By.TAG_NAME, "a")
                name = a_element.text
                link = a_element.get_attribute("href")
                members = int(tds[1].text.replace(",", ""))
                data = tds[2].find_element(By.TAG_NAME, "img").get_attribute('alt')
                cc = tds[3].text
                city = tds[4].text
                website = tds[5].find_element(By.TAG_NAME, "a").get_attribute("href")

                ixps[name] = {
                    "name": name,
                    "members": members,
                    "data_feed_health": data,
                    "cc": cc,
                    "city": city,
                    "ixp_external_url": website,
                    "he_url": link
                }
        browser.quit()
        print(f"Found {len(ixps)} IXPs in HE summary list")
        return ixps

    def _fill_ixps(self, num_workers=4):
        pool = ThreadPoolExecutor(max_workers=num_workers)
        submitted_futures = {pool.submit(self._fill_ixp, ixp): ixp for ixp in self._ixps}

        while submitted_futures:
            for ft in as_completed(submitted_futures.keys()):
                item = submitted_futures.pop(ft)
                try:
                    ft.result()
                except Exception as e:
                    if isinstance(e, KeyboardInterrupt):
                        raise e
                    print(f"Exception while running work item {item}: {e}")

    def _fill_ixp(self, ixp):
        url = self._ixps[ixp]["he_url"]
        options = FirefoxOptions()
        options.add_argument("--headless")
        profile = webdriver.FirefoxProfile()
        profile.set_preference("general.useragent.override",
                               "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:44.0) Gecko/20100101 Firefox/44.0")
        browser = webdriver.Firefox(options=options, firefox_profile=profile)

        attempt = 1
        while attempt <= CrawlingHE._MAX_RETRIES:
            try:
                browser.find_element(By.TAG_NAME, 'body').send_keys(Keys.COMMAND + 't')
                browser.get(url)
                WebDriverWait(browser, 30).until(EC.presence_of_element_located((By.ID, "exchange")))
                property_names = browser.find_elements(By.CLASS_NAME, "asleft")
                property_values = browser.find_elements(By.CLASS_NAME, "asright")

                for name, value in zip(property_names, property_values):
                    if "IPv4 Prefixes:" in name.text:
                        self._ixps[ixp]["v4_pfxs"] = value.text.split(", ")
                    elif "IPv6 Prefixes:" in name.text:
                        self._ixps[ixp]["v6_pfxs"] = value.text.split(", ")
                    else:
                        key = name.text.strip().replace(":", "").lower().replace(" ", "_")
                        if key in self._ixps[ixp]: 
                            continue
                        elif key == "data_feed_health":
                            self._ixps[ixp][key] = value.find_element(By.TAG_NAME, "img").get_attribute('alt')
                        else:
                            self._ixps[ixp][key] = value.text

                self._ixps[ixp]["members"] = []
                members_table = browser.find_elements(By.ID, "members")
                if not members_table:
                    browser.find_element(By.TAG_NAME, 'body').send_keys(Keys.COMMAND + 'w')
                    break
                trs = members_table[0].find_elements(By.TAG_NAME, "tr")
                for row in trs:
                    tds = row.find_elements(By.TAG_NAME, "td")
                    if len(tds) > 0:
                        a_element = tds[0].find_element(By.TAG_NAME, "a")
                        asn = a_element.text
                        he_asn_url = a_element.get_attribute("href")
                        self._ixps[ixp]['members'].append({
                            "asn": asn,
                            "as_name": tds[1].text,
                            "he_asn_url": he_asn_url,
                            "v4_ips": tds[2].text.split("\n"),
                            "v6_ips": tds[3].text.split("\n")
                        })
                browser.find_element(By.TAG_NAME, 'body').send_keys(Keys.COMMAND + 'w')
                break
            except Exception as e:
                print(ixp, type(e).__name__, e)
                attempt += 1
                time.sleep(CrawlingHE._SLEEP_DURATION)
        browser.quit()

    def save_json(self, f_name):
        print(f"Saving to {f_name}.")
        with open(f_name, 'w') as f:
            json.dump(list(self._ixps.values()), f, indent=4)

if __name__ == "__main__":
    print("This script should not be run by itself. Run it through iGDB.py")
    output_dir = Path("../unprocessed/HE")
    my_crawler = CrawlingHE(output_dir)
    my_crawler.run_steps()
