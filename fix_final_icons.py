from PIL import Image
import os

def create_unified_icon(source_path, size, output_path, padding_percent=0.15):
    # فتح صورة الويب الأصلية (التي تظهر بشكل ممتاز)
    img = Image.open(source_path).convert("RGBA")
    
    # حساب حجم الشعار مع هوامش أمان بسيطة (15% بدلاً من 40%)
    # هذا سيجعل الشعار كبيراً وواضحاً ولكن بعيداً عن حواف القص الدائرية
    safe_size = int(size * (1 - padding_percent))
    
    # إنشاء خلفية سوداء (أو شفافة إذا كان النظام يدعمها، لكن أندرويد يفضل الخلفية الملونة)
    # سنستخدم الخلفية الأصلية من الصورة نفسها
    unified = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    
    # تصغير الصورة الأصلية لتناسب منطقة الأمان
    img.thumbnail((safe_size, safe_size), Image.Resampling.LANCZOS)
    
    # لصقها في المنتصف
    offset = ((size - img.width) // 2, (size - img.height) // 2)
    unified.paste(img, offset, img)
    
    # حفظ النتيجة
    unified.save(output_path, "PNG")

if __name__ == "__main__":
    source = "/home/ubuntu/ratnzer-services/public/pwa-512x512.png"
    base_res_dir = "/home/ubuntu/ratnzer-services/android/app/src/main/res"
    
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }
    
    # توليد الأيقونات العادية والدائرية (Legacy & Round)
    for folder, size in densities.items():
        target_dir = os.path.join(base_res_dir, folder)
        if not os.path.exists(target_dir): os.makedirs(target_dir)
        
        # 1. تحديث ic_launcher.png و ic_launcher_round.png
        create_unified_icon(source, size, os.path.join(target_dir, "ic_launcher.png"), padding_percent=0.10)
        create_unified_icon(source, size, os.path.join(target_dir, "ic_launcher_round.png"), padding_percent=0.10)
        
        # 2. تحديث ic_launcher_foreground.png (لمن لا يزال يستخدم Adaptive)
        # سنجعلها تملأ المساحة (108dp) مع هامش أمان بسيط
        fg_size = int((size / 48) * 108)
        create_unified_icon(source, fg_size, os.path.join(target_dir, "ic_launcher_foreground.png"), padding_percent=0.15)

    print("Final unified icons generated.")
