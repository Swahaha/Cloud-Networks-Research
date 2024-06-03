import json
import networkx as nx
import matplotlib.pyplot as plt

with open('SparkleTest.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

G = nx.DiGraph()

for network in data['networks']:
    for path_id, keypoints in network['paths'].items():
        for i in range(len(keypoints) - 1):
            start = keypoints[i]
            end = keypoints[i + 1]
            start_label = start['nameCity'] if start['nameCity'] else ''
            end_label = end['nameCity'] if end['nameCity'] else ''
            G.add_node(start['id'], pos=(float(start['lng']), float(start['lat'])), label=start_label, city_name=start['nameCity'])
            G.add_node(end['id'], pos=(float(end['lng']), float(end['lat'])), label=end_label, city_name=end['nameCity'])
            G.add_edge(start['id'], end['id'], network=network['name'], color=network.get('color', 'black'))

pos = nx.get_node_attributes(G, 'pos')
labels = nx.get_node_attributes(G, 'label')
city_names = nx.get_node_attributes(G, 'city_name')

nodes_with_city_names = [node for node, name in city_names.items() if name]
nodes_without_city_names = [node for node, name in city_names.items() if not name]

plt.figure(figsize=(12, 8))

edges = G.edges(data=True)
colors = [edge[2].get('color', 'black') for edge in edges]
nx.draw_networkx_edges(G, pos, edge_color=colors)

nx.draw_networkx_nodes(G, pos, nodelist=nodes_with_city_names, node_size=100, node_color='blue')
nx.draw_networkx_labels(G, pos, labels={node: labels[node] for node in nodes_with_city_names}, font_size=8)

# nx.draw_networkx_nodes(G, pos, nodelist=nodes_without_city_names, node_size=30, node_color='red')

plt.show()
