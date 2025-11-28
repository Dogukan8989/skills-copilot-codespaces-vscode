// =======================================================
// user_achievements.js: KULLANICI BAŞARI HESAPLAMA VE RENDER
// =======================================================

/**
 * Kullanıcı aksiyonları sonrası başarıları kontrol eder ve günceller.
 * @param {object} user - Güncellenecek kullanıcı objesi.
 * @param {string} type - Güncellenen aktivite türü ('post', 'following', 'followers').
 * @returns {boolean} Başarı güncellendiyse true.
 */
function checkAchievements(user, type) {
    if (!user.achievements) user.achievements = {};
    let achievementUpdated = false;

    const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === type);
    if (!def) return false;

    // Eğer başarı manuel olarak atanmışsa ve seviyesi mevcut seviyeden düşükse
    // otomatik kontrolü atla (Manuel atanan seviyenin üstüne çıkana kadar).
    if (user.achievements[type] && user.achievements[type].manual) {
        // Otomatik hesaplanan seviye manuel seviyenin üstündeyse, manuel bayrağı kaldır ve güncelle.
        let currentCount = 0;
        if (type === 'posts') {
            currentCount = posts.filter(p => p.user === user.name).length;
        } else if (type === 'following') {
            currentCount = user.following ? user.following.length : 0;
        } else if (type === 'followers') {
            currentCount = user.followers ? user.followers.length : 0;
        }
        
        const manualLevel = user.achievements[type].level;
        const manualThreshold = def.levels[manualLevel - 1].threshold;
        
        if (currentCount < manualThreshold) {
            // Eğer sayım manuel eşiğin altındaysa, manuel kalsın.
            return false;
        }
        // Eğer sayım manuel eşiğin üstüne çıktıysa, normal kontrol devam etsin
        // ve manuel bayrağı sonraki adımda kaldırılacaktır.
    }
    
    let currentCount = 0;
    if (type === 'posts') {
        currentCount = posts.filter(p => p.user === user.name).length;
    } else if (type === 'following') {
        currentCount = user.following ? user.following.length : 0;
    } else if (type === 'followers') {
        currentCount = user.followers ? user.followers.length : 0;
    }
    
    const currentLevel = user.achievements[type]?.level || 0;
    let newLevel = currentLevel;

    // Yüksek seviyeden başlayarak kontrol et
    for (let i = def.levels.length - 1; i >= 0; i--) {
        const levelDef = def.levels[i];
        if (currentCount >= levelDef.threshold) {
            newLevel = i + 1;
            break;
        }
    }
    
    if (newLevel > currentLevel) {
        const achievedLevelDef = def.levels[newLevel - 1];
        
        user.achievements[type] = {
            level: newLevel,
            timestamp: Date.now(),
            name: achievedLevelDef.name,
            badge: achievedLevelDef.badge,
            manual: false // Otomatik kazanıldı, manuel durumu sıfırlandı
        };
        
        // Loglama
        moderationLogs.push(`[BAŞARI KAZANILDI] ${user.name} kullanıcısı "${def.name}" - ${achievedLevelDef.name} başarısını kazandı.`);
        
        achievementUpdated = true;
    }

    if (achievementUpdated) {
        // Otomatik güncellenen logları Admin panele gönder
        if (window.renderModerationLogs) window.renderModerationLogs();
    }

    return achievementUpdated;
}

/**
 * Başarı rozeti için görsel HTML'i döndürür.
 * @param {string} badgeId achievement_data.js'teki badge ID'si
 * @returns {string} Font Awesome ikonu içeren HTML
 */
function getAchievementBadgeIcon(badgeId) {
    // Tüm tanımları tarayarak badgeId'ye karşılık gelen ikon ve rengi bul
    for (const def of ACHIEVEMENT_DEFINITIONS) {
        for (const level of def.levels) {
            if (level.badge === badgeId) {
                // Tooltip için renkli ikonu döndür
                return `<i class="${level.icon} me-1" style="color: ${level.color};" title="${def.name}: ${level.name}"></i>`;
            }
        }
    }
    return ''; // Bulunamazsa boş döndür
}

/**
 * Kullanıcının sergilemek istediği başarıları görselleştirir.
 * @param {object} user - Başarıları görüntülenecek kullanıcı objesi
 * @param {number} maxToDisplay - Maksimum kaç başarı sergileneceği
 * @returns {string} HTML içeriği
 */
function renderDisplayedAchievements(user, maxToDisplay = 3) {
    const achievedBadges = [];
    
    if (!user.achievements || !user.displayedAchievements) return '';
    
    // Kullanıcının sergilemeyi seçtiği başarıları al
    user.displayedAchievements.forEach(badgeId => {
        
        // Bu badge'e karşılık gelen achievement type'ı bul
        const achievementType = ACHIEVEMENT_DEFINITIONS.find(d => 
            d.levels.some(l => l.badge === badgeId)
        )?.id;
        
        // Kontrol: Bu başarı gerçekten kazanılmış mı ve şu anki seviyesi mi?
        // Manuel atanan başarıların badge'leri de burada kontrol edilir.
        if (achievementType && user.achievements[achievementType]?.badge === badgeId) {
            achievedBadges.push(badgeId);
        }
    });
    
    if (achievedBadges.length === 0) return '';
    
    return achievedBadges.slice(0, maxToDisplay).map(badgeId => 
        getAchievementBadgeIcon(badgeId)
    ).join('');
}