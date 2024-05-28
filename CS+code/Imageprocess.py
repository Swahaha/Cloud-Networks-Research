from PIL import Image
import numpy as np
import matplotlib.pyplot as plt

image_path = 'HEtest.png'
image = Image.open(image_path)
image_array = np.array(image)

red_thresh = 50
blue_thresh = 100

nodes_mask = (image_array[:, :, 0] < blue_thresh) | (image_array[:, :, 2] < red_thresh)

output_image = np.zeros_like(image_array)
output_image[nodes_mask] = image_array[nodes_mask]

plt.figure(figsize=(10, 5))
plt.imshow(output_image)
plt.axis('off')
plt.show()

output_path = 'processedHEtest.png'
output_image_pil = Image.fromarray(output_image)
output_image_pil.save(output_path)
