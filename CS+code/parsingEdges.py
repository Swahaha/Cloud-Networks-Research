import pdfminer
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextBoxHorizontal, LTTextLineHorizontal, LTLine, LTCurve
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
        break
    return city_positions

def extract_circle_positions(pdf_path):
    circle_positions = []
    for page_layout in extract_pages(pdf_path):
        for element in page_layout:
            if isinstance(element, LTCurve):
                x0, y0, x1, y1 = element.bbox
                width = x1 - x0
                height = y1 - y0
                if abs(width - height) < 2 and width < 20 and height < 20:
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

# Extract edges from the PDF  --> look at one specific line segment.
def extract_edges(pdf_path):
    edges = []
    for page_layout in extract_pages(pdf_path):
        for element in page_layout:
            if isinstance(element, LTLine):
                start = (element.x0, element.y0)
                end = (element.x1, element.y1)
                edges.append((start, end))
            elif isinstance(element, LTCurve):
                start = (element.bbox[0], element.bbox[1])
                end = (element.bbox[2], element.bbox[3])
                edges.append((start, end))
        break
    return edges

def map_edges_to_nodes(edges, matched_positions):
    edge_list = []
    for edge in edges:
        start, end = edge
        nearest_start = min(matched_positions.items(), key=lambda item: ((item[1][0] - start[0]) ** 2 + (item[1][1] - start[1]) ** 2) ** 0.5)
        nearest_end = min(matched_positions.items(), key=lambda item: ((item[1][0] - end[0]) ** 2 + (item[1][1] - end[1]) ** 2) ** 0.5)
        if nearest_start[1] != nearest_end[1]:
            edge_list.append((nearest_start[0], nearest_end[0]))
    return edge_list

pdf_path = "HEtest.pdf"
city_positions = extract_city_positions(pdf_path)
circle_positions = extract_circle_positions(pdf_path)
matched_positions = find_nearest_nodes(city_positions, circle_positions)
edges = extract_edges(pdf_path)
edge_list = map_edges_to_nodes(edges, matched_positions)

G = nx.Graph()

for city, pos in matched_positions.items():
    G.add_node(city, pos=pos)

for edge in edge_list:
    G.add_edge(*edge)

pos = nx.get_node_attributes(G, 'pos')

plt.figure(figsize=(15, 15))
nx.draw(G, pos, with_labels=True, node_size=500, node_color="skyblue", font_size=8, font_weight="bold", edge_color='gray')
plt.title("City Network with Edges")
plt.show()
