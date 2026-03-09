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
  const [aboutUsLoading, setAboutUsLoading] = useState(!aboutUsData);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const loadAboutUsData = async () => {
      // If we have cached data, don't show loading spinner (instant render)
      if (!aboutUsData) {
        setAboutUsLoading(true);
      }
      
      try {
        const res = await settingsService.getAboutUs();
        if (res?.data) {
          // Only update state if data is actually different to prevent unnecessary re-renders
          const currentCache = localCache.get('about_us', null);
          if (JSON.stringify(res.data) !== JSON.stringify(currentCache)) {
            setAboutUsData(res.data);
            localCache.set('about_us', res.data);
          }
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
    <div className="min-h-screen pb-6 bg-[#13141f] pt-0">
      {/* Header */}
      <div className="sticky top-0 left-0 right-0 z-50 bg-[#13141f]/95 backdrop-blur-md border-b border-gray-800/50 h-[65px] flex items-center justify-between px-4 mb-4">
        <div className="w-10"></div>
        <h1 className="text-xl font-bold text-white">{aboutUsData?.title || 'من نحن'}</h1>
        <button onClick={() => setView(View.PROFILE)} className="active:scale-95 transition-transform p-2 bg-[#242636] rounded-xl text-yellow-400 border border-gray-700 shadow-sm"><ArrowLeft size={22} /></button>
      </div>

      <div className="px-4 space-y-6">
        {aboutUsLoading && !aboutUsData ? (
          <div className="space-y-6 animate-pulse">
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-[#242636] rounded-2xl"></div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-[#242636] rounded w-3/4"></div>
              <div className="h-4 bg-[#242636] rounded w-full"></div>
              <div className="h-4 bg-[#242636] rounded w-5/6"></div>
            </div>
            <div className="h-20 bg-[#242636] rounded-xl"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 bg-[#242636] rounded-lg"></div>
              <div className="h-12 bg-[#242636] rounded-lg"></div>
            </div>
          </div>
        ) : aboutUsData ? (
          <div className="space-y-6">
            {/* Image */}
            {aboutUsData.imageUrl && (
              <div className="flex justify-center">
                <div className={`w-48 h-48 rounded-2xl overflow-hidden bg-[#242636] flex items-center justify-center relative ${!imageLoaded ? 'animate-pulse' : ''}`}>
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                  )}
                  <img 
                    src={aboutUsData.imageUrl} 
                    alt="About Us" 
                    className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      setImageLoaded(true);
                    }}
                  />
                </div>
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
                        <img src={aboutUsData.socialLinks.whatsappIcon} alt="WhatsApp" className="w-5 h-5 object-cover rounded-full" />
                      ) : (
                        <Smartphone size={18} />
                      )}
                      <span className="text-xs font-medium">{aboutUsData.socialLinks.whatsappLabel || 'WhatsApp'}</span>
                    </button>
                  )}
                  {aboutUsData.socialLinks.telegram && (
                    <button
                      onClick={() => openSocialLink(aboutUsData.socialLinks.telegram)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-blue-400"
                    >
                      {aboutUsData.socialLinks.telegramIcon ? (
                        <img src={aboutUsData.socialLinks.telegramIcon} alt="Telegram" className="w-5 h-5 object-cover rounded-full" />
                      ) : (
                        <Globe size={18} />
                      )}
                      <span className="text-xs font-medium">{aboutUsData.socialLinks.telegramLabel || 'Telegram'}</span>
                    </button>
                  )}
                  {aboutUsData.socialLinks.instagram && (
                    <button
                      onClick={() => openSocialLink(aboutUsData.socialLinks.instagram)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-pink-400"
                    >
                      {aboutUsData.socialLinks.instagramIcon ? (
                        <img src={aboutUsData.socialLinks.instagramIcon} alt="Instagram" className="w-5 h-5 object-cover rounded-full" />
                      ) : (
                        <Globe size={18} />
                      )}
                      <span className="text-xs font-medium">{aboutUsData.socialLinks.instagramLabel || 'Instagram'}</span>
                    </button>
                  )}
                  {aboutUsData.socialLinks.twitter && (
                    <button
                      onClick={() => openSocialLink(aboutUsData.socialLinks.twitter)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-sky-400"
                    >
                      {aboutUsData.socialLinks.twitterIcon ? (
                        <img src={aboutUsData.socialLinks.twitterIcon} alt="Twitter" className="w-5 h-5 object-cover rounded-full" />
                      ) : (
                        <Globe size={18} />
                      )}
                      <span className="text-xs font-medium">{aboutUsData.socialLinks.twitterLabel || 'Twitter'}</span>
                    </button>
                  )}
                  {aboutUsData.socialLinks.facebook && (
                    <button
                      onClick={() => openSocialLink(aboutUsData.socialLinks.facebook)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-blue-600"
                    >
                      {aboutUsData.socialLinks.facebookIcon ? (
                        <img src={aboutUsData.socialLinks.facebookIcon} alt="Facebook" className="w-5 h-5 object-cover rounded-full" />
                      ) : (
                        <Globe size={18} />
                      )}
                      <span className="text-xs font-medium">{aboutUsData.socialLinks.facebookLabel || 'Facebook'}</span>
                    </button>
                  )}
                  {aboutUsData.socialLinks.email && (
                    <button
                      onClick={() => openSocialLink(`mailto:${aboutUsData.socialLinks.email}`)}
                      className="flex items-center gap-2 p-3 bg-[#242636] hover:bg-[#2d2d40] rounded-lg transition text-gray-300"
                    >
                      {aboutUsData.socialLinks.emailIcon ? (
                        <img src={aboutUsData.socialLinks.emailIcon} alt="Email" className="w-5 h-5 object-cover rounded-full" />
                      ) : (
                        <Mail size={18} />
                      )}
                      <span className="text-xs font-medium">{aboutUsData.socialLinks.emailLabel || 'Email'}</span>
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
