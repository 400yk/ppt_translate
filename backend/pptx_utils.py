from pptx.util import Pt
from PIL import ImageFont, ImageDraw, Image
from config import MIN_FONT_SIZE

def measure_text_bbox(text, font_name, font_size):
    """Measure the bounding box (width, height) of the rendered text using Pillow."""
    try:
        font = ImageFont.truetype(font_name, font_size)
    except OSError:
        font = ImageFont.load_default()
    # Use a large enough image to avoid cropping
    dummy_img = Image.new('RGB', (2000, 2000))
    draw = ImageDraw.Draw(dummy_img)
    bbox = draw.multiline_textbbox((0, 0), text, font=font)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    return width, height

def fit_font_size_to_bbox(target_width, target_height, text, font_name, max_font_size, min_font_size=MIN_FONT_SIZE):
    """Find the font size for translated text so its bounding box matches the original as close as possible."""
    # Use binary search for efficiency
    best_size = min_font_size
    low, high = min_font_size, max_font_size
    best_diff = float('inf')
    while low <= high:
        mid = (low + high) // 2
        w, h = measure_text_bbox(text, font_name, mid)
        diff = abs(w - target_width) + abs(h - target_height)
        if diff < best_diff:
            best_diff = diff
            best_size = mid
        # Try to match both width and height, prioritize not exceeding original
        if w > target_width or h > target_height:
            high = mid - 1
        else:
            low = mid + 1
    return best_size
