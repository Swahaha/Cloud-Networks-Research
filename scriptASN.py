import sqlite3
import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt
from collections import defaultdict

# Connect to the SQLite database
conn = sqlite3.connect('database/database_name.db')

# Load data into DataFrames and filter for the US
asn_loc_query = "SELECT * FROM asn_loc WHERE standard_country = 'US'"
asn_asname_query = "SELECT * FROM asn_asname"
asn_conn_query = "SELECT * FROM asn_conn"
asn_loc_df = pd.read_sql_query(asn_loc_query, conn)
asn_asname_df = pd.read_sql_query(asn_asname_query, conn)
asn_conn_df = pd.read_sql_query(asn_conn_query, conn)
conn.close()

# Merge ASN location data with ASN name data
asn_data = pd.merge(asn_loc_df, asn_asname_df, on='asn')

# Create a NetworkX graph
G = nx.Graph()

# Add nodes with positions (latitude, longitude)
for idx, row in asn_data.iterrows():
    G.add_node(row['asn'], pos=(row['longitude'], row['latitude']), label=row['asn_name'])

# Add edges between ASNs, but only if both nodes exist in the graph
edge_count = defaultdict(int)

for idx, row in asn_conn_df.iterrows():
    if row['asn1'] in G.nodes and row['asn2'] in G.nodes:
        if edge_count[row['asn1']] < 3 and edge_count[row['asn2']] < 3:
            G.add_edge(row['asn1'], row['asn2'], relationship=row['relationship_type'])
            edge_count[row['asn1']] += 1
            edge_count[row['asn2']] += 1

# Get positions for drawing
pos = nx.get_node_attributes(G, 'pos')
labels = nx.get_node_attributes(G, 'label')

# Plot the graph
plt.figure(figsize=(15, 10))
nx.draw(G, pos, with_labels=False, node_size=50, node_color='blue', edge_color='gray')


plt.title("ASN Network in the US with Locations and Connections (Max 5 Edges per Node)")
plt.show()
