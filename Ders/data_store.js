// =======================================================
// data_store.js: MERKEZİ VERİ DEPOSU VE KALICI HAFIZA (GÜVENLİK GÜNCELLEMESİ)
// =======================================================

// ----------------------------------------------------
// 1. GÜVENLİK VE OTURUM VERİLERİ
// ----------------------------------------------------

// Eğer yeni sekmeye admin panelden geçiş yapılmışsa kısa süreli transfer anahtarlarını kontrol et
(function handleSessionTransfer() {
    try {
        const hasSessionUser = !!sessionStorage.getItem('CURRENT_USER_NAME');
        const hasSessionRole = !!sessionStorage.getItem('CURRENT_USER_ROLE');
        const transferUser = localStorage.getItem('TRANSFER_SESSION_USER');
        const transferRole = localStorage.getItem('TRANSFER_SESSION_ROLE');
        const transferTs = parseInt(localStorage.getItem('TRANSFER_SESSION_TS') || '0', 10);

        // Transfer varsa ve 15 saniyeden eski değilse sessionStorage'a kopyala ve temizle
        if ((!hasSessionUser || !hasSessionRole) && transferUser && transferRole && (Date.now() - transferTs < 15000)) {
            sessionStorage.setItem('CURRENT_USER_NAME', transferUser);
            sessionStorage.setItem('CURRENT_USER_ROLE', transferRole);
            localStorage.removeItem('TRANSFER_SESSION_USER');
            localStorage.removeItem('TRANSFER_SESSION_ROLE');
            localStorage.removeItem('TRANSFER_SESSION_TS');
        }
    } catch (e) {
        // Hata varsa sessizce devam et (tarayıcı izinleri gibi nedenlerle hata olabilir)
        console.error('Session transfer hatası:', e);
    }
})();

// KRİTİK DÜZELTME: Bu değişkenler global scope'ta window. ile tanımlanmalıdır.
window.CURRENT_USER_ROLE = sessionStorage.getItem('CURRENT_USER_ROLE');
window.CURRENT_USER_NAME = sessionStorage.getItem('CURRENT_USER_NAME');

window.ROLE_NAMES = {
    'super_admin': 'Baş Yönetici',
    'admin': 'Yönetici',
    'moderator': 'Moderatör', 
    'manager': 'Manager (Sorumlu)',     
    'expert': 'Uzman (Sorumlu)',        
    'member': 'Kullanıcı'
};

window.ROLE_LEVELS = {
    'super_admin': 1,
    'admin': 2,
    'moderator': 3,
    'manager': 4,
    'expert': 5,
    'member': 6
};

window.ACCESS_MATRIX = {
    'dashboard-page': ['super_admin', 'admin', 'moderator', 'manager', 'expert'], 
    'users-page': ['super_admin', 'admin', 'moderator', 'manager'],
    'posts-page': ['super_admin', 'admin', 'manager', 'expert', 'moderator'], 
    'moderation-page': ['super_admin', 'admin', 'moderator', 'manager'], 
    'logs-page': ['super_admin', 'admin', 'moderator'], 
    'team-chat-page': ['super_admin', 'admin', 'moderator', 'manager', 'expert'],
    'settings-page': ['super_admin', 'admin', 'moderator', 'manager', 'expert'],
    'achievements-page': ['super_admin', 'admin', 'moderator', 'manager'],
    'blacklist-page': ['super_admin', 'admin', 'moderator'],
};

window.NOTIFICATION_KEYS = {
    'users-page': 'UNREAD_PENDING_USERS',
    'posts-page': 'UNREAD_PENDING_POSTS',
    'team-chat-page': 'UNREAD_CHAT_MESSAGES',
    'moderation-page': 'UNRESOLVED_REPORTS',
};

// ----------------------------------------------------
// 2. KELİME FİLTRESİ (KARALİSTE)
// ----------------------------------------------------

const defaultBlacklist = [
    "amk",
    "sik",
    "orospu",
    "oç",
    "piç",
    "gavat",
    "pezevenk",
    "ananı", 
];

let BLACKLISTED_WORDS_TEMP = JSON.parse(localStorage.getItem('BLACKLISTED_WORDS')) || defaultBlacklist;
window.BLACKLISTED_WORDS = BLACKLISTED_WORDS_TEMP; // Global olarak erişilebilir yapıldı.


if (localStorage.getItem('BLACKLISTED_WORDS') === null) {
    localStorage.setItem('BLACKLISTED_WORDS', JSON.stringify(window.BLACKLISTED_WORDS));
}

