// =======================================================
// social-media.js: SOSYAL MEDYA UYGULAMASI (FINAL GÜNCEL VERSİYON)
// =======================================================

// ----------------------------------------------------
// 1. GLOBAL DEĞİŞKENLER
// ----------------------------------------------------
let currentStorySession = []; 
let currentStoryIndex = 0; 
let tempProfileImageData = null; // Kırpma için geçici resim verisi

const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'expert', 'moderator']; 
window.globalAlerts = []; 


// ----------------------------------------------------
// 2. YARDIMCI FONKSİYONLAR
// ----------------------------------------------------

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('DARK_MODE', isDark ? 'enabled' : 'disabled');
}

function getRoleName(roleId) {
    if (typeof ROLE_NAMES === 'object' && ROLE_NAMES[roleId]) {
        return ROLE_NAMES[roleId];
    }
    return roleId;
}

function filterBlacklistedWords(text) {
    if (!text || typeof text !== 'string') return '';
    
    if (typeof window.BLACKLISTED_WORDS === 'undefined') {
        return text;
    }

    let filteredText = text;

    window.BLACKLISTED_WORDS.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi'); 
        const stars = '*'.repeat(word.length);
        
        filteredText = filteredText.replace(regex, stars);
    });

    return filteredText;
}
window.filterBlacklistedWords = filterBlacklistedWords; 


function getUserAvatar(userName) {
    const user = window.users.find(u => u.name === userName);
    if (user && user.profileImage && user.profileImage.length > 50) {
        return user.profileImage;
    }
    const firstLetter = userName ? userName.charAt(0).toUpperCase() : 'U';
    return `https://via.placeholder.com/150/e9ecef/6c757d?text=${firstLetter}`; 
}
window.getUserAvatar = getUserAvatar;

window.loadSidebarAvatar = function() {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const sidebarAvatar = document.getElementById('sidebarUserAvatar');
    if (sidebarAvatar && currentUserName) {
        sidebarAvatar.src = getUserAvatar(currentUserName);
    }
}

window.imgError = function(image) {
    image.onerror = null;
    image.src = "https://via.placeholder.com/150/cccccc/000000?text=NO_IMG"; 
    return true;
}

function isCurrentUserStaff() {
    const role = sessionStorage.getItem('CURRENT_USER_ROLE');
    return STAFF_ROLES.includes(role);
}

function formatPostDate(timestamp) {
    if (!timestamp) return 'Tarih Yok';
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function closeAllModals(excludeIds = []) {
    const modalIds = ['friendsModal', 'userListModal', 'cropModal', 'storyModal']; 
    modalIds.forEach(id => {
        if (!excludeIds.includes(id)) {
            const el = document.getElementById(id);
            if (el) {
                const instance = bootstrap.Modal.getInstance(el);
                if (instance) {
                    instance.hide();
                } else if (el.classList.contains('show')) {
                    el.classList.remove('show');
                    el.style.display = 'none';
                    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }
            }
        }
    });
}

function filterBlacklistedWords(text) {
    if (!text || typeof text !== 'string') return '';
    
    if (typeof window.BLACKLISTED_WORDS === 'undefined') {
        return text;
    }

    let filteredText = text;

    window.BLACKLISTED_WORDS.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi'); 
        const stars = '*'.repeat(word.length);
        
        filteredText = filteredText.replace(regex, stars);
    });

    return filteredText;
}

/**
 * Kullanıcının aksiyon yapma yetkisi var mı? (Pending ve Notice durumunda yok)
 * @returns {boolean} True ise yetkili, False ise kısıtlı.
 */
function canUserPerformActions(user) {
    if (!user) return false;
    return user.status !== 'pending' && user.status !== 'pending_approval_notice';
}

/**
 * Onay bildirimi tıklandığında kullanıcıyı logoff yapar.
 * @param {string} userName - İşlemi yapan kullanıcı adı.
 */
window.completeApprovalAndLogout = function(userName) {
    const user = users.find(u => u.name === userName);
    if (user && user.status === 'pending_approval_notice') {
        
        // Durumu kalıcı olarak aktif/offline yap
        user.status = 'offline'; 
        user.showPendingWarning = false;
        
        saveUserData(); // Kaydet
        
        alert("Hesap izinleriniz aktif edildi. Değişikliklerin etkili olması için tekrar giriş yapınız.");
        
        // logout fonksiyonunu çağır (Bu otomatik session temizliği yapacaktır)
        window.logout(); 
    }
}

