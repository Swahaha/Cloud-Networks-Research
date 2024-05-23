import sqlite3
import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt

# Connect to the SQLite database
conn = sqlite3.connect('database/database_name.db')

# Load data into DataFrames
nodes_query = "SELECT * FROM phys_nodes WHERE country = 'US'"
edges_query = "SELECT * FROM phys_nodes_conn"
nodes_df = pd.read_sql_query(nodes_query, conn)
edges_df = pd.read_sql_query(edges_query, conn)
conn.close()

# Create a NetworkX graph
G = nx.Graph()

# Add nodes with positions (latitude, longitude)
for idx, row in nodes_df.iterrows():
    G.add_node(row['node_name'], pos=(row['longitude'], row['latitude']))

# Add edges between nodes, but only if both nodes exist in the graph
for idx, row in edges_df.iterrows():
    if row['from_node'] in G.nodes and row['to_node'] in G.nodes:
        G.add_edge(row['from_node'], row['to_node'])

# Draw the graph
pos = nx.get_node_attributes(G, 'pos')

plt.figure(figsize=(15, 10))
nx.draw(G, pos, with_labels=False, node_size=50, node_color='blue', font_size=8)
plt.title("Internet PoPs in the US with Network Edges")
plt.show()
