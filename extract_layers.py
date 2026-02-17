from PIL import Image, ImageDraw
import os

def create_demo_layers():
    size = 512
    # 1. إنشاء الخلفية (بناءً على اللون الموجود في المشروع #26A69A)
    background = Image.new("RGB", (size, size), "#26A69A")
    draw = ImageDraw.Draw(background)
    # رسم خطوط بسيطة لمحاكاة الـ Vector الموجود في أندرويد
    for i in range(0, size, 50):
        draw.line([(i, 0), (i, size)], fill="#33FFFFFF", width=1)
        draw.line([(0, i), (size, i)], fill="#33FFFFFF", width=1)
    background.save("/home/ubuntu/ratnzer-services/demo_background.png")

    # 2. استخراج الشعار المصلح (Foreground)
    # سنأخذ نسخة من الأيقونة المصلحة التي أنشأناها
    fixed_icon_path = "/home/ubuntu/ratnzer-services/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png"
    if os.path.exists(fixed_icon_path):
        foreground = Image.open(fixed_icon_path).convert("RGBA")
        foreground.save("/home/ubuntu/ratnzer-services/demo_foreground.png")
    
    print("Demo layers created.")

if __name__ == "__main__":
    create_demo_layers()
