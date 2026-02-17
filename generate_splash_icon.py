from PIL import Image
import os

def create_splash_icon(source_path, size, output_path):
    # فتح صورة الويب الأصلية
    img = Image.open(source_path).convert("RGBA")
    
    # أندرويد 12 يطلب أن تكون الأيقونة داخل دائرة تشغل 2/3 من المساحة (حوالي 66%)
    # سنستخدم نسبة 60% لضمان الأمان التام وعدم القص
    safe_ratio = 0.60
    new_content_size = int(size * safe_ratio)
    
    # تصغير الشعار
    img.thumbnail((new_content_size, new_content_size), Image.Resampling.LANCZOS)
    
    # إنشاء خلفية شفافة تماماً
    splash_icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    # لصق الشعار في المنتصف
    offset = ((size - img.width) // 2, (size - img.height) // 2)
    splash_icon.paste(img, offset, img)
    
    # حفظ النتيجة
    splash_icon.save(output_path, "PNG")

if __name__ == "__main__":
    source = "/home/ubuntu/ratnzer-services/public/pwa-512x512.png"
    base_res_dir = "/home/ubuntu/ratnzer-services/android/app/src/main/res"
    
    # سنقوم بإنشاء مجلد جديد للأيقونة المصلحة لتجنب خلطها مع أيقونة التطبيق
    # سنستخدم أحجام mipmap-xxxhdpi كمثال للحجم الأكبر
    densities = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432
    }
    
    for folder, size in densities.items():
        target_dir = os.path.join(base_res_dir, folder)
        if not os.path.exists(target_dir): os.makedirs(target_dir)
        
        # إنشاء أيقونة تسمى ic_splash.png
        create_splash_icon(source, size, os.path.join(target_dir, "ic_splash.png"))

    print("Splash icons generated successfully.")
