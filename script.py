import sqlite3
import pandas as pd
import folium

# Connect to the SQLite database
conn = sqlite3.connect('database/database_name.db')

# Load city_points data into a DataFrame
query = "SELECT * FROM city_points"
df = pd.read_sql_query(query, conn)
conn.close()

# Create a map centered at an average location
m = folium.Map(location=[df['city_latitude'].mean(), df['city_longitude'].mean()], zoom_start=2)

# Add points to the map
for idx, row in df.iterrows():
    folium.Marker(
        location=[row['city_latitude'], row['city_longitude']],
        popup=f"{row['city_name']}, {row['state_province']}, {row['country_code']}"
    ).add_to(m)

# Save the map to an HTML file
m.save('city_points_map.html')
