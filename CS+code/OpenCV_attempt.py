import cv2
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt

# Load the image
image_path = 'HEtest.png'
image = cv2.imread(image_path)

# Convert the image to HSV color space
hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

# Define the range for red color in HSV
lower_red1 = np.array([0, 70, 50])
upper_red1 = np.array([10, 255, 255])
lower_red2 = np.array([170, 70, 50])
upper_red2 = np.array([180, 255, 255])

# Create a mask for red color
red_mask1 = cv2.inRange(hsv_image, lower_red1, upper_red1)
red_mask2 = cv2.inRange(hsv_image, lower_red2, upper_red2)
red_mask = cv2.bitwise_or(red_mask1, red_mask2)

# Find contours of the red dots
contours, _ = cv2.findContours(red_mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

# Get the center points of the red dots
nodes = []
for contour in contours:
    if cv2.contourArea(contour) > 5:  # Filter out small contours
        M = cv2.moments(contour)
        if M['m00'] != 0:
            cX = int(M['m10'] / M['m00'])
            cY = int(M['m01'] / M['m00'])
            nodes.append((cX, cY))

# Convert image to grayscale
gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

# Detect edges using Canny edge detector
edges = cv2.Canny(gray_image, 50, 150, apertureSize=3)

# Detect lines using Hough Line Transform
lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=30, minLineLength=30, maxLineGap=20)

# Helper function to find nearest node
def find_nearest_node(point, nodes, tolerance=10):
    for node in nodes:
        if abs(point[0] - node[0]) < tolerance and abs(point[1] - node[1]) < tolerance:
            return node
    return None

# Find edges connecting the nodes
edges_list = []
if lines is not None:
    for line in lines:
        x1, y1, x2, y2 = line[0]
        node1 = find_nearest_node((x1, y1), nodes)
        node2 = find_nearest_node((x2, y2), nodes)
        if node1 and node2 and node1 != node2:
            edges_list.append((node1, node2))

# Create a graph
G = nx.Graph()

# Add nodes
for node in nodes:
    G.add_node(node)

# Add edges
for edge in edges_list:
    G.add_edge(edge[0], edge[1])

# Draw the graph
pos = {node: node for node in G.nodes()}
nx.draw(G, pos, with_labels=False, node_size=50, node_color='red', edge_color='blue')
plt.show()
