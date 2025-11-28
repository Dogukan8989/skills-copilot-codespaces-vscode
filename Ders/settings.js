// =======================================================
// settings.js: KULLANICI AYARLARI YÖNETİMİ
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // KRİTİK: Verileri yükle
    if (typeof refreshAllData === 'function') {
         refreshAllData();
    }
    
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    if (!currentUserName) { window.location.href = 'login.html'; return; }

    let currentUser = users.find(u => u.name === currentUserName);
    if (!currentUser) return;

    // Sidebar Bilgilerini Doldur
    const sidebarAvatar = document.getElementById('sidebarUserAvatar');
    const mainUserName = document.getElementById('mainUserName');
    const userRoleBadge = document.getElementById('userRoleBadge');

    if (sidebarAvatar) sidebarAvatar.src = currentUser.profileImage || "https://via.placeholder.com/60";
    if (mainUserName) mainUserName.textContent = currentUser.name;
    if (userRoleBadge) userRoleBadge.textContent = ROLE_NAMES[currentUser.role] || 'Üye';

    // KRİTİK DÜZELTME: Formları Mevcut Bilgilerle Doldur
    const settingsNameInput = document.getElementById('settingsName');
    const settingsBioInput = document.getElementById('settingsBio');
    const privacySwitch = document.getElementById('privacySwitch');

    if (settingsNameInput) settingsNameInput.value = currentUser.name;
    if (settingsBioInput) settingsBioInput.value = currentUser.bio || "";
    if (privacySwitch) privacySwitch.checked = currentUser.isPrivate || false;

    // Başarı Seçim Alanını Doldur
    if (typeof renderAchievementSelection === 'function') {
        renderAchievementSelection(currentUser);
    }

    // ----------------------------------------------------
    // 1. PROFİL BİLGİLERİ GÜNCELLEME
    // ----------------------------------------------------
    document.getElementById('updateProfileForm').addEventListener('submit', (e) => {
        e.preventDefault(); // Sayfa Kaymasını Engelle
        const newName = document.getElementById('settingsName').value.trim();
        const newBio = document.getElementById('settingsBio').value.trim(); 
        
        const oldName = currentUser.name;
        const userIndex = users.findIndex(u => u.id === currentUser.id);

        if (newName.length < 3) {
            alert("İsim en az 3 karakter olmalıdır.");
            return;
        }
        
        // Sergilenecek Başarıları Topla ve Kontrol Et
        const selectedBadges = [];
        const checkboxes = document.querySelectorAll('#achievementSelectionArea input[type="checkbox"]:checked');
        if (checkboxes.length > 3) {
            document.getElementById('achievementError').textContent = "Maksimum 3 başarı sergilenebilir!";
            return;
        }
        checkboxes.forEach(cb => selectedBadges.push(cb.value));
        const achievementError = document.getElementById('achievementError');
        if (achievementError) achievementError.textContent = "";

        // İsim Değişikliği ve Veri Senkronizasyonu
        let nameChanged = false;

        if (newName !== oldName) {
            const nameExists = users.some(u => u.name.toLowerCase() === newName.toLowerCase() && u.id !== currentUser.id);
            if (nameExists) {
                alert("Bu kullanıcı adı zaten kullanılıyor.");
                return;
            }
            
            // --- İSİM DEĞİŞİKLİĞİ İÇİN TAM SENKRONİZASYON ---
            // 1. Kullanıcı Verisini Güncelle
            users[userIndex].name = newName;
            sessionStorage.setItem('CURRENT_USER_NAME', newName);
            
            // 2. TÜM VERİ SETLERİNİ TARA VE GÜNCELLE
            // Gönderileri Güncelle
            posts.forEach(post => {
                if (post.user === oldName) post.user = newName;
                if (post.likedBy) post.likedBy = post.likedBy.map(name => name === oldName ? newName : name);
                if (post.commentsData) post.commentsData.forEach(comment => { if (comment.userName === oldName) comment.userName = newName; });
            });
            savePostData();
            
            // Raporları Güncelle (Şikayet Eden ve Şikayet Edilen)
            reports.forEach(report => {
                if (report.targetName === oldName) report.targetName = newName;
                if (report.reportedBy === oldName) report.reportedBy = newName;
            });
            saveReportData();

            // Ekip Sohbet Mesajlarını Güncelle
            chatMessages.forEach(msg => {
                if (msg.user === oldName) msg.user = newName;
            });
            saveChatData();

            // Private Mesajları Güncelle
            if (typeof privateMessages !== 'undefined') {
                privateMessages.forEach(msg => {
                    if (msg.sender === oldName) msg.sender = newName;
                    if (msg.receiver === oldName) msg.receiver = newName;
                });
                savePrivateMessages(); 
            }

            // Hikayeleri Güncelle
            if (typeof stories !== 'undefined') {
                stories.forEach(story => {
                    if (story.user === oldName) story.user = newName;
                    if (story.likedBy) story.likedBy = story.likedBy.map(name => name === oldName ? newName : name);
                });
                saveStoryData();
            }
            // --- SENKRONİZASYON SONU ---

            nameChanged = true;
            currentUser.name = newName; 
        }

        // Bio ve Başarıları Güncelle
        users[userIndex].bio = newBio;
        users[userIndex].displayedAchievements = selectedBadges;
        
        // Veriyi kaydet
        if (typeof saveUserData === 'function') {
             saveUserData();
        }
        
        alert(`Profil bilgileri başarıyla güncellendi!`);
        
        // Kullanıcı adı değiştiyse, profil sayfasına yönlendir (yeniden yüklenmeyi zorlar)
        if (nameChanged) {
             window.location.href = 'profile.html';
        }
    });

    // ----------------------------------------------------
    // 2. ŞİFRE DEĞİŞTİRME
    // ----------------------------------------------------
    document.getElementById('updatePasswordForm').addEventListener('submit', (e) => {
        e.preventDefault(); // Sayfa Kaymasını Engelle
        const oldPass = document.getElementById('oldPass').value;
        const newPass = document.getElementById('newPass').value;

        if (oldPass !== currentUser.password) {
            alert("Hata: Mevcut şifrenizi yanlış girdiniz.");
            return;
        }

        if (newPass.length < 6) {
            alert("Yeni şifre en az 6 karakter olmalıdır.");
            return;
        }

        const userIndex = users.findIndex(u => u.id === currentUser.id);
        users[userIndex].password = newPass;
        if (typeof saveUserData === 'function') {
             saveUserData();
        }
        
        alert("Şifreniz başarıyla değiştirildi.");
        document.getElementById('updatePasswordForm').reset();
    });

    // ----------------------------------------------------
    // 3. GİZLİLİK AYARI (Switch)
    // ----------------------------------------------------
    const privacySwitchElement = document.getElementById('privacySwitch');
    if (privacySwitchElement) {
        privacySwitchElement.addEventListener('change', (e) => {
            const isPrivate = e.target.checked;
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            users[userIndex].isPrivate = isPrivate;
            if (typeof saveUserData === 'function') {
                 saveUserData();
            }
            
            alert(`Hesap gizliliği ${isPrivate ? 'açıldı' : 'kapatıldı'}.`);
        });
    }
});

