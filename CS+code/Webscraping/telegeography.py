import time
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class CloudInfrastructureMapScraper:
    _SLEEP_DURATION = 5 * 60
    _MAX_RETRIES = 10

    def __init__(self, out_dir):
        self._url = "https://www.cloudinfrastructuremap.com/#/service/cloud-regions"
        self._out_dir = out_dir

    def run_steps(self):
        print("Retrieving nodes from Cloud Infrastructure Map")
        self._nodes = self._fetch_nodes()
        self.save_json(self._out_dir / ("cloud_infrastructure_map_" + time.strftime("%Y%m%d") + ".json"))

    def _fetch_nodes(self):
        options = FirefoxOptions()
        options.add_argument("--headless")
        options.set_preference("general.useragent.override", 
            "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:44.0) Gecko/20100101 Firefox/44.0")

        browser = webdriver.Firefox(options=options)
        browser.get(self._url)
        time.sleep(10)  # wait for the page to load completely

        # Wait for the map markers to load
        WebDriverWait(browser, 30).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "leaflet-marker-icon"))
        )

        nodes = []

        # Find all marker elements
        marker_elements = browser.find_elements(By.CLASS_NAME, "leaflet-marker-icon")

        for marker in marker_elements:
            marker.click()
            time.sleep(2)  # wait for the popup to load

            # Extract data from the popup
            try:
                popup = WebDriverWait(browser, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "leaflet-popup-content"))
                )
                address = popup.text
                nodes.append(address)
                close_button = browser.find_element(By.CLASS_NAME, "leaflet-popup-close-button")
                close_button.click()
            except Exception as e:
                print(f"Error extracting data from marker: {e}")
                continue

        browser.quit()
        print(f"Found {len(nodes)} nodes in Cloud Infrastructure Map")
        return nodes

    def save_json(self, f_name):
        print(f"Saving to {f_name}.")
        with open(f_name, 'w') as f:
            json.dump(self._nodes, f, indent=4)

if __name__ == "__main__":
    output_dir = Path("./")
    my_crawler = CloudInfrastructureMapScraper(output_dir)
    my_crawler.run_steps()
