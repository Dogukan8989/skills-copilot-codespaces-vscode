// =======================================================
// achievements_data.js: BAŞARI SİSTEMİ VERİLERİ VE TANIMLARI
// =======================================================

/**
 * Tüm Başarıların Tanımları. 
 * Eşikler, ödül rozetleri ve seviyeler burada belirlenir.
 * Rozetler, user_achievements.js'teki getAchievementBadgeIcon fonksiyonunda kullanılacaktır.
 */
const ACHIEVEMENT_DEFINITIONS = [
    {
        id: 'posts', 
        name: 'Gönderi Ustası', 
        description: 'Belirtilen sayıda gönderi paylaşma başarısı.',
        levels: [
            { threshold: 1, name: 'İlk Adım', badge: 'bronze_post', icon: 'fas fa-feather', color: '#cd7f32' },
            { threshold: 10, name: 'Sık Paylaşan', badge: 'silver_post', icon: 'fas fa-feather-alt', color: '#c0c0c0' },
            { threshold: 50, name: 'Gözde Yazar', badge: 'gold_post', icon: 'fas fa-pen-nib', color: '#ffd700' },
        ],
    },
    {
        id: 'followers', 
        name: 'Etkileyen', 
        description: 'Belirtilen sayıda takipçiye ulaşma başarısı.',
        levels: [
            { threshold: 1, name: 'Tanıdık', badge: 'bronze_follower', icon: 'fas fa-users', color: '#cd7f32' },
            { threshold: 5, name: 'Popüler', badge: 'silver_follower', icon: 'fas fa-user-friends', color: '#c0c0c0' },
            { threshold: 10, name: 'Fenomen', badge: 'gold_follower', icon: 'fas fa-user-star', color: '#ffd700' },
        ],
    },
    {
        id: 'following', 
        name: 'Sosyal Keşif', 
        description: 'Belirtilen sayıda kişiyi takip etme başarısı.',
        levels: [
            { threshold: 1, name: 'İlk Takip', badge: 'bronze_following', icon: 'fas fa-share', color: '#cd7f32' },
            { threshold: 5, name: 'Geniş Çevre', badge: 'silver_following', icon: 'fas fa-share-alt', color: '#c0c0c0' },
            { threshold: 10, name: 'Takip Canavarı', badge: 'gold_following', icon: 'fas fa-route', color: '#ffd700' },
        ],
    },
];

// Admin Panel Yönetim Fonksiyonları (achievement_data.js içinde tutulur)

/**
 * Admin Panel için tüm başarıları ve kullanıcı durumlarını tablo olarak render eder.
 */
function renderAchievementsTable() {
    const tableBody = document.getElementById('achievementsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    // Her bir kullanıcı için başarıları kontrol et
    users.forEach(user => {
        let userAchievementsHtml = '';
        
        ACHIEVEMENT_DEFINITIONS.forEach(def => {
            const achievementInfo = user.achievements?.[def.id];
            
            // Eğer başarı kazanılmışsa göster
            if (achievementInfo && achievementInfo.level > 0) {
                const achievedLevel = def.levels[achievementInfo.level - 1];
                const manualTag = achievementInfo.manual ? ' <i class="fas fa-hand text-danger" title="Manuel Atandı"></i>' : '';
                
                userAchievementsHtml += `<span class="badge bg-light text-dark me-1" 
                                            style="border: 1px solid ${achievedLevel.color}; color: ${achievedLevel.color} !important;"
                                            title="${def.name}: ${achievedLevel.name} (Eşik: ${achievedLevel.threshold}) - Kazanma Tarihi: ${new Date(achievementInfo.timestamp).toLocaleDateString()}">
                                            <i class="${achievedLevel.icon}" style="color: ${achievedLevel.color};"></i> ${achievedLevel.name}${manualTag}
                                        </span>`;
            }
        });

        // Yöneticiye Özel "Torpil" Butonu
        const giveAchievementBtn = `<button class="btn btn-sm btn-info me-1" onclick="openGiveAchievementModal(${user.id})" title="Başarı Ver"><i class="fas fa-gift"></i></button>`;

        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${user.id}</td>
            <td><strong>${user.name}</strong></td>
            <td>${user.role}</td>
            <td>${userAchievementsHtml || '<span class="text-muted">Henüz başarı yok.</span>'}</td>
            <td>${giveAchievementBtn}</td>
        `;
    });
}

/**
 * Admin: Başarı verme modalını açar ve doldurur.
 */
window.openGiveAchievementModal = function(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('achievementModalTitle').textContent = `${user.name} için Başarı Yönetimi`;
    document.getElementById('achievementTargetUserId').value = userId;
    
    const achievementSelect = document.getElementById('achievementSelect');
    const levelSelect = document.getElementById('achievementLevelSelect');
    
    // 1. Başarı Seçim Alanını Doldur
    achievementSelect.innerHTML = ACHIEVEMENT_DEFINITIONS.map(def => 
        `<option value="${def.id}">${def.name}</option>`
    ).join('');
    
    // 2. Seviye Seçim Alanını Doldur
    function updateLevelSelect() {
        const selectedAchId = achievementSelect.value;
        const selectedDef = ACHIEVEMENT_DEFINITIONS.find(def => def.id === selectedAchId);
        
        levelSelect.innerHTML = selectedDef ? selectedDef.levels.map((level, index) => 
            `<option value="${index + 1}">${level.name} (Seviye ${index + 1}) (Eşik: ${level.threshold})</option>`
        ).join('') : '';
        
        // Mevcut başarı seviyesini önceden seç
        const currentLevel = user.achievements?.[selectedAchId]?.level || 0;
        levelSelect.value = currentLevel;
        document.getElementById('achievementCurrentLevel').textContent = `Mevcut Seviye: ${currentLevel}`;
    }
    
    achievementSelect.onchange = updateLevelSelect;
    updateLevelSelect();
    
    const modalEl = document.getElementById('giveAchievementModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

/**
 * Admin: Başarıyı manuel olarak verir (Form Submit).
 */
window.handleGiveAchievementSubmit = function(e) {
    e.preventDefault();
    
    const userId = parseInt(document.getElementById('achievementTargetUserId').value);
    const achievementId = document.getElementById('achievementSelect').value;
    const level = parseInt(document.getElementById('achievementLevelSelect').value);
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;
    
    const user = users[userIndex];
    const achievementDef = ACHIEVEMENT_DEFINITIONS.find(def => def.id === achievementId);
    
    if (!user.achievements) user.achievements = {};

    user.achievements[achievementId] = {
        level: level,
        timestamp: Date.now(),
        name: achievementDef.levels[level - 1].name,
        badge: achievementDef.levels[level - 1].badge,
        manual: true // Manuel verildiğini işaretle
    };

    saveUserData();
    moderationLogs.push(`[BAŞARI VERİLDİ] ${CURRENT_USER_NAME}: ${user.name} kullanıcısına "${achievementDef.name}" başarısı, Seviye ${level} manuel olarak atandı.`);
    window.renderModerationLogs();
    renderAchievementsTable();

    alert(`${user.name} kullanıcısına başarı başarıyla atandı.`);
    
    const modalEl = document.getElementById('giveAchievementModal');
    bootstrap.Modal.getInstance(modalEl).hide();
}