/**
 * Kullanıcının kazandığı başarıları checkbox olarak listeler.
 * NOT: Bu fonksiyonun çalışması için achievements_data.js ve user_achievements.js yüklenmiş olmalıdır.
 */
function renderAchievementSelection(user) {
    const container = document.getElementById('achievementSelectionArea');
    if (!container) return;
    
    // Güvenlik kontrolü
    if (typeof ACHIEVEMENT_DEFINITIONS === 'undefined' || typeof getAchievementBadgeIcon === 'undefined') {
        container.innerHTML = '<div class="alert alert-danger small">Başarı verileri yüklenemedi. JS dosyalarını kontrol edin.</div>';
        return;
    }
    
    const achievements = user.achievements || {};
    const displayed = user.displayedAchievements || [];
    
    let html = '';
    let hasAchievement = false;

    ACHIEVEMENT_DEFINITIONS.forEach(def => {
        const achInfo = achievements[def.id];
        
        if (achInfo && achInfo.level > 0) {
            hasAchievement = true;
            const levelDef = def.levels[achInfo.level - 1];
            const isChecked = displayed.includes(levelDef.badge);
            const manualTag = achInfo.manual ? ' <span class="badge bg-warning text-dark small">Torpil</span>' : '';
            
            html += `
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" value="${levelDef.badge}" id="ach-${levelDef.badge}" ${isChecked ? 'checked' : ''}>
                    <label class="form-check-label small" for="ach-${levelDef.badge}">
                        ${getAchievementBadgeIcon(levelDef.badge)} <strong style="color: ${levelDef.color}">${levelDef.name}</strong> (${def.name})${manualTag}
                    </label>
                </div>`;
        }
    });

    if (!hasAchievement) {
         container.innerHTML = '<div class="text-muted small">Henüz sergilenecek bir başarınız yok. Başarı kazandığınızda buraya gelecektir.</div>';
    } else {
         container.innerHTML = html;
         container.innerHTML += '<p class="form-text text-muted small mt-2">Maksimum 3 adet seçebilirsiniz. Seçili olan rozetler profilinizde görünecektir.</p>';
    }
}