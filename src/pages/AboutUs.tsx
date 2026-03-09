import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Globe, Smartphone, Mail } from 'lucide-react';
import { View } from '../types';
import { settingsService } from '../services/api';
import { localCache } from '../services/localCache';

interface Props {
  setView: (view: View) => void;
}

const AboutUs: React.FC<Props> = ({ setView }) => {
  const [aboutUsData, setAboutUsData] = useState<any>(() => localCache.get('about_us', null));
  const [aboutUsLoading, setAboutUsLoading] = useState(false);

  useEffect(() => {
    const loadAboutUsData = async () => {
      setAboutUsLoading(true);
      try {
        const res = await settingsService.getAboutUs();
        if (res?.data) {
          setAboutUsData(res.data);
          localCache.set('about_us', res.data);
        }
      } catch (error) {
        console.warn('Failed to load About Us data', error);
        if (!aboutUsData) {
          setAboutUsData({
            title: 'من نحن',
            description: 'معلومات عن الشركة',
            address: '',
            imageUrl: '',
            socialLinks: {}
          });
        }
      } finally {
        setAboutUsLoading(false);
      }
    };

    loadAboutUsData();
  }, []);

  const openSocialLink = (url: string) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen pb-24 bg-[#13141f] pt-0">
      {/* Header */}
      <div className="sticky top-0 left-0 right-0 z-50 bg-[#13141f]/95 backdrop-blur-md border-b border-gray-800/50 h-[65px] flex items-center justify-between px-4 mb-4">
        <div className="w-10"></div>
        <h1 className="text-xl font-bold text-white">{aboutUsData?.title || 'من نحن'}</h1>
        <button onClick={() => setView(View.HOME)} className="active:scale-95 transition-transform p-2 bg-[#242636] rounded-xl text-yellow-400 border border-gray-700 shadow-sm"><ArrowLeft size={22} /></button>
      </div>

      <div className="px-4 space-y-6">
        {aboutUsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-400">جاري التحميل...</div>
          </div>
        ) : aboutUsData ? (
          <div className="space-y-6">
            {/* Image */}
            {aboutUsData.imageUrl && (
              <div className="w-full h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <img 
                  src={aboutUsData.imageUrl} 
                  alt="About Us" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Description */}
            {aboutUsData.description && (
              <div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {aboutUsData.description}
                </p>
              </div>
            )}
            
            {/* Address */}
            {aboutUsData.address && (
              <div className="flex items-start gap-3 p-4 bg-[#242636] rounded-xl">
                <MapPin size={20} className="text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-400 text-xs mb-1">العنوان</p>
                  <p className="text-gray-200 text-sm">{aboutUsData.address}</p>
                </div>
              </div>
            )}
            
            {/* Social Links */}
            {aboutUsData.socialLinks && Object.keys(aboutUsData.socialLinks).length > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-3 font-semibold">تواصل معنا</p>
                <div className="grid grid-cols-2 gap-3">
                  {aboutUsData.socialLinks.whatsapp && (
                    <button
                      onClick={() => openSocialLink(aboutUsData.socialLinks.whatsapp)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-green-400"
                    >
                      {aboutUsData.socialLinks.whatsappIcon ? (
                        <img src={aboutUsData.socialLinks.whatsappIcon} alt="WhatsApp" className="w-5 h-5 object-contain" />
                      ) : (
                        <Smartphone size={18} />
                      )}
                      <span className="text-xs font-medium">WhatsApp</span>
                    </button>
                  )}
                  {aboutUsData.socialLinks.telegram && (
                    <button
                      onClick={() => openSocialLink(aboutUsData.socialLinks.telegram)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-blue-400"
                    >
                      {aboutUsData.socialLinks.telegramIcon ? (
                        <img src={aboutUsData.socialLinks.telegramIcon} alt="Telegram" className="w-5 h-5 object-contain" />
                      ) : (
                        <Globe size={18} />
                      )}
                      <span className="text-xs font-medium">Telegram</span>
                    </button>
                  )}
                  {aboutUsData.socialLinks.instagram && (
                    <button
                      onClick={() => openSocialLink(aboutUsData.socialLinks.instagram)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-pink-400"
                    >
                      {aboutUsData.socialLinks.instagramIcon ? (
                        <img src={aboutUsData.socialLinks.instagramIcon} alt="Instagram" className="w-5 h-5 object-contain" />
                      ) : (
                        <Globe size={18} />
                      )}
                      <span className="text-xs font-medium">Instagram</span>
                    </button>
                  )}
                  {aboutUsData.socialLinks.twitter && (
                    <button
                      onClick={() => openSocialLink(aboutUsData.socialLinks.twitter)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-sky-400"
                    >
                      {aboutUsData.socialLinks.twitterIcon ? (
                        <img src={aboutUsData.socialLinks.twitterIcon} alt="Twitter" className="w-5 h-5 object-contain" />
                      ) : (
                        <Globe size={18} />
                      )}
                      <span className="text-xs font-medium">Twitter</span>
                    </button>
                  )}
                  {aboutUsData.socialLinks.facebook && (
                    <button
                      onClick={() => openSocialLink(aboutUsData.socialLinks.facebook)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-blue-600"
                    >
                      {aboutUsData.socialLinks.facebookIcon ? (
                        <img src={aboutUsData.socialLinks.facebookIcon} alt="Facebook" className="w-5 h-5 object-contain" />
                      ) : (
                        <Globe size={18} />
                      )}
                      <span className="text-xs font-medium">Facebook</span>
                    </button>
                  )}
                  {aboutUsData.socialLinks.email && (
                    <button
                      onClick={() => openSocialLink(`mailto:${aboutUsData.socialLinks.email}`)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-gray-300"
                    >
                      {aboutUsData.socialLinks.emailIcon ? (
                        <img src={aboutUsData.socialLinks.emailIcon} alt="Email" className="w-5 h-5 object-contain" />
                      ) : (
                        <Mail size={18} />
                      )}
                      <span className="text-xs font-medium">Email</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-400 text-center">
              <p>لم يتم تعيين معلومات "من نحن" حتى الآن</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AboutUs;