// ----------------------------------------------------
// 3. SAYFA YÜKLENDİĞİNDE ÇALIŞACAKLAR (DOM)
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUserRole = sessionStorage.getItem('CURRENT_USER_ROLE');
    
    // DÜZELTME: Sidebar rol ismini her zaman getRoleName ile alarak tutarlılığı sağla
    const userRoleBadgeEl = document.getElementById('userRoleBadge');
    if (userRoleBadgeEl && currentUserRole) {
        userRoleBadgeEl.textContent = getRoleName(currentUserRole);
    }
    
    // *** YENİ: Oturum Açıkken Durumu Aktif Yap ***
    if (currentUserName) {
        const userIndex = users.findIndex(u => u.name === currentUserName);
        const userStatus = users[userIndex]?.status;

        // SADECE BANLI VEYA TIMEOUT DEĞİLSE VE ONAY/BİLDİRİM BEKLİMİYORSA AKTİF YAP
        if (userIndex !== -1 && userStatus !== 'inactive' && !userStatus?.startsWith('timeout') && userStatus !== 'pending' && userStatus !== 'pending_approval_notice') {
            users[userIndex].status = 'active'; 
            saveUserData();
        }
    }
    // ********************************************

    // --- Dark Mode Kontrolü ---
    if (localStorage.getItem('DARK_MODE') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    // --- KRİTİK: Sidebar Avatarını Hemen Yükle ---
    loadSidebarAvatar();
    
    // Ayarlar sayfasındaki switch butonu için
    const darkModeBtn = document.getElementById('darkModeToggleBtn');
    if (darkModeBtn) {
        darkModeBtn.checked = localStorage.getItem('DARK_MODE') === 'enabled';
        darkModeBtn.addEventListener('click', toggleDarkMode);
    }

    // --- Aktivite Takibini Başlat ---
    if (typeof trackUserActivity === 'function') {
        trackUserActivity();
    }

    // --- Post Oluşturma Avatarını Yükle (YENİ EKLEME) ---
    const postCreatorAvatar = document.getElementById('postCreatorAvatar');
    if (postCreatorAvatar) {
        if (currentUserName && typeof getUserAvatar === 'function') {
            postCreatorAvatar.src = getUserAvatar(currentUserName);
        }
    }

    // --- KRİTİK: BAKIM MODU KONTROLÜ ---
    const isMaintenanceMode = localStorage.getItem('MAINTENANCE_MODE') === 'enabled';
    const CURRENT_USER_ROLE_CHECK = sessionStorage.getItem('CURRENT_USER_ROLE');
    
    // SADECE NORMAL ÜYEYSE Bakım Modunu göster
    if (isMaintenanceMode && CURRENT_USER_ROLE_CHECK === 'member') {
        document.body.innerHTML = `
            <div class="text-center p-5 mt-5">
                <i class="fas fa-tools fa-5x text-danger mb-3"></i>
                <h1 class="text-dark">Sistem Bakım Modunda</h1>
                <p class="text-muted">Platformumuz şu anda planlı bakım nedeniyle erişime kapalıdır. Lütfen daha sonra tekrar deneyin.</p>
                <button class="btn btn-primary" onclick="window.location.reload()">Yenile</button>
            </div>
        `;
        return; // Sayfanın geri kalanını yüklemeyi durdur
    }
    // ------------------------------------

    // --- Sayfa İçeriğine Göre Render Fonksiyonları ---
    if (document.getElementById('storyFeed')) {
        if (typeof window.renderStories === 'function') window.renderStories();
    }
    
    if (document.getElementById('postFeed')) {
        if (typeof window.renderFeed === 'function') window.renderFeed();
        // Uyarıları gösteren ana fonksiyonu düzenli kontrol et
        setInterval(window.checkAndShowWarnings, 10000); 
    }
    
    if (document.getElementById('profileHeader')) {
        if (typeof window.renderUserProfile === 'function') window.renderUserProfile();
    }
    
    // Sağ Sidebar Önerileri ve İstekleri (SADECE BİR KEZ YÜKLENİR)
    const desktopList = document.getElementById('suggestedUsersListDesktop');
    if (document.getElementById('friendRequests')) {
        renderRightSidebarRequests(); // İlk yükleme
        if (desktopList) {
            renderSuggestedUsers(desktopList, true); // İlk yükleme
        }
    }
    
    // Mobil listesi (sadece ana sayfada varsa)
    const mobileList = document.getElementById('suggestedUsersListMobile');
    if (mobileList && !desktopList) {
         renderSuggestedUsers(mobileList);
    }

    // --- Profil Linklerini Yakala (Hafıza Temizliği İçin) ---
    const allProfileLinks = document.querySelectorAll('a[href="profile.html"]');
    allProfileLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); 
            if(typeof goToMyProfile === 'function') {
                goToMyProfile(); 
            } else {
                window.location.href = 'profile.html';
            }
        });
    });

    // --- Profil Fotoğrafı Yükleme (Kırpma modalını tetikler) ---
    const profileImageInput = document.getElementById('profileImageInput');
    if (profileImageInput) {
        // Eski listener'ı silmek için input'u tekrar kurma yöntemi kullanıldı
        const newFileInput = profileImageInput.cloneNode(true);
        profileImageInput.parentNode.replaceChild(newFileInput, profileImageInput);
        
        newFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    tempProfileImageData = e.target.result; // Geçici veriye kaydet
                    
                    const cropModalEl = document.getElementById('cropModal');
                    if(cropModalEl) {
                        const cropImagePreview = document.getElementById('cropImagePreview');
                        cropImagePreview.src = tempProfileImageData;
                        
                        // Zoom slider ve resim pozisyonunu sıfırla
                        const zoomSlider = document.getElementById('zoomSlider');
                        if (zoomSlider) zoomSlider.value = 100;
                        cropImagePreview.style.width = '100%';
                        cropImagePreview.style.height = '100%';
                        cropImagePreview.style.top = '0px';
                        cropImagePreview.style.left = '0px';

                        // Diğer modalları kapat (Hata düzeltme için önemli adım)
                        closeAllModals(['cropModal']);

                        const modal = new bootstrap.Modal(cropModalEl);
                        modal.show();
                    }
                };
                reader.readAsDataURL(file); 
            }
            newFileInput.value = null; // Aynı resmi tekrar seçebilmek için input'u temizle
        });
        
        // Kırpılan resmi kaydetme butonu listener'ı
        const saveBtn = document.getElementById('saveCroppedImage');
        if(saveBtn) {
            saveBtn.addEventListener('click', saveCroppedImage);
        }

        // YENİ: Yakınlaştırma (Zoom) Slider Listener'ı
        const zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) {
            zoomSlider.addEventListener('input', updateCropZoom);
        }
        
        // YENİ: Sürükleme (Kaydırma) Listener'ları (Simülasyon)
        setupImageDragSim();
    }
    // ********************************************

    // --- Hikaye Fotoğrafı Yükleme ---
    const storyImageInput = document.getElementById('storyImageInput');
    if (storyImageInput) {
        const newStoryInput = storyImageInput.cloneNode(true);
        storyImageInput.parentNode.replaceChild(newStoryInput, storyImageInput);
        newStoryInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageData = e.target.result;
                    if (currentUserName) { 
                        window.addStory(currentUserName, imageData); 
                        alert("Hikayeniz başarıyla eklendi!"); 
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// *** KRİTİK DÜZELTME: Sayfadan Çıkışta Durumu Offline Çek ***
window.logout = function() {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    if (currentUserName) {
        const currentUserIndex = users.findIndex(u => u.name === currentUserName);
        const userStatus = users[currentUserIndex]?.status;

        // SADECE BANLI VEYA TIMEOUT DEĞİLSE VE ONAY/BİLDİRİM BEKLİMİYORSA DURUMU OFFLINE YAP
        if (currentUserIndex !== -1 && userStatus !== 'inactive' && !userStatus?.startsWith('timeout') && userStatus !== 'pending' && userStatus !== 'pending_approval_notice') {
            users[currentUserIndex].status = 'offline';
            saveUserData();
        }
    }
    sessionStorage.clear();
    window.location.href = 'login.html';
}
// *************************************************

// ----------------------------------------------------
// 4. YARDIMCI FONKSİYONLAR
// ----------------------------------------------------

function getUserAvatar(userName) {
    const user = window.users.find(u => u.name === userName);
    if (user && user.profileImage && user.profileImage.length > 50) {
        return user.profileImage;
    }
    const firstLetter = userName ? userName.charAt(0).toUpperCase() : 'U';
    return `https://via.placeholder.com/150/e9ecef/6c757d?text=${firstLetter}`; 
}
window.getUserAvatar = getUserAvatar;

window.imgError = function(image) {
    image.onerror = null;
    image.src = "https://via.placeholder.com/150/cccccc/000000?text=NO_IMG"; 
    return true;
}

function isCurrentUserStaff() {
    const role = sessionStorage.getItem('CURRENT_USER_ROLE');
    return STAFF_ROLES.includes(role);
}

function formatPostDate(timestamp) {
    if (!timestamp) return 'Tarih Yok';
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function closeAllModals(excludeIds = []) {
    const modalIds = ['friendsModal', 'userListModal', 'cropModal', 'storyModal']; 
    modalIds.forEach(id => {
        if (!excludeIds.includes(id)) {
            const el = document.getElementById(id);
            if (el) {
                const instance = bootstrap.Modal.getInstance(el);
                if (instance) {
                    instance.hide();
                } else if (el.classList.contains('show')) {
                    el.classList.remove('show');
                    el.style.display = 'none';
                    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }
            }
        }
    });
}

function filterBlacklistedWords(text) {
    if (!text || typeof text !== 'string') return '';
    
    if (typeof window.BLACKLISTED_WORDS === 'undefined') {
        return text;
    }

    let filteredText = text;

    window.BLACKLISTED_WORDS.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi'); 
        const stars = '*'.repeat(word.length);
        
        filteredText = filteredText.replace(regex, stars);
    });

    return filteredText;
}

/**
 * Kullanıcının aksiyon yapma yetkisi var mı? (Pending ve Notice durumunda yok)
 * @returns {boolean} True ise yetkili, False ise kısıtlı.
 */
function canUserPerformActions(user) {
    if (!user) return false;
    return user.status !== 'pending' && user.status !== 'pending_approval_notice';
}

/**
 * Onay bildirimi tıklandığında kullanıcıyı logoff yapar.
 * @param {string} userName - İşlemi yapan kullanıcı adı.
 */
window.completeApprovalAndLogout = function(userName) {
    const user = users.find(u => u.name === userName);
    if (user && user.status === 'pending_approval_notice') {
        
        // Durumu kalıcı olarak aktif/offline yap
        user.status = 'offline'; 
        user.showPendingWarning = false;
        
        saveUserData(); // Kaydet
        
        alert("Hesap izinleriniz aktif edildi. Değişikliklerin etkili olması için tekrar giriş yapınız.");
        
        // logout fonksiyonunu çağır (Bu otomatik session temizliği yapacaktır)
        window.logout(); 
    }
}

// ----------------------------------------------------
// 8. UYARI VE BİLDİRİM MEKANİZMALARI (YENİ EKLENTİ)
// ----------------------------------------------------

/**
 * Global Uyarıyı Admin Panelinden Alıp Kullanıcının warnings dizisine ekler ve ding sesi çalar.
 */
window.sendGlobalWarningSubmit = function(e) {
    e.preventDefault();
    
    const globalWarningModal = document.getElementById('globalWarningModal');
    const globalMessage = document.getElementById('globalWarningMessageInput')?.value.trim();
    
    if (!globalMessage) {
        alert("Uyarı mesajı boş olamaz.");
        return;
    }

    if (CURRENT_USER_ROLE !== 'super_admin' && CURRENT_USER_ROLE !== 'admin') {
         window.showAdminToast('⛔ Yetki Hatası: Global uyarı sadece Admin/Baş Yönetici tarafından gönderilebilir.', 'danger', 5000);
         return;
    }

    if (confirm(`KRİTİK ONAY: "${globalMessage}" mesajı platformdaki TÜM kullanıcılara anlık bildirim olarak gönderilecektir. Emin misiniz?`)) {
        
        // 1. Tüm kullanıcılara uyarı bayrağı eklenir
        window.users.forEach(user => {
            if (user.role !== 'member' || user.status === 'active') { // Sadece aktif üyelere veya yetkililere gönder
                if (!user.warnings) user.warnings = [];
                user.warnings.push({
                    sender: 'Sistem',
                    message: globalMessage,
                    timestamp: Date.now(),
                    type: 'global',
                    is_read: false
                });
            }
        });
        window.saveUserData(); // Veriyi kaydet
        
        // 2. Ses çalma (Bildirim Sesi)
        const audio = new Audio('https://s3-us-west-2.amazonaws.com/s.cdpn.io/3/success.mp3'); 
        audio.play().catch(e => console.error("Ses çalma hatası:", e));
        
        // 3. Loglama
        moderationLogs.push(`[GLOBAL UYARI GÖNDERİLDİ] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME} tarafından global uyarı yayınlandı: "${globalMessage.substring(0, 50)}..."`);
        window.saveModerationLogs();
        
        window.showAdminToast(`📢 Global Uyarı Başarıyla Yayınlandı!`, 'warning', 5000);
        
        // Modalı kapat
        if (globalWarningModal) {
            bootstrap.Modal.getInstance(globalWarningModal).hide();
        }
    }
}


/**
 * Kullanıcının warnings dizisini kontrol eder ve anlık bir uyarı kutusu (alert) gösterir.
 */
window.checkAndShowWarnings = function() {
    
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUser = users.find(u => u.name === currentUserName);
    
    if (!currentUser || !currentUser.warnings || currentUser.warnings.length === 0) return;
    
    // Yalnızca okunmamış uyarıları filtrele
    const unreadWarnings = currentUser.warnings.filter(w => !w.is_read);
    
    if (unreadWarnings.length > 0) {
        
        unreadWarnings.forEach((warning, index) => {
            
            // Eğer global uyarıysa ding sesi çal
            if (warning.type === 'global') {
                 // Sadece çalma izni varsa çal
                 if (Notification.permission === 'granted') {
                     const audio = new Audio('https://s3-us-west-2.amazonaws.com/s.cdpn.io/3/success.mp3');
                     audio.play().catch(e => console.error("Ses çalma hatası:", e));
                 }
            }

            const alertType = warning.type === 'global' ? 'alert-danger' : 'alert-warning';
            const senderName = warning.sender === 'Sistem' ? '📢 SİSTEM YÖNETİMİ' : `🔔 Yönetici Uyarısı (${warning.sender})`;
            
            // Kullanıcıya Bootstrap alert'i gösterelim (Çarpıya basınca kaybolur)
            const warningHtml = `
                <div class="alert ${alertType} alert-dismissible fade show" role="alert" style="position: fixed; top: ${20 + index * 100}px; right: 20px; z-index: 1060; max-width: 400px; cursor: default;">
                    <strong>${senderName}</strong>
                    <p class="mb-1 small">${filterBlacklistedWords(warning.message)}</p>
                    <small class="text-muted">${new Date(warning.timestamp).toLocaleTimeString()}</small>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Kapat" onclick="dismissWarning(${warning.timestamp})"></button>
                </div>
            `;
            
            // Uyarının body'ye eklenmesi
            const alertElement = document.createElement('div');
            alertElement.innerHTML = warningHtml;
            document.body.appendChild(alertElement.firstChild);

            // Uyarının kaydını okundu yapalım (Çarpıya basılınca silinme mantığını korur)
            currentUser.warnings.find(w => w.timestamp === warning.timestamp).is_read = true;
            saveUserData();
        });
        
        // Bir kez çalıştıktan sonra kaydı güncelleyelim
        refreshAllUI();
    }
}

/**
 * Kullanıcının uyarıyı okundu olarak işaretlemesini sağlar. (Çarpıya basınca tetiklenir)
 * @param {number} timestamp - Uyarının zaman damgası.
 */
window.dismissWarning = function(timestamp) {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUser = users.find(u => u.name === currentUserName);
    
    if (currentUser) {
        const warningIndex = currentUser.warnings.findIndex(w => w.timestamp === timestamp);
        if (warningIndex !== -1) {
            // Sadece okundu işaretini kaldır, silme işlemini DOM'da bırak
            currentUser.warnings[warningIndex].is_read = true;
            saveUserData();
        }
    }
}


// ----------------------------------------------------
// 5. HİKAYE (STORY) FONKSİYONLARI (Kısıtlama Mantığı Eklenmiş)
// ----------------------------------------------------

window.checkAndClearOldStories = function() {
    const timeLimitMs = 5 * 60 * 60 * 1000; // 5 Saat
    const now = Date.now();
    const initialCount = window.stories.length;
    
    window.stories = window.stories.filter(story => 
        (story.status !== 'deleted' && story.status !== 'archived') && 
        (!story.timestamp || (now - story.timestamp < timeLimitMs))
    );
    
    if (window.stories.length !== initialCount) {
        saveStoryData();
        if (typeof window.renderStories === 'function') window.renderStories();
    }
}

window.addStory = function(userName, imageData) { 
    const user = users.find(u => u.name === userName);
    if (!canUserPerformActions(user)) {
        alert("Hikaye atılamadı: Hesap kısıtlı durumda. Lütfen Admin onayını tamamlayın.");
        return;
    }
    
    const newId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 101;
    const newStory = { 
        id: newId, 
        user: userName, 
        content: filterBlacklistedWords(`Yeni hikaye`), 
        imageUrl: imageData, 
        likes: 0, 
        likedBy: [], 
        seen: false, 
        timestamp: Date.now(),
        status: 'active', 
        comments: [] 
    };
    window.stories.push(newStory);
    saveStoryData();
    renderStories(); 
}

/**
 * Hikaye önizlemelerini render eder. (HİKAYELERİN GÖRÜNMESİ İÇİN EK KOD)
 */
window.renderStories = function() {
    const storiesContainer = document.getElementById('storyFeed');
    if (!storiesContainer || typeof window.stories === 'undefined') return;

    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const now = Date.now();
    
    const activeStories = window.stories.filter(s => s.status === 'active' && s.timestamp > now - (24 * 60 * 60 * 1000)); // Son 24 saat

    // Hikayeleri kullanıcıya göre grupla
    const userStoryMap = new Map();
    activeStories.reverse().forEach(story => { 
        if (!userStoryMap.has(story.user)) {
            userStoryMap.set(story.user, story);
        }
    });

    let storiesHTML = `
         <div class="story-card story-creator-card text-center d-flex align-items-center justify-content-center" data-bs-toggle="modal" data-bs-target="#newStoryModal" style="background-color: var(--hover-bg);">
            <i class="fas fa-plus fa-2x text-primary"></i>
            <div class="story-user-name" style="position: static; margin-top: 10px; color: var(--text-main) !important;">Hikaye Ekle</div>
        </div>
    `;

    userStoryMap.forEach(story => {
        const user = users.find(u => u.name === story.user);
        if (!user) return;

        storiesHTML += `
            <div class="story-card" style="background-image: url('${story.imageUrl || getUserAvatar(user.name)}');">
                <img src="${getUserAvatar(user.name)}" class="story-avatar">
                <div class="story-user-name">${user.name.split(' ')[0]}</div>
            </div>
        `;
    });

    storiesContainer.innerHTML = storiesHTML;
}


window.removeStory = function(storyId) {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const storyIndex = window.stories.findIndex(s => s.id === storyId);
    
    if (storyIndex === -1) return;
    
    if (window.stories[storyIndex].user === currentUserName || isCurrentUserStaff()) {
         window.stories.splice(storyIndex, 1); 
         saveStoryData(); 
         
         const modalEl = document.getElementById('storyModal');
         const modal = bootstrap.Modal.getInstance(modalEl);
         if(modal) modal.hide();
         renderStories(); 
    } else {
         alert("Bu hikayeyi silme yetkiniz yok.");
    }
}

window.archiveStory = function(storyId) {
    const story = window.stories.find(s => s.id === storyId);
    if (!story || story.user !== sessionStorage.getItem('CURRENT_USER_NAME')) return alert("Arşivleme yetkisi yok.");
    
    story.status = 'archived';
    saveStoryData();
    
    const modalEl = document.getElementById('storyModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if(modal) modal.hide();
    renderStories();
    renderUserProfile(); 
}


// SLAYT GÖSTERİSİ BAŞLAT
window.startStoryViewer = function(userName) {
    // Sadece aktif ve arşivlenmemiş hikayeleri göster
    currentStorySession = window.stories.filter(s => s.user === userName && s.status === 'active').sort((a, b) => a.timestamp - b.timestamp);
    
    if (currentStorySession.length === 0) return;
    
    const firstUnseenIndex = currentStorySession.findIndex(s => !s.seen);
    currentStoryIndex = firstUnseenIndex !== -1 ? firstUnseenIndex : 0;
    
    closeAllModals(['storyModal']);

    updateStoryModalContent();
    
    const modalEl = document.getElementById('storyModal');
    const modal = new bootstrap.Modal(modalEl);
    
    const modalContent = modalEl.querySelector('.modal-content');
    modalContent.style.backgroundColor = "rgba(0, 0, 0, 0.9)"; 
    modalContent.style.border = "none";
    modalContent.style.backdropFilter = "blur(10px)";
    
    modal.show();
}

function updateStoryModalContent() {
    const story = currentStorySession[currentStoryIndex];
    if (!story) return;

    const imgEl = document.getElementById('storyModalImage');
    const userEl = document.getElementById('storyModalUser');
    const controlsDiv = document.getElementById('storyModalControls');
    const commentInputDiv = document.getElementById('storyCommentInput'); 
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUser = users.find(u => u.name === currentUserName); 

    imgEl.src = story.imageUrl;
    
    userEl.innerHTML = `${story.user} <span style="font-size:0.7em; opacity:0.7; margin-left:10px;">${currentStoryIndex + 1}/${currentStorySession.length}</span>`;
    userEl.style.color = "white";

    const modalBody = document.querySelector('#storyModal .modal-body');
    let newBody = modalBody.cloneNode(true);
    modalBody.parentNode.replaceChild(newBody, modalBody);
    
    newBody.addEventListener('click', function(e) {
        if (!e.target.closest('#storyCommentInput')) { 
            const width = this.offsetWidth;
            const x = e.offsetX;
            if (x > width / 2) { 
                nextStory(); 
            } else { 
                prevStory(); 
            }
        }
    });

    // Kontrol butonlarını (Like, Sil) ayarla
    controlsDiv.innerHTML = '';
    const isLiked = story.likedBy && story.likedBy.includes(currentUserName);
    const heartIconClass = isLiked ? "fas fa-heart text-danger" : "far fa-heart text-white";
    
    const likeBtn = document.createElement('button');
    likeBtn.className = "btn btn-sm btn-link text-decoration-none me-3";
    likeBtn.style.position = "relative"; 
    likeBtn.style.zIndex = "1050";
    likeBtn.innerHTML = `<i class="${heartIconClass} fa-2x"></i> <span class="text-white fw-bold ms-1">${story.likes || 0}</span>`;
    
    likeBtn.onclick = function(e) { 
        e.stopPropagation(); 
        if(canUserPerformActions(currentUser)) {
            toggleStoryLike(story.id, currentUserName, likeBtn); 
        } else {
            alert("İşlem kısıtlı: Hesap onay bekliyor.");
        }
    };
    controlsDiv.appendChild(likeBtn);

    // Kendi hikayesiyse silme/arşivleme butonu ekle
    if (story.user === currentUserName) {
        const archiveBtn = document.createElement('button');
        archiveBtn.className = "btn btn-sm btn-light me-2";
        archiveBtn.style.position = "relative"; 
        archiveBtn.style.zIndex = "1050";
        archiveBtn.innerHTML = '<i class="fas fa-archive"></i> Arşivle';
        
        archiveBtn.onclick = function(e) { 
            e.stopPropagation(); 
            if(confirm("Bu hikayeyi arşivlemek istediğinizden emin misiniz? Arşivlenen içerikler akışta görünmez.")) {
                archiveStory(story.id);
            }
        };
        controlsDiv.appendChild(archiveBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = "btn btn-sm btn-danger";
        deleteBtn.style.position = "relative"; 
        deleteBtn.style.zIndex = "1050";
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Sil';
        
        deleteBtn.onclick = function(e) { 
            e.stopPropagation(); 
            if(confirm("Bu hikayeyi kalıcı olarak silmek istiyor musunuz?")) {
                removeStory(story.id);
            }
        };
        controlsDiv.appendChild(deleteBtn);
    }
    
    // YENİ: Yorum Alanı Kontrolü (Hikayeye yanıt gönderme)
    const isMyStory = story.user === currentUserName;
    const storyOwner = users.find(u => u.name === story.user);
    const isPrivate = storyOwner?.isPrivate;
    const isFollowing = users.find(u => u.name === currentUserName)?.following?.includes(storyOwner?.id);
    
    if (isMyStory || !isPrivate || isFollowing) {
        commentInputDiv.style.display = 'flex';
        
        const sendBtn = commentInputDiv.querySelector('button');
        const inputField = commentInputDiv.querySelector('input[type="text"]');
        
        inputField.disabled = !canUserPerformActions(currentUser); // Kısıtlıysa inputu kapat

        const oldSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(oldSendBtn, sendBtn);
        
        oldSendBtn.addEventListener('click', function() {
            if (!canUserPerformActions(currentUser)) {
                 alert("Yanıt gönderilemedi: Hesap kısıtlı durumda.");
                 return;
            }
            const commentText = inputField.value.trim();
            if (commentText) {
                alert(`Yanıt gönderildi: ${commentText}`);
                inputField.value = '';
                moderationLogs.push(`[HİKAYE YANIT] ${currentUserName} -> ${story.user}: ${filterBlacklistedWords(commentText)}`); 
                saveModerationLogs();
            }
        });
        
    } else {
        commentInputDiv.style.display = 'none';
    }

    // Görüldü olarak işaretle
    if (!story.seen && story.user !== currentUserName) {
        story.seen = true; 
        saveStoryData();
    }
}

function nextStory() {
    if (currentStoryIndex < currentStorySession.length - 1) { 
        currentStoryIndex++; 
        updateStoryModalContent(); 
    } else { 
        const modalEl = document.getElementById('storyModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide(); 
        renderStories(); 
    }
}

function prevStory() {
    if (currentStoryIndex > 0) { 
        currentStoryIndex--; 
        updateStoryModalContent(); 
    }
}

window.toggleStoryLike = function(storyId, userName, btnElement) {
    const story = window.stories.find(s => s.id === storyId);
    if (!story) return;
    
    if (!story.likedBy) story.likedBy = [];
    const alreadyLiked = story.likedBy.includes(userName);

    if (alreadyLiked) {
        story.likes--;
        story.likedBy = story.likedBy.filter(u => u !== userName);
        btnElement.querySelector('i').className = "far fa-heart text-white fa-2x";
    } else {
        story.likes = (story.likes || 0) + 1;
        story.likedBy.push(userName);
        btnElement.querySelector('i').className = "fas fa-heart text-danger fa-2x";
    }
    
    btnElement.querySelector('span').textContent = story.likes;
    saveStoryData();
}

window.saveCroppedImage = function() {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    if (!tempProfileImageData || !currentUserName) {
        alert("Hata: Kırpılacak resim verisi bulunamadı.");
        return;
    }
    
    const cropImagePreview = document.getElementById('cropImagePreview');
    const currentZoom = document.getElementById('zoomSlider').value;
    const currentLeft = cropImagePreview.style.left || '0px';
    const currentTop = cropImagePreview.style.top || '0px';
    
    const userIndex = users.findIndex(u => u.name === currentUserName);
    
    if (userIndex !== -1) { 
        users[userIndex].profileImage = tempProfileImageData; 
        
        users[userIndex].avatarStyle = {
            zoom: currentZoom,
            left: currentLeft,
            top: currentTop
        };
        
        saveUserData(); 
        
        const cropModalEl = document.getElementById('cropModal');
        const modal = bootstrap.Modal.getInstance(cropModalEl);
        if(modal) modal.hide();
        
        alert("Profil fotoğrafınız başarıyla güncellendi ve kırpılmış görünümü kaydedildi! Sayfa yenileniyor..."); 
        tempProfileImageData = null; 
        
        window.location.reload(); 
    }
}

window.triggerProfileImageUpload = function() {
    const input = document.getElementById('profileImageInput');
    if(input) input.click();
}

function updateCropZoom() {
    const zoomSlider = document.getElementById('zoomSlider');
    const cropImagePreview = document.getElementById('cropImagePreview');
    
    if (zoomSlider && cropImagePreview) {
        const zoomValue = zoomSlider.value;
        cropImagePreview.style.width = `${zoomValue}%`;
        cropImagePreview.style.height = `${zoomValue}%`;
        
        cropImagePreview.style.top = '0px';
        cropImagePreview.style.left = '0px';
    }
}

function setupImageDragSim() {
    const cropArea = document.getElementById('cropAreaContainer');
    const image = document.getElementById('cropImagePreview');
    if (!cropArea || !image) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    image.style.position = 'absolute';
    image.style.top = '0px';
    image.style.left = '0px';
    image.style.cursor = 'grab'; 

    image.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(image.style.left) || 0;
        startTop = parseInt(image.style.top) || 0;
        image.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        const containerWidth = cropArea.offsetWidth;
        const containerHeight = cropArea.offsetHeight;
        const imageWidth = image.offsetWidth;
        const imageHeight = image.offsetHeight;

        const maxLeft = 0;
        const minLeft = containerWidth - imageWidth;
        
        const maxTop = 0;
        const minTop = containerHeight - imageHeight;
        
        newLeft = Math.min(maxLeft, Math.max(minLeft, newLeft));
        newTop = Math.min(maxTop, Math.max(minTop, newTop));

        image.style.left = `${newLeft}px`;
        image.style.top = `${newTop}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            image.style.cursor = 'grab';
        }
    });
    
    image.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startLeft = parseInt(image.style.left) || 0;
        startTop = parseInt(image.style.top) || 0;
    });

    image.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        image.style.left = `${newLeft}px`;
        image.style.top = `${newTop}px`;
        
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startLeft = newLeft;
        startTop = newTop;
    });

    image.addEventListener('touchend', () => {
        isDragging = false;
    });
}


// ----------------------------------------------------
// 6. ARKADAŞLIK VE TAKİP SİSTEMİ
// ----------------------------------------------------

window.openFriendsModal = function() {
    closeAllModals(['friendsModal']);
    
    const modalEl = document.getElementById('friendsModal');
    if (!modalEl) return;
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    renderSuggestedUsers(document.getElementById('suggestedUsersList'));
    
    document.getElementById('searchResultsArea').style.display = 'none';
    document.getElementById('userSearchInput').value = '';
}

window.toggleFollow = function(targetUserId) {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUserIndex = users.findIndex(u => u.name === currentUserName);
    const targetUserIndex = users.findIndex(u => u.id === targetUserId);

    if (currentUserIndex === -1 || targetUserIndex === -1) return;

    const targetUser = users[targetUserIndex];
    const currentUser = users[currentUserIndex];

    // KRİTİK KONTROL: Aksiyon yapabilir mi?
    if (!canUserPerformActions(currentUser)) {
        alert("Takip işlemi başarısız: Hesap kısıtlı durumda. Lütfen Admin onayını tamamlayın.");
        return;
    }
    
    if (!currentUser.following) currentUser.following = [];
    if (!targetUser.followers) targetUser.followers = [];
    if (!targetUser.pendingFollowers) targetUser.pendingFollowers = []; 

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
        currentUser.following = currentUser.following.filter(id => id !== targetUserId);
        targetUser.followers = targetUser.followers.filter(id => id !== currentUser.id);
        alert(`${targetUser.name} takipten bırakıldı.`);
    } else {
        if (targetUser.isPrivate) {
            if (!targetUser.pendingFollowers.includes(currentUser.id)) {
                 targetUser.pendingFollowers.push(currentUser.id);
                 alert(`${targetUser.name} gizli bir hesap. Takip isteğiniz gönderildi.`);
            } else {
                 alert("Takip isteğiniz zaten beklemede.");
            }
        } else {
            currentUser.following.push(targetUserId);
            targetUser.followers.push(currentUser.id);
            alert(`${targetUser.name} takip edildi!`);
        }
    }

    checkAchievements(currentUser, 'following');
    checkAchievements(targetUser, 'followers');

    saveUserData();
    refreshAllUI();
}

window.handleFollowRequest = function(requesterId, accept) {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUserIndex = users.findIndex(u => u.name === currentUserName);
    const requesterUserIndex = users.findIndex(u => u.id === requesterId);

    if (currentUserIndex === -1 || requesterUserIndex === -1) return;

    const requesterUser = users[requesterUserIndex];
    const currentUser = users[currentUserIndex];
    
    currentUser.pendingFollowers = currentUser.pendingFollowers.filter(id => id !== requesterId);
    
    if (accept) {
        if (!currentUser.followers.includes(requesterId)) currentUser.followers.push(requesterId);
        if (!requesterUser.following.includes(currentUser.id)) requesterUser.following.push(currentUser.id);
        alert(`${requesterUser.name} takip isteğini kabul ettiniz.`);

        checkAchievements(currentUser, 'followers');
        checkAchievements(requesterUser, 'following');
        
    } else {
         alert(`${requesterUser.name} takip isteğini reddettiniz.`);
    }

    saveUserData();
    refreshAllUI();
}


window.searchUsers = function() {
    const query = document.getElementById('userSearchInput').value.toLowerCase();
    const resultsArea = document.getElementById('searchResultsArea');
    const resultsList = document.getElementById('searchResultsList');
    
    if (query.length < 2) { 
        resultsArea.style.display = 'none'; 
        return; 
    }

    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUser = users.find(u => u.name === currentUserName);
    const foundUsers = users.filter(u => u.name.toLowerCase().includes(query) && u.name !== currentUserName);
    
    resultsList.innerHTML = '';
    
    if (foundUsers.length === 0) {
        resultsList.innerHTML = '<div class="list-group-item text-muted">Kullanıcı bulunamadı.</div>';
    } else {
        foundUsers.forEach(user => {
            const isFollowing = currentUser.following && currentUser.following.includes(user.id);
            const isPending = user.pendingFollowers && user.pendingFollowers.includes(currentUser.id); 

            let btnHtml = '';
            if (isFollowing) {
                 btnHtml = `<button class="btn btn-sm btn-outline-danger" onclick="toggleFollow(${user.id})">Takipten Bırak</button>`;
            } else if (isPending) {
                 btnHtml = `<button class="btn btn-sm btn-secondary" disabled>İstek Bekleniyor</button>`;
            } else {
                 btnHtml = `<button class="btn btn-sm btn-primary" onclick="toggleFollow(${user.id})">Takip Et</button>`;
            }


            resultsList.innerHTML += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center" onclick="viewUserProfile('${user.name}')" style="cursor:pointer;">
                        <img src="${getUserAvatar(user.name)}" class="rounded-circle me-2" style="width:40px; height:40px; object-fit:cover;">
                        <div>
                            <strong>${user.name}</strong><br>
                            <small class="text-muted">${ROLE_NAMES[user.role]}</small>
                        </div>
                    </div>
                    <div>${btnHtml}</div>
                </div>`;
        });
    }
    resultsArea.style.display = 'block';
}

window.renderSuggestedUsers = function(listContainer, isListGroup = false) {
    if(!listContainer) return;
    
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUser = users.find(u => u.name === currentUserName);
    
    const suggestions = users.filter(u => u.name !== currentUserName && (!currentUser.following || !currentUser.following.includes(u.id))).slice(0, 6);

    let html = '';
    suggestions.forEach(user => {
        const isPending = user.pendingFollowers && user.pendingFollowers.includes(currentUser.id);
        const btnText = isPending ? 'İstek Bekleniyor' : 'Takip Et';
        const btnClass = isPending ? 'btn-secondary disabled' : 'btn-primary';

        if (isListGroup) {
            html += `
            <div class="list-group-item d-flex justify-content-between align-items-center p-2 border-0">
                <div class="d-flex align-items-center" onclick="viewUserProfile('${user.name}')" style="cursor:pointer;">
                    <img src="${getUserAvatar(user.name)}" class="rounded-circle me-2" style="width:40px; height:40px; object-fit:cover;">
                    <div>
                        <small class="fw-bold d-block">${user.name}</small>
                        <small class="text-muted" style="font-size:10px;">${ROLE_NAMES[user.role]}</small>
                    </div>
                </div>
                <button class="btn btn-sm ${btnClass} py-0 px-2" onclick="toggleFollow(${user.id})">${btnText}</button>
            </div>`;
        } else {
            html += `
            <div class="col-md-6">
                <div class="card mb-2 p-2 shadow-sm">
                    <div class="d-flex align-items-center">
                        <img src="${getUserAvatar(user.name)}" class="rounded-circle me-2" style="width:40px; height:40px; object-fit:cover; cursor:pointer;" onclick="viewUserProfile('${user.name}')">
                        <div class="flex-grow-1" onclick="viewUserProfile('${user.name}')" style="cursor:pointer">
                            <small class="fw-bold d-block">${user.name}</small>
                            <small class="text-muted" style="font-size:10px;">${ROLE_NAMES[user.role]}</small>
                        </div>
                        <button class="btn btn-sm ${btnClass} py-0" onclick="toggleFollow(${user.id})">${btnText}</button>
                    </div>
                </div>
            </div>`;
        }
    });
    
    if (suggestions.length === 0) {
        if (isListGroup) {
             html = '<div class="list-group-item text-center text-muted small p-3">Önerilecek yeni kimse kalmadı!</div>';
        } else {
             html = '<div class="col-12 text-center text-muted">Önerilecek yeni kimse kalmadı!</div>';
        }
    }
    
    listContainer.innerHTML = html;
}

window.renderRightSidebarRequests = function() {
    const container = document.getElementById('friendRequests');
    if (!container) return; 

    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUser = users.find(u => u.name === currentUserName);
    if (!currentUser) return;

    const pendingIds = currentUser.pendingFollowers || [];
    let html = '';

    if (pendingIds.length === 0) {
        html = `<div class="card p-3 text-center text-muted"><small>Bekleyen isteğiniz yok.</small></div>`;
    } else {
        pendingIds.forEach(id => {
            const requester = users.find(u => u.id === id);
            if (requester) {
                html += `
                <div class="card p-2 mb-2 shadow-sm border-0">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center" onclick="viewUserProfile('${requester.name}')" style="cursor:pointer">
                            <img src="${getUserAvatar(requester.name)}" class="rounded-circle me-2 border" width="40" height="40" style="object-fit:cover;">
                            <div style="line-height: 1.2;">
                                <h6 class="mb-0 small fw-bold text-dark">${requester.name}</h6>
                                <span class="text-muted" style="font-size: 10px;">İstek Gönderdi</span>
                            </div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-success py-0 px-2 me-1" onclick="handleFollowRequest(${requester.id}, true)" title="Kabul Et"><i class="fas fa-check"></i></button>
                            <button class="btn btn-sm btn-danger py-0 px-2" onclick="handleFollowRequest(${requester.id}, false)" title="Reddet"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                </div>`;
            }
        });
    }
    container.innerHTML = html;
}

window.removeFollower = function(targetUserId) {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUserIndex = users.findIndex(u => u.name === currentUserName);
    const targetUserIndex = users.findIndex(u => u.id === targetUserId);

    if (currentUserIndex === -1 || targetUserIndex === -1) return;

    users[currentUserIndex].followers = users[currentUserIndex].followers.filter(id => id !== targetUserId);
    users[targetUserIndex].following = users[targetUserIndex].following.filter(id => id !== users[currentUserIndex].id);

    alert(`${users[targetUserIndex].name} takipçilerinizden çıkarıldı.`);
    saveUserData();
    refreshAllUI();
    showFollowList('followers');
}

window.showFollowList = function(type) {
    closeAllModals(['userListModal']);

    const modalEl = document.getElementById('userListModal');
    if (!modalEl) return;

    const modalTitle = document.getElementById('userListModalTitle');
    const listContent = document.getElementById('userListContent');
    
    const viewTargetName = sessionStorage.getItem('VIEW_PROFILE_TARGET') || sessionStorage.getItem('CURRENT_USER_NAME');
    const profileUser = users.find(u => u.name === viewTargetName);
    const loggedInName = sessionStorage.getItem('CURRENT_USER_NAME');
    const isMe = (viewTargetName === loggedInName);

    if (!profileUser) return;
    
    listContent.innerHTML = '';
    let listIds = [];
    
    if (type === 'followers') {
        modalTitle.textContent = `${profileUser.name} Takipçileri`;
        listIds = profileUser.followers || [];
    } else if (type === 'following') {
        modalTitle.textContent = `${profileUser.name}'nin Takip Ettikleri`;
        listIds = profileUser.following || [];
    } else if (type === 'pending' && isMe) {
        modalTitle.textContent = `Bekleyen Takip İstekleri`;
        listIds = profileUser.pendingFollowers || [];
    }

    if (listIds.length === 0) {
        listContent.innerHTML = '<div class="text-center p-3 text-muted">Liste boş.</div>';
    } else {
        listIds.forEach(userId => {
            const user = users.find(u => u.id === userId);
            
            if (user) {
                let actionBtn = '';
                
                if (type === 'followers' && isMe) {
                    actionBtn = `<button class="btn btn-sm btn-outline-danger" onclick="removeFollower(${user.id})">Çıkar</button>`;
                } else if (type === 'following' && isMe) {
                    actionBtn = `<button class="btn btn-sm btn-outline-danger" onclick="toggleFollow(${user.id})">Bırak</button>`;
                } else if (type === 'pending' && isMe) {
                    actionBtn = `
                        <button class="btn btn-sm btn-success me-1" onclick="handleFollowRequest(${user.id}, true)">Kabul</button>
                        <button class="btn btn-sm btn-danger" onclick="handleFollowRequest(${user.id}, false)">Reddet</button>
                    `;
                }

                listContent.innerHTML += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center" onclick="viewUserProfile('${user.name}')" style="cursor:pointer;">
                            <img src="${getUserAvatar(user.name)}" class="rounded-circle me-2" style="width:40px; height:40px; object-fit:cover;">
                            <strong>${user.name}</strong>
                        </div>
                        <div>${actionBtn}</div>
                    </div>`;
            }
        });
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function refreshAllUI() {
    if (typeof window.refreshAllData === 'function') {
         window.refreshAllData(); 
    }

    if (document.getElementById('profileHeader')) renderUserProfile(); 
    
    if (document.getElementById('postFeed')) renderFeed();
    if (document.getElementById('storyFeed')) renderStories();
    
    if (document.getElementById('suggestedUsersList')) renderSuggestedUsers(document.getElementById('suggestedUsersList'));
    
    loadSidebarAvatar();
    
    if (document.getElementById('suggestedUsersListDesktop')) renderSuggestedUsers(document.getElementById('suggestedUsersListDesktop'), true);
    if (document.getElementById('suggestedUsersListMobile')) renderSuggestedUsers(document.getElementById('suggestedUsersListMobile'));
    if (document.getElementById('friendRequests')) renderRightSidebarRequests();

}

// ----------------------------------------------------
// 7. GÖNDERİ (POST) İŞLEMLERİ (Kısıtlama Eklenmiş)
// ----------------------------------------------------

window.addPostFromSocialMedia = function(userName, content) {
    const user = users.find(u => u.name === userName);
    
    // KRİTİK KONTROL: Aksiyon yapabilir mi?
    if (!canUserPerformActions(user)) {
        alert("Gönderi atılamadı: Hesap kısıtlı durumda. Lütfen Admin onayını tamamlayın.");
        return;
    }
    
    const newId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 101;
    const userRole = sessionStorage.getItem('CURRENT_USER_ROLE');
    
    const postStatus = STAFF_ROLES.includes(userRole) ? 'active' : 'pending';
    
    const filteredContent = filterBlacklistedWords(content);
    
    const newPost = { 
        id: newId, 
        user: userName, 
        content: filteredContent, 
        likes: 0, 
        likedBy: [], 
        comments: 0, 
        commentsData: [], 
        status: postStatus, 
        timestamp: Date.now() 
    };
    posts.push(newPost);
    
    const userObj = users.find(u => u.name === userName);
    if(userObj && typeof checkAchievements !== 'undefined') checkAchievements(userObj, 'posts');

    savePostData();
    
    if (typeof window.renderModerationLogs === 'function') {
        if (postStatus === 'active') {
             moderationLogs.push(`[OTOMATİK ONAY] ${ROLE_NAMES[userRole]} ${userName} tarafından gönderi #${newId} anında yayınlandı.`);
        }
        saveModerationLogs();
        window.renderModerationLogs();
    }
    
    const isStaff = STAFF_ROLES.includes(userRole);
    const successMessage = isStaff 
        ? '✅ Gönderiniz anında yayınlandı! Akış güncelleniyor...' 
        : '⏳ Gönderiniz başarıyla oluşturuldu, Yönetici onayı bekleniyor. Akış güncelleniyor...';
    
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success mt-3 shadow';
    successAlert.style.position = 'fixed';
    successAlert.style.top = '10px';
    successAlert.style.left = '50%';
    successAlert.style.transform = 'translateX(-50%)';
    successAlert.style.zIndex = '9999';
    successAlert.textContent = successMessage;
    
    document.body.prepend(successAlert);
    setTimeout(() => {
        successAlert.remove();
        refreshAllUI(); 
    }, 1500); 
}

window.logReport = function(reportingUser, postId, reason) {
    const targetPost = posts.find(p => p.id === postId);
    if (targetPost) {
        const newReport = {
            reportId: reports.length > 0 ? Math.max(...reports.map(r => r.reportId || 0)) + 1 : 100, 
            type: 'post_complaint', 
            targetId: postId, 
            targetName: targetPost.user,
            reportedBy: reportingUser, 
            contentPreview: filterBlacklistedWords(targetPost.content), 
            reason: reason, 
            isResolved: false
        };
        reports.push(newReport); 
        saveReportData();

        // Admin Panel bildirimlerini manuel olarak yenile (Eğer admin.js yüklenmişse)
        if (typeof window.updateNotifications === 'function') {
             window.updateNotifications();
        }
    }
}

window.deleteOwnPost = function(postId) {
    if(confirm("Gönderiyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
        const postIndex = posts.findIndex(p => p.id === postId);
        if(postIndex !== -1) { 
            posts.splice(postIndex, 1); 
            savePostData(); 
            renderUserProfile(); 
            const user = users.find(u => u.name === sessionStorage.getItem('CURRENT_USER_NAME'));
            if(user && typeof checkAchievements !== 'undefined') checkAchievements(user, 'posts');
        }
    }
}

window.archiveOwnPost = function(postId) {
    const post = posts.find(p => p.id === postId);
    if(!post || post.user !== sessionStorage.getItem('CURRENT_USER_NAME')) return;
    
    if(confirm("Bu gönderiyi arşivlemek istediğinizden emin misiniz? Akıştan kaldırılacaktır.")) {
        post.status = 'archived'; 
        savePostData(); 
        renderUserProfile(); 
        alert("Gönderi başarıyla arşive taşındı.");
    }
}


window.editOwnPost = function(postId) {
    const post = posts.find(p => p.id === postId);
    if(!post) return;
    
    const newContent = prompt("Düzenle:", post.content);
    if(newContent !== null && newContent.trim() !== "") {
        const filteredContent = filterBlacklistedWords(newContent.trim());
        post.content = filteredContent; 
        
        const userRole = sessionStorage.getItem('CURRENT_USER_ROLE');
        const STAFF_ROLES = ['super_admin', 'admin', 'moderator', 'manager', 'expert'];
        post.status = STAFF_ROLES.includes(userRole) ? 'active' : 'pending';
        
        savePostData(); 
        renderUserProfile(); 
        alert(`Düzenlendi, gönderi durumu: ${post.status === 'active' ? 'YAYINDA' : 'onay bekleniyor'}.`);
    }
}

window.dismissNotification = function(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) { 
        post.notificationDismissed = true; 
        savePostData(); 
        renderUserProfile(); 
    }
}

window.likePost = function(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUser = users.find(u => u.name === currentUserName);

    if (!currentUserName) { window.location.href = 'login.html'; return; }
    
    if (!canUserPerformActions(currentUser)) {
        alert("Beğeni yapılamadı: Hesap kısıtlı durumda.");
        return;
    }
    
    if (!post.likedBy) post.likedBy = [];
    const userIndex = post.likedBy.indexOf(currentUserName);
    
    if (userIndex === -1) {
        post.likedBy.push(currentUserName);
        post.likes = (post.likes || 0) + 1;
    } else {
        post.likedBy.splice(userIndex, 1);
        post.likes = (post.likes || 0) - 1;
    }
    
    savePostData();
    renderFeed();
}

window.addCommentToPost = function(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUser = users.find(u => u.name === currentUserName);

    if (!currentUserName) { window.location.href = 'login.html'; return; }

    if (!canUserPerformActions(currentUser)) {
        alert("Yorum yapılamadı: Hesap kısıtlı durumda.");
        return;
    }
    
    const commentText = prompt("Yorumunuzu girin:");
    
    if (commentText && commentText.trim().length > 0) {
        if (!post.commentsData) post.commentsData = [];
        
        const filteredCommentText = filterBlacklistedWords(commentText.trim());
        
        const newComment = {
            id: Date.now(),
            userName: currentUserName,
            text: filteredCommentText, 
            timestamp: Date.now()
        };
        
        post.commentsData.push(newComment);
        post.comments = (post.comments || 0) + 1;
        
        savePostData();
        renderFeed(); 
        alert("Yorumunuz başarıyla eklendi.");
    }
}

window.renderFeed = function() {
    const postFeed = document.getElementById('postFeed');
    if (!postFeed) return;
    
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUser = users.find(u => u.name === currentUserName);
    const currentPosts = posts || []; 
    const isStaff = isCurrentUserStaff(); 
    
    if (!currentUser) {
        postFeed.innerHTML = '<div class="alert alert-danger text-center">Kullanıcı verisi bulunamadı. Lütfen tekrar giriş yapın.</div>';
        return;
    }

    const canAct = canUserPerformActions(currentUser);
    const isPending = currentUser.status === 'pending';
    const isNotice = currentUser.status === 'pending_approval_notice';

    // 1. POST OLUŞTURMA FORMUNU KISITLA
    const newPostForm = document.getElementById('newPostForm');
    const postContentInput = document.getElementById('postContentInput');
    const postSubmitBtn = newPostForm ? newPostForm.querySelector('button[type="submit"]') : null;
    
    if (postContentInput && postSubmitBtn) {
        postContentInput.disabled = !canAct;
        postSubmitBtn.disabled = !canAct;
        postContentInput.placeholder = !canAct 
            ? '❌ İşlem kısıtlı. Lütfen Admin onayını bekleyin veya bildirimi tamamlayın.' 
            : 'Aklınızdan ne geçiyor, Yazın...';
    }


    // 2. YENİ BİLDİRİM KISIMLARI
    let topNoticeHtml = '';
    if (isPending && currentUser.showPendingWarning) {
        topNoticeHtml = `<div class="alert alert-warning text-center mt-3 fw-bold">
            <i class="fas fa-clock me-2"></i> Hesabınız **ONAY BEKLİYOR**. Yönetici, bilgilerinizi kontrol edip en kısa sürede (yaklaşık 5 dk içinde) onaylayacaktır. Şu an aksiyon yapamazsınız.
        </div>`;
    } else if (isNotice) {
        topNoticeHtml = `<div class="alert alert-success text-center mt-3 fw-bold" style="cursor:pointer;" onclick="completeApprovalAndLogout('${currentUserName}')">
            <i class="fas fa-check-circle me-2"></i> HARİKA! Hesabınız **ONAYLANDI**! İzinlerinizi açmak için **BU MESAJI TIKLAYIN** ve tekrar giriş yapın.
        </div>`;
    }

    // 3. POSTLARI RENDER ET
    const feedHtml = currentPosts.slice().reverse().map(post => {
        let shouldShow = false;
        const postOwner = users.find(u => u.name === post.user);
        const postOwnerId = postOwner ? postOwner.id : null;
        
        const userDisplay = isStaff && postOwnerId ? `${post.user} (ID: ${postOwnerId})` : post.user;

        const amIFollowing = currentUser?.following?.includes(postOwner?.id);
        const isMyPost = post.user === currentUserName;
        
        if (!post.likedBy) post.likedBy = [];
        const isLiked = post.likedBy.includes(currentUserName);
        const likeIconClass = isLiked ? 'fas fa-thumbs-up' : 'far fa-thumbs-up';
        const likeButtonClass = isLiked ? 'text-primary' : 'text-muted';
        
        const commentsData = post.commentsData || [];
        const commentCount = commentsData.length;

        if (post.status === 'archived' || post.status === 'deleted') {
            shouldShow = isStaff; 
        } else {
             if (isStaff || post.status === 'active') { shouldShow = true; } 
             else if (post.status === 'followers_only') { 
                 if (isMyPost || amIFollowing) shouldShow = true; 
             }
        }
        
        if (shouldShow) {
            const postUserAvatar = getUserAvatar(post.user);
            let privacyIcon = '';
            if (post.status === 'followers_only') privacyIcon = '<i class="fas fa-user-friends text-primary ms-2" title="Sadece Takipçiler"></i>';
            else if (post.status === 'archived') privacyIcon = '<i class="fas fa-archive text-warning ms-2" title="Arşivlenmiş İçerik"></i>';
            else if (isStaff && post.status !== 'active') privacyIcon = '<i class="fas fa-shield-alt text-danger ms-2" title="Yetkili Görünümü"></i>';
            else if (post.status === 'pending') privacyIcon = '<i class="fas fa-clock text-warning ms-2" title="Onay Bekliyor"></i>';

            const filteredContent = filterBlacklistedWords(post.content);

            let latestCommentHtml = '';
            if (commentCount > 0) {
                const latestComment = commentsData[commentsData.length - 1]; 
                const filteredCommentText = filterBlacklistedWords(latestComment.text);
                
                latestCommentHtml = `
                    <div class="p-3 pt-0 border-top">
                        <small class="text-muted fw-bold">Son Yorum:</small>
                        <div class="d-flex align-items-start mt-1 small">
                            <img src="${getUserAvatar(latestComment.userName)}" class="rounded-circle me-2" width="25" height="25" onerror="imgError(this)">
                            <div>
                                <strong class="text-dark">${latestComment.userName}:</strong> 
                                ${filteredCommentText.substring(0, 50)}${filteredCommentText.length > 50 ? '...' : ''}
                            </div>
                        </div>
                    </div>`;
            }
            
            // LİKE VE YORUM BUTONLARINI KISITLAMA
            const likeButtonHtml = `<button class="btn btn-sm btn-link text-decoration-none ${likeButtonClass}" onclick="${canAct ? `likePost(${post.id})` : `alert('İşlem kısıtlı: Hesap onay bekliyor!')`}"><i class="${likeIconClass}"></i> Beğen (${post.likes || 0})</button>`;
            const commentButtonHtml = `<button class="btn btn-sm btn-link text-decoration-none text-muted" onclick="${canAct ? `addCommentToPost(${post.id})` : `alert('İşlem kısıtlı: Hesap onay bekliyor!')`}"><i class="far fa-comment"></i> Yorum (${commentCount})</button>`;

            return `
            <div class="card post-card mb-4 shadow-sm">
                <div class="card-header d-flex align-items-center bg-white border-bottom-0 pt-3">
                    <img class="avatar-sm me-3" src="${postUserAvatar}" onerror="imgError(this)" style="width:40px; height:40px; border-radius:50%; object-fit:cover; cursor:pointer;" onclick="viewUserProfile('${post.user}')">
                    <div onclick="viewUserProfile('${post.user}')" style="cursor:pointer;">
                        <h6 class="mb-0 fw-bold">${userDisplay} ${privacyIcon}</h6>
                        <small class="text-muted">${formatPostDate(post.timestamp)}</small>
                    </div>
                    <button class="btn btn-sm btn-light ms-auto" onclick="reportPost(${post.id})"><i class="fas fa-flag text-danger"></i></button>
                </div>
                <div class="card-body"><p class="card-text">${filteredContent}</p></div>
                <div class="card-footer bg-white border-top-0 d-flex justify-content-between">
                    ${likeButtonHtml}
                    ${commentButtonHtml}
                    <button class="btn btn-sm btn-link text-decoration-none text-muted"><i class="fas fa-share"></i> Paylaş</button>
                </div>
                ${latestCommentHtml}
            </div>`;
        }
        return '';
    }).join('');
    
    // 4. TÜM İÇERİĞİ GÖSTER
    postFeed.innerHTML = topNoticeHtml + (feedHtml || '<div class="alert alert-info text-center">Görüntülenecek gönderi yok. Arkadaş ekleyerek akışınızı canlandırın!</div>');

}
window.renderFeed = renderFeed;

window.renderUserProfile = function() {
    const profileHeader = document.getElementById('profileHeader');
    if (!profileHeader) {
        return; 
    }
    
    const viewTargetName = sessionStorage.getItem('VIEW_PROFILE_TARGET');
    const loggedInName = sessionStorage.getItem('CURRENT_USER_NAME');
    const profileUserName = viewTargetName || loggedInName;
    
    const profileUser = users.find(u => u.name === profileUserName);
    const loggedInUser = users.find(u => u.name === loggedInName);
    const isStaff = isCurrentUserStaff();
    const isMe = (profileUserName === loggedInName);
    const canAct = canUserPerformActions(profileUser); // Kendi profilindeki aksiyonlar için kontrol

    if (profileUser) {
        const avatarUrl = getUserAvatar(profileUser.name);
        const sidebarAvatar = document.getElementById('sidebarUserAvatar');
        if (sidebarAvatar && loggedInUser) sidebarAvatar.src = getUserAvatar(loggedInUser.name);
        
        const avatarStyle = profileUser.avatarStyle || { zoom: 100, left: '0px', top: '0px' };
        const avatarZoom = avatarStyle.zoom || 100;
        const avatarLeft = avatarStyle.left || '0px';
        const avatarTop = avatarStyle.top || '0px';
        
        const avatarCustomStyle = `width:${avatarZoom}%; height:${avatarZoom}%; object-fit:cover; position:absolute; top:${avatarTop}; left:${avatarLeft};`;

        
        if (profileHeader) {
            let badgeHtml = '';
            if (profileUser.badges) {
                if (profileUser.badges.black) badgeHtml += `<i class="fas fa-shield-alt text-dark ms-2" style="cursor:pointer;" onclick="alert('⚫ SİYAH TİK: MOD/YETKİLİ (KALKAN)')" title="MOD/YETKİLİ"></i>`;
                if (profileUser.badges.blue) badgeHtml += `<i class="fas fa-check-circle text-primary ms-2" style="cursor:pointer;" onclick="alert('🔵 MAVİ TİK: ONAYLI HESAP')" title="Onaylı Hesap"></i>`;
                if (profileUser.badges.red) badgeHtml += `<i class="fas fa-fire text-danger ms-2" style="cursor:pointer;" onclick="alert('🔥 KIRMIZI TİK: YÜKSEK AKTİVİTE\\n\\nBu kullanıcı son 7 gün içinde sitede çok aktif olmuştur.')"></i>`;
                if (profileUser.badges.tech) badgeHtml += `<i class="fas fa-code text-success ms-2" style="cursor:pointer;" onclick="alert('🟢 TEKNİSYEN TİKİ: Yazılımcı/Geliştirici ekibine aittir.')"></i>`;
                if (profileUser.badges.vip) badgeHtml += `<i class="fas fa-star text-warning ms-2" style="cursor:pointer;" onclick="alert('⭐ VIP TİKİ: Platforma destek çıkan özel kullanıcılara verilir.')"></i>`;
            }

            if (profileUser.role === 'manager' || profileUser.role === 'expert') {
                 badgeHtml += `<i class="fas fa-user-tie text-info ms-2" style="cursor:pointer;" onclick="alert('👔 SORUMLU TİKİ: Belirli bir alanda sorumluluğu olan yetkili.')"></i>`;
            }

            if(typeof renderDisplayedAchievements === 'function') {
                 badgeHtml += renderDisplayedAchievements(profileUser, 3);
            }


            const privacyIcon = profileUser.isPrivate ? '<i class="fas fa-lock ms-2 text-muted" title="Gizli Hesap"></i>' : '';
            const staffBadge = (isMe && isStaff) ? '<span class="badge bg-danger ms-2">Yetkili Modu</span>' : ''; 
            
            let actionButtons = '';
            
            if (isMe) {
                 actionButtons = `<button class="btn btn-outline-secondary btn-sm me-2" onclick="window.location.href='settings.html'"><i class="fas fa-cog"></i> Ayarlara Git</button>
                                  <button class="btn btn-sm ${profileUser.isPrivate ? 'btn-dark' : 'btn-light'}" onclick="togglePrivacy()">${profileUser.isPrivate ? '<i class="fas fa-lock-open"></i> Hesabı Aç' : '<i class="fas fa-lock"></i> Hesabı Gizle'}</button>`;
            } else {
                const isFollowing = loggedInUser?.following?.includes(profileUser.id);
                const isPending = profileUser.isPrivate && profileUser.pendingFollowers?.includes(loggedInUser?.id);
                
                if (isFollowing) {
                     actionButtons = `<button class="btn btn-outline-danger btn-sm" onclick="${canAct ? `toggleFollow(${profileUser.id})` : `alert('Kısıtlı hesap!')`}"><i class="fas fa-user-minus"></i> Takipten Bırak</button>`;
                } else if (isPending) {
                     actionButtons = `<button class="btn btn-secondary btn-sm" disabled><i class="fas fa-clock"></i> İstek Gönderildi</button>`;
                } else {
                     actionButtons = `<button class="btn btn-primary btn-sm" onclick="${canAct ? `toggleFollow(${profileUser.id})` : `alert('Kısıtlı hesap!')`}"><i class="fas fa-user-plus"></i> Takip Et</button>`;
                }
                 actionButtons += `<button class="btn btn-link btn-sm ms-2 text-decoration-none" onclick="goToMyProfile()">Profilime Dön</button>`;
            }

            let pendingRequestsHtml = '';
            if (isMe && profileUser.pendingFollowers?.length > 0) {
                 pendingRequestsHtml = `<span class="badge bg-danger ms-3" style="cursor:pointer;" onclick="showFollowList('pending')">
                                            ${profileUser.pendingFollowers.length} Yeni İstek
                                        </span>`;
            }

            const publicPostCount = posts.filter(p => p.user === profileUser.name && p.status !== 'deleted' && p.status !== 'archived').length;


            profileHeader.innerHTML = `<div class="row align-items-center"><div class="col-md-3 text-center">
                                            <div style="width:150px; height:150px; border-radius:50%; overflow:hidden; margin:0 auto;" class="img-thumbnail position-relative">
                                                <img src="${avatarUrl}" onerror="imgError(this)" 
                                                    style="${avatarCustomStyle}" 
                                                    ${isMe ? 'onclick="triggerProfileImageUpload()"' : ''}>
                                            </div>
                                            ${isMe ? '<p class="small text-muted mt-2">Fotoğrafı değiştirmek için tıklayın</p>' : ''}
                                       </div>
                                       <div class="col-md-9">
                                            <div class="d-flex align-items-center mb-3">
                                                <h3 class="mb-0 me-3">${profileUser.name} ${badgeHtml} ${privacyIcon} ${staffBadge}</h3>
                                                ${pendingRequestsHtml}
                                            </div>
                                            <div class="mb-3">${actionButtons}</div>
                                            <ul class="list-inline mb-3">
                                                <li class="list-inline-item me-4"><strong>${publicPostCount}</strong> Gönderi</li>
                                                <li class="list-inline-item me-4" style="cursor:pointer; color:#0d6efd;" onclick="showFollowList('followers')"><strong>${(profileUser.followers || []).length}</strong> Takipçi</li>
                                                <li class="list-inline-item" style="cursor:pointer; color:#0d6efd;" onclick="showFollowList('following')"><strong>${(profileUser.following || []).length}</strong> Takip</li>
                                            </ul>
                                            <div><p class="mb-0">${profileUser.bio || 'Henüz bir biyografi eklenmedi.'}</p></div>
                                       </div></div>`;
        } else {
             document.getElementById('profileHeader').innerHTML = '<div class="text-center p-5"><div class="alert alert-danger">Kullanıcı bulunamadı.</div></div>';
        }
        
        const profileContent = document.getElementById('profileContent');
        if (profileContent) {
            const activeTab = document.querySelector('.nav-tabs .nav-link.active')?.textContent.trim();
            
            let canViewContent = isMe || isStaff || !profileUser.isPrivate || (loggedInUser?.following?.includes(profileUser.id));
            if (!canViewContent) {
                 profileContent.innerHTML = `<div class="text-center py-5"><i class="fas fa-lock fa-3x text-muted mb-3"></i><h4>Bu Hesap Gizli</h4><p class="text-muted">Fotoğraflarını ve videolarını görmek için bu hesabı takip et.</p></div>`;
                 return;
            }
            
            const myPosts = posts.filter(p => p.user === profileUser.name && p.status !== 'deleted').reverse();
            
            if (activeTab === 'Gönderiler') {
                if (myPosts.length === 0) {
                    profileContent.innerHTML = `<div class="text-center py-5"><h4 class="mt-3">Henüz Gönderi Yok</h4></div>`;
                } else {
                    let postsGridHtml = '<div class="row g-3">';
                    myPosts.forEach(post => {
                        let statusLabel = '';
                        let cardBorderClass = '';
                        const commentCount = post.commentsData ? post.commentsData.length : (post.comments || 0);
                        
                        if (isMe || isStaff) {
                            if (post.status === 'pending') statusLabel = '<div class="bg-warning text-dark py-1 px-2 small text-center w-100">Onay Bekliyor</div>';
                            else if (post.status === 'rejected') { cardBorderClass = 'border-danger border-2'; statusLabel = `<div class="bg-danger text-white py-1 px-2 small text-center w-100">REDDEDİLDİ: ${post.rejectionReason}</div>`; }
                            else if (post.status === 'followers_only') { statusLabel = (isMe && !post.notificationDismissed) ? `<div class="bg-info text-white py-1 px-2 small d-flex justify-content-between"><span>Takipçilere Özel</span><button class="btn p-0 text-white" onclick="dismissNotification(${post.id})">X</button></div>` : '<div class="text-primary small text-center w-100">Takipçilere Özel</div>'; }
                            else if (post.status === 'archived') { statusLabel = `<div class="bg-secondary text-white py-1 px-2 small text-center w-100"><i class="fas fa-archive"></i> Arşivlendi</div>`; }
                            
                            const filteredContent = filterBlacklistedWords(post.content);

                        }
                        
                        if (post.status !== 'archived' || isMe || isStaff) {
                            postsGridHtml += `<div class="col-md-4"><div class="card h-100 shadow-sm border-0 position-relative group-action-container ${cardBorderClass}">${statusLabel}<div class="card-body bg-light" style="min-height:120px;"><p class="small mb-2">${filterBlacklistedWords(post.content)}</p><div class="d-flex justify-content-between text-muted small mt-auto"><span><i class="fas fa-heart text-danger"></i> ${post.likes || 0}</span><span class="small text-muted" style="font-size:0.75rem;">${formatPostDate(post.timestamp)}</span><span><i class="fas fa-comment text-primary"></i> ${commentCount}</span></div></div>${isMe ? `<div class="card-footer bg-white p-1 d-flex justify-content-between"><button class="btn btn-sm btn-outline-secondary w-33 me-1" onclick="editOwnPost(${post.id})" title="Düzenle"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-outline-warning w-33 me-1" onclick="archiveOwnPost(${post.id})" title="Arşivle"><i class="fas fa-archive"></i></button><button class="btn btn-sm btn-outline-danger w-33" onclick="deleteOwnPost(${post.id})" title="Kalıcı Sil"><i class="fas fa-trash-alt"></i></button></div>` : ''}</div></div>`;
                        }
                    });
                    postsGridHtml += '</div>';
                    profileContent.innerHTML = postsGridHtml;
                }
            } else if (activeTab === 'Kaydedilenler') {
                 profileContent.innerHTML = `<div class="text-center py-5"><h4 class="mt-3">Kaydedilenler Listesi Boş</h4></div>`;
            }
        }
    }
}
window.renderUserProfile = renderUserProfile;


window.viewUserProfile = function(targetUserName) {
    const loggedInName = sessionStorage.getItem('CURRENT_USER_NAME');
    if (targetUserName === loggedInName) { sessionStorage.removeItem('VIEW_PROFILE_TARGET'); } 
    else { sessionStorage.setItem('VIEW_PROFILE_TARGET', targetUserName); }
    
    closeAllModals();
    
    if (!window.location.pathname.includes('profile.html')) { window.location.href = 'profile.html'; } 
    else { renderUserProfile(); }
}

window.goToMyProfile = function() {
    sessionStorage.removeItem('VIEW_PROFILE_TARGET');
    window.location.href = 'profile.html';
}

window.togglePrivacy = function() {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const userIndex = users.findIndex(u => u.name === currentUserName);
    if (userIndex !== -1) { users[userIndex].isPrivate = !users[userIndex].isPrivate; saveUserData(); renderUserProfile(); }
}

window.editProfile = function() {
    window.location.href = 'settings.html';
}

function trackUserActivity() {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    if (!currentUserName) return;

    setInterval(() => {
        const userIndex = users.findIndex(u => u.name === currentUserName);

        if (userIndex !== -1) {
            const user = users[userIndex];
            const now = new Date();
            const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
            const todayName = days[now.getDay()];

            if (!user.activityLogs) user.activityLogs = { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 };
            
            const lastReset = user.lastLogReset || 0;
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
            
            if (Date.now() - lastReset > oneWeekMs) {
                 user.activityLogs = { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 };
                 user.lastLogReset = Date.now();
            }

            if (!user.activityLogs[todayName]) user.activityLogs[todayName] += 1;

            users[userIndex] = user;
            saveUserData(); 
        }
    }, 60000); 
}