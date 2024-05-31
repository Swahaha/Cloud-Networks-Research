import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image

image_path = 'HEtest.png'
image = Image.open(image_path)

node1 = (600, 600)
node2 = (400, 400)

fig, ax = plt.subplots()
ax.imshow(image)

node1_circle = patches.Circle(node1, radius=10, edgecolor='blue', facecolor='blue')
node2_circle = patches.Circle(node2, radius=10, edgecolor='blue', facecolor='blue')
ax.add_patch(node1_circle)
ax.add_patch(node2_circle)

path_data = [
    (patches.Path.MOVETO, node1),
    (patches.Path.CURVE3, (node1[0] + 150, node1[1] - 100)),  # Important point for curve
    (patches.Path.CURVE3, node2)
]

codes, verts = zip(*path_data)
path = patches.Path(verts, codes)
patch = patches.PathPatch(path, edgecolor='red', facecolor='none', lw=2)
ax.add_patch(patch)

ax.set_xlim(0, image.width)
ax.set_ylim(image.height, 0)

ax.axis('off')

plt.show()
