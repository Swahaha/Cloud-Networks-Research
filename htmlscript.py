import sqlite3
import pandas as pd
import networkx as nx
import folium

conn = sqlite3.connect('database/database_name.db')

asn_loc_query = "SELECT * FROM asn_loc"
asn_asname_query = "SELECT * FROM asn_asname"
asn_conn_query = "SELECT * FROM asn_conn"
asn_loc_df = pd.read_sql_query(asn_loc_query, conn)
asn_asname_df = pd.read_sql_query(asn_asname_query, conn)
asn_conn_df = pd.read_sql_query(asn_conn_query, conn)
conn.close()

asn_data = pd.merge(asn_loc_df, asn_asname_df, on='asn')

G = nx.Graph()

for idx, row in asn_data.iterrows():
    G.add_node(row['asn'], pos=(row['latitude'], row['longitude']), label=row['asn_name'])

for idx, row in asn_conn_df.iterrows():
    if row['asn1'] in G.nodes and row['asn2'] in G.nodes:
        G.add_edge(row['asn1'], row['asn2'], relationship=row['relationship_type'])

pos = nx.get_node_attributes(G, 'pos')
m = folium.Map(location=[0, 0], zoom_start=2)

for node, (lat, lon) in pos.items():
    folium.Marker(location=[lat, lon], popup=f"ASN: {node}\nName: {G.nodes[node]['label']}").add_to(m)

for edge in G.edges:
    asn1, asn2 = edge
    lat1, lon1 = pos[asn1]
    lat2, lon2 = pos[asn2]
    folium.PolyLine(locations=[(lat1, lon1), (lat2, lon2)], color='blue').add_to(m)

m.save('asn_network_map.html')