// ----------------------------------------------------
// 3. KULLANICI VERİLERİ
// ----------------------------------------------------

const defaultUsers = [
    { 
        id: 1, name: "Baş Yöneticim", full_name: "Baş Yöneticim", email: "super@mail.com", password: "123", role: "super_admin", status: "active", ban_reason: "",
        bio: "Platformun kurucusu ve yöneticisi.", followers: [2, 6], following: [2, 6], isPrivate: false, 
        profileImage: "https://via.placeholder.com/150/000000/FFFFFF?text=BY", 
        badges: { black: true, blue: true, red: false, tech: true, vip: false }, 
        activityLogs: { "Pazartesi": 3, "Salı": 2, "Çarşamba": 1, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
        achievements: { 
            posts: { level: 3, timestamp: Date.now(), name: 'Gözde Yazar', badge: 'gold_post', manual: false },
            followers: { level: 2, timestamp: Date.now(), name: 'Popüler', badge: 'silver_follower', manual: false }
        },
        displayedAchievements: ['gold_post', 'silver_follower'],
        pendingFollowers: [],
        warnings: [],
        // YENİ EKLENTİ: Simüle Edilmiş Güvenlik Logları
        securityLogs: [
            { timestamp: Date.now() - 86400000, ip: "85.105.112.5", location: "İstanbul, Türkiye", success: true, notes: "Oturum Açıldı" },
            { timestamp: Date.now() - 3600000, ip: "10.0.0.1", location: "Ankara, Türkiye (VPN)", success: true, notes: "Başarılı Oturum Açma" },
            { timestamp: Date.now() - 10000, ip: "192.168.1.100", location: "Yerel Ağ", success: true, notes: "Aktif Oturum" },
        ]
    },
    { 
        id: 2, name: "Yönetici Ali", full_name: "Ali Yılmaz", email: "admin@mail.com", password: "123", role: "admin", status: "active", ban_reason: "", 
        bio: "Sistem yöneticisi.", followers: [1], following: [1], isPrivate: false, 
        profileImage: "https://via.placeholder.com/150/0000FF/FFFFFF?text=A", 
        badges: { black: true, blue: true, red: false, tech: false, vip: false }, 
        activityLogs: { "Pazartesi": 1, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
        achievements: {},
        displayedAchievements: [],
        pendingFollowers: [],
        warnings: [],
        securityLogs: [
            { timestamp: Date.now() - 7200000, ip: "105.20.30.45", location: "İzmir, Türkiye", success: true, notes: "Oturum Açıldı" },
            { timestamp: Date.now() - 300000, ip: "105.20.30.45", location: "İzmir, Türkiye", success: false, notes: "Şifre Yanlış" },
        ]
    },
    { 
        id: 3, name: "Moderatör Zeynep", full_name: "Zeynep Demir", email: "mod@mail.com", password: "123", role: "moderator", status: "active", ban_reason: "", 
        bio: "İçerik denetimi.", followers: [4], following: [4], isPrivate: false, 
        profileImage: "https://via.placeholder.com/150/FF00FF/FFFFFF?text=Z", 
        badges: { black: false, blue: false, red: true, tech: false, vip: false }, 
        activityLogs: { "Pazartesi": 5, "Salı": 1, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
        achievements: {},
        displayedAchievements: [],
        pendingFollowers: [],
        warnings: [],
        securityLogs: [
            { timestamp: Date.now() - 5400000, ip: "178.23.56.12", location: "Moskova, Rusya", success: true, notes: "Başarılı Giriş" },
        ]
    },
    { 
        id: 4, name: "Manager Mehmet", full_name: "Mehmet Kara", email: "manager@mail.com", password: "123", role: "manager", status: "active", ban_reason: "", 
        bio: "Ekip yönetimi.", followers: [3], following: [3], isPrivate: false, 
        profileImage: "https://via.placeholder.com/150/008080/FFFFFF?text=M", 
        badges: { black: false, blue: false, red: false, tech: false, vip: false }, 
        activityLogs: { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
        achievements: {},
        displayedAchievements: [],
        pendingFollowers: [],
        warnings: [],
        securityLogs: []
    },
    { 
        id: 5, name: "Uzman Elif", full_name: "Elif Aydın", email: "expert@mail.com", password: "123", role: "expert", status: "active", ban_reason: "", 
        bio: "Teknik konularda uzman.", followers: [], following: [], isPrivate: false, 
        profileImage: "https://via.placeholder.com/150/FFA500/FFFFFF?text=E", 
        badges: { black: false, blue: false, red: false, tech: true, vip: false }, 
        activityLogs: { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
        achievements: {},
        displayedAchievements: [],
        pendingFollowers: [],
        warnings: [],
        securityLogs: []
    },
    { 
        id: 6, name: "Kullanıcı Can", full_name: "Can Kaya", email: "user@mail.com", password: "123", role: "member", status: "active", ban_reason: "",
        bio: "Merhaba, buraya yeni katıldım!", followers: [1], following: [1], isPrivate: false, 
        profileImage: "https://via.placeholder.com/150/007bff/FFFFFF?text=C", 
        badges: { black: false, blue: false, red: false, tech: false, vip: false }, 
        activityLogs: { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
        achievements: { 
            posts: { level: 2, timestamp: Date.now(), name: 'Sık Paylaşan', badge: 'silver_post', manual: false },
        },
        displayedAchievements: ['silver_post'],
        pendingFollowers: [],
        warnings: [],
        securityLogs: [
            { timestamp: Date.now() - 900000, ip: "94.45.10.2", location: "İzmir, Türkiye", success: true, notes: "Başarılı Giriş" },
        ]
    },
    { 
        id: 7, name: "Gizli Gizem", full_name: "Gizem Acar", email: "gizem@mail.com", password: "123", role: "member", status: "active", ban_reason: "",
        bio: "Gizemli bir hesap.", followers: [], following: [], isPrivate: true, 
        profileImage: "https://via.placeholder.com/150/808080/FFFFFF?text=G", 
        badges: { black: false, blue: false, red: false, tech: false, vip: false }, 
        activityLogs: { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
        achievements: {},
        displayedAchievements: [],
        pendingFollowers: [],
        warnings: [],
        securityLogs: []
    },
    { 
        id: 8, name: "Banlı Birey", full_name: "Birey Örnek", email: "banli@mail.com", password: "123", role: "member", status: "banned", ban_reason: "Deneme yasağı",
        bio: "Yasaklanmış hesap.", followers: [], following: [], isPrivate: false, 
        profileImage: "https://via.placeholder.com/150/FF0000/FFFFFF?text=B", 
        badges: { black: false, blue: false, red: false, tech: false, vip: false }, 
        activityLogs: { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
        achievements: {},
        displayedAchievements: [],
        pendingFollowers: [],
        warnings: [],
        securityLogs: [
             { timestamp: Date.now() - 3600000, ip: "203.0.113.1", location: "Viyana, Avusturya", success: true, notes: "Başarılı Giriş" },
             { timestamp: Date.now() - 1800000, ip: "203.0.113.1", location: "Viyana, Avusturya", success: false, notes: "Şifre Yanlış" },
        ]
    },
    { 
        id: 9, name: "Dogukan", full_name: "Dogukan Boyacı", email: "dogukanboyaci@mail.com", password: "123", role: "member", status: "active", ban_reason: "",
        bio: "Kullanıcı Dogukan", followers: [1], following: [1], isPrivate: false, 
        profileImage: "https://via.placeholder.com/150/3545FF/FFFFFF?text=D", 
        badges: { black: false, blue: false, red: false, tech: false, vip: false }, 
        activityLogs: { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
        achievements: {},
        displayedAchievements: [],
        pendingFollowers: [],
        warnings: [],
        securityLogs: [
            { timestamp: Date.now() - 1800000, ip: "172.16.0.1", location: "Yerel Ağ", success: true, notes: "Başarılı Giriş" },
        ]
    },
    { 
        id: 10, name: "mehmet", full_name: "mehmet", email: "mehmet@mail.com", password: "123", role: "member", status: "active", ban_reason: "",
        bio: "Kullanıcı mehmet", followers: [1], following: [1], isPrivate: false, 
        profileImage: "https://via.placeholder.com/150/FFC107/FFFFFF?text=M", 
        badges: { black: false, blue: false, red: false, tech: false, vip: false }, 
        activityLogs: { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
        achievements: {},
        displayedAchievements: [],
        pendingFollowers: [],
        warnings: [],
        securityLogs: [
            { timestamp: Date.now() - 900000, ip: "88.75.12.9", location: "Berlin, Almanya", success: true, notes: "Başarılı Giriş" },
            { timestamp: Date.now() - 5000, ip: "88.75.12.9", location: "Berlin, Almanya", success: false, notes: "Başarısız Şifre" },
        ]
    },
];

// KRİTİK VERİ YÜKLEME VE TANIMLAMA
let users_temp = JSON.parse(localStorage.getItem('USERS_DATA')) || defaultUsers;
window.users = users_temp; // Global olarak erişilebilir yapıldı.

if (localStorage.getItem('USERS_DATA') === null) {
    localStorage.setItem('USERS_DATA', JSON.stringify(window.users));
}

// Eksik alanları tamamlama döngüsü (Eski verilerin düzgün çalışması için)
window.users.forEach(u => {
    if (!u.bio) u.bio = "";
    if (!u.followers) u.followers = [];
    if (!u.following) u.following = [];
    if (!u.isPrivate) u.isPrivate = false;
    // KRİTİK: Eğer profil resmi hatalı/eksikse, güvenli bir varsayılan değere ayarla
    if (!u.profileImage || u.profileImage.includes('via.placeholder.com') && !u.profileImage.includes('?text=')) {
        u.profileImage = "https://via.placeholder.com/150/007bff/FFFFFF?text=U"; // Güvenli placeholder
    }
    if (!u.badges) u.badges = { black: false, blue: false, red: false, tech: false, vip: false };
    if (!u.full_name) u.full_name = u.name; 
    if (!u.activityLogs) u.activityLogs = { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 };
    if (!u.lastLogReset) u.lastLogReset = Date.now();
    if (!u.achievements) u.achievements = {};
    if (!u.displayedAchievements) u.displayedAchievements = [];
    if (!u.pendingFollowers) u.pendingFollowers = [];
    if (!u.warnings) u.warnings = []; // YENİ EKLENTİ BAŞLANGIÇ DEĞERİ
    if (!u.securityLogs) u.securityLogs = []; // YENİ EKLENTİ BAŞLANGIÇ DEĞERİ
});

sessionStorage.setItem('USERS_DATA_JSON', JSON.stringify(window.users));

// ----------------------------------------------------
// 4. İÇERİK VERİLERİ (POSTS, STORIES)
// ----------------------------------------------------

let posts_temp = JSON.parse(localStorage.getItem('POSTS_DATA')) || [
    { id: 101, user: 'Baş Yöneticim', content: 'Sosyal medya uygulamamızın yeni admin paneli yayında! 🎉 #admin #update', likes: 5, likedBy: [2, 3, 4, 5, 6], comments: 2, commentsData: [{ userName: 'Yönetici Ali', text: 'Harika olmuş!', timestamp: Date.now() - 60000 }], status: 'active', timestamp: Date.now() - 3600000, mediaUrl: 'https://via.placeholder.com/600x400/0d6efd/FFFFFF?text=Admin+Panel' },
    { id: 102, user: 'Kullanıcı Can', content: 'İlk gönderim! Merhaba SocialBook!', likes: 1, likedBy: [1], comments: 0, commentsData: [], status: 'active', timestamp: Date.now() - 7200000, mediaUrl: null },
    { id: 103, user: 'Uzman Elif', content: 'Yeni yazılım geliştirmeleri hakkında bir makale paylaştım.', likes: 0, likedBy: [], comments: 0, commentsData: [], status: 'pending', timestamp: Date.now() - 100000 },
];
window.posts = posts_temp; // Global olarak erişilebilir yapıldı.

window.stories = JSON.parse(localStorage.getItem('STORIES_DATA')) || [
    { id: 201, user: 'Baş Yöneticim', content: 'Bugün harika bir manzara yakaladım!', imageUrl: 'https://via.placeholder.com/110x180/ff4500/ffffff?text=Baş+Admin', likes: 5, seen: false, timestamp: Date.now() - 3600000 },
];

// ----------------------------------------------------
// 5. ŞİKAYET VE LOG VERİLERİ
// ----------------------------------------------------

let reports_temp = JSON.parse(localStorage.getItem('DETAILED_REPORTS')) || [
    { reportId: 1, type: 'post_complaint', targetId: 103, targetName: 'Uzman Elif', reportedBy: 'Yönetici Ali', contentPreview: 'Yeni yazılım geliştirmeleri...', reason: 'Çift paylaşıldı.', isResolved: false, timestamp: Date.now() - 3600000 },
    { reportId: 2, type: 'user_complaint', targetId: 8, targetName: 'Banlı Birey', reportedBy: 'Moderatör Zeynep', contentPreview: 'Hesap kural ihlali yapıyor.', reason: 'Ağır küfür.', isResolved: false, timestamp: Date.now() - 86400000 },
];
window.reports = reports_temp; // Global olarak erişilebilir yapıldı.

let moderationLogs_temp = JSON.parse(localStorage.getItem('MODERATION_LOGS')) || [
    `[SİSTEM] ${new Date().toLocaleDateString()} itibarıyla loglama sistemi başlatıldı.`,
];
window.moderationLogs = moderationLogs_temp; // Global olarak erişilebilir yapıldı.

// ----------------------------------------------------
// 6. SOHBET VE MESAJLAŞMA SİSTEMİ
// ----------------------------------------------------

let chatMessages_temp = JSON.parse(localStorage.getItem('TEAM_CHAT_MESSAGES')) || [];
window.chatMessages = chatMessages_temp; // Global olarak erişilebilir yapıldı.

let privateMessages_temp = JSON.parse(localStorage.getItem('PRIVATE_MESSAGES')) || [];
window.privateMessages = privateMessages_temp; // Global olarak erişilebilir yapıldı.


// ----------------------------------------------------
// 7. VERİ KAYDETME FONKSİYONLARI (GLOBAL ERİŞİM İÇİN)
// ----------------------------------------------------

window.saveUserData = function() {
    localStorage.setItem('USERS_DATA', JSON.stringify(window.users));
    sessionStorage.setItem('USERS_DATA_JSON', JSON.stringify(window.users)); 
}

window.loadUsersData = function() {
    const storedUsers = localStorage.getItem('USERS_DATA');
    if (storedUsers) {
        window.users = JSON.parse(storedUsers);
        sessionStorage.setItem('USERS_DATA_JSON', JSON.stringify(window.users));
    } else {
        window.users = defaultUsers;
        localStorage.setItem('USERS_DATA', JSON.stringify(window.users));
    }
}

// KRİTİK YENİ FONKSİYON: Kara liste kelimelerini kaydeder
window.saveBlacklistedWords = function() {
    localStorage.setItem('BLACKLISTED_WORDS', JSON.stringify(window.BLACKLISTED_WORDS));
}

window.loadBlacklistedWords = function() {
    const storedWords = localStorage.getItem('BLACKLISTED_WORDS');
    if (storedWords) {
        window.BLACKLISTED_WORDS = JSON.parse(storedWords);
    } else {
        window.BLACKLISTED_WORDS = defaultBlacklist;
        localStorage.setItem('BLACKLISTED_WORDS', JSON.stringify(window.BLACKLISTED_WORDS));
    }
}

window.savePostData = function() { localStorage.setItem('POSTS_DATA', JSON.stringify(window.posts)); }
window.saveStoryData = function() { localStorage.setItem('STORIES_DATA', JSON.stringify(window.stories)); }
window.saveReportData = function() { localStorage.setItem('DETAILED_REPORTS', JSON.stringify(window.reports)); }
window.saveModerationLogs = function() { localStorage.setItem('MODERATION_LOGS', JSON.stringify(window.moderationLogs)); }
window.saveChatData = function() { localStorage.setItem('TEAM_CHAT_MESSAGES', JSON.stringify(window.chatMessages)); }
window.savePrivateMessages = function() { localStorage.setItem('PRIVATE_MESSAGES', JSON.stringify(window.privateMessages)); }

window.refreshAllData = function() {
    // Bu fonksiyon, Admin Panel'e girildiğinde tüm global dizileri güncel tutar
    window.users = JSON.parse(localStorage.getItem('USERS_DATA')) || defaultUsers;
    window.posts = JSON.parse(localStorage.getItem('POSTS_DATA')) || window.posts;
    window.reports = JSON.parse(localStorage.getItem('DETAILED_REPORTS')) || window.reports;
    window.moderationLogs = JSON.parse(localStorage.getItem('MODERATION_LOGS')) || window.moderationLogs;
    window.chatMessages = JSON.parse(localStorage.getItem('TEAM_CHAT_MESSAGES')) || window.chatMessages;
    window.privateMessages = JSON.parse(localStorage.getItem('PRIVATE_MESSAGES')) || window.privateMessages;
    window.stories = JSON.parse(localStorage.getItem('STORIES_DATA')) || window.stories;
    window.loadBlacklistedWords(); // Kara listeyi de yenile

    // SessionStorage'daki kullanıcı bilgilerini de yenile
    window.CURRENT_USER_ROLE = sessionStorage.getItem('CURRENT_USER_ROLE');
    window.CURRENT_USER_NAME = sessionStorage.getItem('CURRENT_USER_NAME');
}