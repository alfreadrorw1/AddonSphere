// ===== ADDONSPHERE CONFIGURATION =====
// Edit file ini untuk mengubah semua pengaturan website

const CONFIG = {
  // Nama website
  siteName: 'AddonSphere',
  tagline: 'Minecraft Addon Hub',
  
  // Warna aksen default (hex color)
  defaultAccent: '#8b5cf6',
  
  // Admin credentials
  admin: {
    username: 'alfread',
    password: 'alfread12345'
  },
  
  // Social media links
  social: {
    whatsapp: 'https://wa.me/60136951175',
    tiktok: 'https://www.tiktok.com/@addonsphere_?_r=1&_t=ZS-96APWwkv5i0',
    instagram: 'https://www.instagram.com/eiixyy_',
    youtube: 'https://youtube.com/@alfreadx',
    discord: 'https://discord.gg/addonsphere',
    telegram: 'https://t.me/eIIyxx'
  },
  
  // Donation links
  donate: {
    saweria: 'https://saweria.co/AddonSphere',
    trakteer: 'https://trakteer.id/addonsphere'
  },
  
  // Hero video (place .mp4 file in assets folder)
  heroVideo: 'assets/hero.mp4',
  heroFallbackImage: 'assets/hero-fallback.png',
  
  // Copyright text
  copyright: '2025 AddonSphere. All rights reserved.',
  
  // Items per page for load more
  pageSize: 6,
  
  // ImgBB API key (stored in localStorage)
  imgbbStorageKey: 'ax_imgbb_key',
  
  // Likes storage key
  likesStorageKey: 'ax_likes',
  
  // Accent color storage key
  accentStorageKey: 'ax_accent',
  
  // Admin session key
  adminSessionKey: 'ax_admin'
};

export default CONFIG;