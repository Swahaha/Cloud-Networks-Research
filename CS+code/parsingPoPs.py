import pdfminer
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextBoxHorizontal, LTTextLineHorizontal, LTCurve
import networkx as nx
import matplotlib.pyplot as plt
import numpy as np

def extract_city_positions(pdf_path):
    city_positions = {}
    for page_layout in extract_pages(pdf_path):
        for element in page_layout:
            if isinstance(element, LTTextBoxHorizontal):
                for line in element:
                    if isinstance(line, LTTextLineHorizontal):
                        city_name = line.get_text().strip()
                        if city_name:
                            x_start, y_start = line.bbox[0], line.bbox[1]
                            x_end, y_end = line.bbox[2], line.bbox[1]
                            city_positions[city_name] = ((x_start, y_start), (x_end, y_end))
        break  # Only process the first page (map part)
    return city_positions

def extract_circle_positions(pdf_path):
    circle_positions = []
    for page_layout in extract_pages(pdf_path):
        for element in page_layout:
            if isinstance(element, LTCurve):
                x0, y0, x1, y1 = element.bbox
                width = x1 - x0
                height = y1 - y0
                if abs(width - height) < 2 and width < 20 and height < 20:  # Arbitrary threshold
                    center_x = (x0 + x1) / 2
                    center_y = (y0 + y1) / 2
                    circle_positions.append((center_x, center_y))
        break  
    return circle_positions

def find_nearest_nodes(city_positions, circle_positions, threshold=50):
    matched_positions = {}
    used_nodes = set()
    circle_positions_array = np.array(circle_positions)
    
    for city_name, (start_pos, end_pos) in city_positions.items():
        if len(circle_positions_array) == 0:
            continue
        
        start_distances = np.sqrt((circle_positions_array[:, 0] - start_pos[0]) ** 2 +
                                  (circle_positions_array[:, 1] - start_pos[1]) ** 2)
        end_distances = np.sqrt((circle_positions_array[:, 0] - end_pos[0]) ** 2 +
                                (circle_positions_array[:, 1] - end_pos[1]) ** 2)
        
        distances = np.minimum(start_distances, end_distances)
        
        sorted_indices = np.argsort(distances)
        for idx in sorted_indices:
            if distances[idx] < threshold and tuple(circle_positions_array[idx]) not in used_nodes:
                nearest_node = tuple(circle_positions_array[idx])
                matched_positions[city_name] = nearest_node
                used_nodes.add(nearest_node)
                break
                
    return matched_positions

# Main logic
pdf_path = "HEtest.pdf"
city_positions = extract_city_positions(pdf_path)
circle_positions = extract_circle_positions(pdf_path)
matched_positions = find_nearest_nodes(city_positions, circle_positions)
G = nx.Graph()
for city, (x, y) in matched_positions.items():
    G.add_node(city, pos=(x, y))
pos = nx.get_node_attributes(G, 'pos')

plt.figure(figsize=(15, 15))
nx.draw(G, pos, with_labels=True, node_size=500, node_color="skyblue", font_size=8, font_weight="bold")
plt.title("City Positions Adjusted to Circle Nodes")
plt.show()