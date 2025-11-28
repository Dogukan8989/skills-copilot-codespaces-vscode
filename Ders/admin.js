// =======================================================
// admin.js: ANA YÖNETİM, NAVİGASYON VE PANEL MANTIĞI (SON GÜNCEL VERSİYON)
// =======================================================

// Bu dosya, data_store.js'ten gelen tüm global değişkenlere (users, posts, ROLE_NAMES, BLACKLISTED_WORDS vb.) erişir.

let chatInterval = null; // Sohbet yenileme intervali
// KRİTİK: Son görülen mesaj sayısını takip etmek için LocalStorage'dan çekiyoruz
let lastSeenChatMessageCount = parseInt(localStorage.getItem('LAST_SEEN_CHAT_COUNT')) || 0; 

// YENİ EKLEME: Hazır Ban/Uyarı Sebepleri (kullanici.js'ten de erişilebilir)
window.BAN_REASONS = [
    "Ağır küfür ve hakaret",
    "Spam ve reklam içeriği",
    "Kural ihlali ve taciz",
    "Yanlış bilgi yayma",
    "Telif hakkı ihlali"
];

// ----------------------------------------------------
// GÜVENLİK VE OTURUM VERİLERİ
// ----------------------------------------------------

// Güvenlik kontrolü (Sayfa ilk açıldığında çalışmalı)
(function() {
    const currentPage = window.location.pathname.split("/").pop(); 

    if (currentPage !== 'login.html' && currentPage !== 'register.html') {
        // BURADA CURRENT_USER_ROLE VE CURRENT_USER_NAME global değişkenlerini kullanıyoruz.
        if (!window.CURRENT_USER_ROLE || !window.CURRENT_USER_NAME) {
            window.location.href = 'login.html';
            throw new Error("Oturum bulunamadı.");
        }
        if (window.CURRENT_USER_ROLE === 'member' && (currentPage === 'index.html' || currentPage === '')) {
            window.location.href = 'social_media_main.html';
            throw new Error("Yetkisiz erişim.");
        }
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    // Tüm global verileri (Local Storage dahil) yükler
    if (typeof window.refreshAllData === 'function') {
         window.refreshAllData(); 
    }

    // 1. Sidebar ve Kullanıcı Bilgilerini Doldur
    const currentUser = users.find(u => u.name === CURRENT_USER_NAME);
    if(currentUser) {
        document.getElementById('mainUserName').textContent = currentUser.name;
        document.getElementById('userRoleBadge').textContent = ROLE_NAMES[currentUser.role] || 'Üye';
        document.getElementById('sidebarUserAvatar').src = currentUser.profileImage || "https://via.placeholder.com/60";
    }

    // 2. Yetkilendirme ve Navigasyon
    initializeNavigation();

    // 3. İlk Sayfayı Yükle (Dashboard)
    if (ACCESS_MATRIX['dashboard-page'].includes(CURRENT_USER_ROLE)) {
        navigateTo('dashboard-page');
    } else {
        const allowedPages = Object.keys(ACCESS_MATRIX).filter(page => ACCESS_MATRIX[page].includes(CURRENT_USER_ROLE));
        if (allowedPages.length > 0) {
            navigateTo(allowedPages[0]);
        } else {
            document.getElementById('pages-container').innerHTML = '<div class="alert alert-danger text-center">Bu panele erişim yetkiniz bulunmamaktadır.</div>';
        }
    }
    
    // 4. Genel Dashboard metriklerini hesapla ve göster
    updateDashboardMetrics();
    updateNotifications(); // İlk bildirimleri yükle

    // 5. Event Listener'ları kur
    // Bu listener'ların çoğu index.html içinde tanımlanmıştır.
    if (document.getElementById('postForm')) document.getElementById('postForm').addEventListener('submit', handlePostSubmit);
    if (document.getElementById('chatForm')) document.getElementById('chatForm').addEventListener('submit', handleChatSubmit);
    if (document.getElementById('userForm')) document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    if (document.getElementById('userSearch')) document.getElementById('userSearch').addEventListener('input', window.applyFilters);
    
    // YENİ KARA LİSTE FORMU BAĞLANTISI (admin_blacklist.js'ten gelmeli)
    if (document.getElementById('addBlacklistWordForm') && typeof addBlacklistedWord === 'function') {
         document.getElementById('addBlacklistWordForm').addEventListener('submit', addBlacklistedWord); 
    }
    
    // 6. Sohbet ve Bildirim Yenileme Döngüsü
    chatInterval = setInterval(() => {
        if(document.getElementById('team-chat-page')?.style.display === 'block') {
            renderChatMessages(false);
        }
        updateNotifications(); 
        updateDashboardMetrics(); 
        window.renderModerationLogs(); 
        if (document.getElementById('users-page')?.style.display === 'block') {
             renderUserTable(); 
        }
    }, 2000);

    // KRİTİK: Bildirim iznini bir kez sor (Kullanıcı izin verdiyse tekrar sormaz)
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
});


// ----------------------------------------------------
// CORE İŞLEMLER (NAVİGASYON & LOGOUT)
// ----------------------------------------------------

/**
 * **YENİ FONKSİYON:** Kullanıcıya geçici bir bildirim gösterir (Toast bildirimi).
 */
window.showAdminToast = function(message, type = 'success', duration = 3000) {
    let toastContainer = document.getElementById('adminToastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'adminToastContainer';
        // Basit stil (index.html'deki stil dosyasını kullanmadığı varsayarak)
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.role = 'alert';
    toast.style.maxWidth = '300px';
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
    
    toast.innerHTML = `<i class="${icon} me-2"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    
    toastContainer.prepend(toast); 

    setTimeout(() => {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(toast);
        bsAlert.close();
    }, duration);
}

/**
 * Logları temizler. Sadece Süper Admin yapabilir.
 */
window.clearModerationLogs = function() {
    if (CURRENT_USER_ROLE !== 'super_admin') {
        window.showAdminToast('⛔ Yetki Hatası: Bu işlemi sadece Baş Yönetici yapabilir.', 'danger', 5000);
        return;
    }
    
    if (confirm('TÜM moderasyon kayıtlarını SİLMEK istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        // LOGLARI TEMİZLE VE BAŞLANGIÇ SİSTEM LOGUNU YAZ
        window.moderationLogs = [`[SİSTEM] ${CURRENT_USER_NAME} tarafından tüm loglar temizlendi. (${new Date().toLocaleString()})`];
        
        // KRİTİK: KALICI KAYIT
        window.saveModerationLogs(); 
        
        window.renderModerationLogs();
        window.showAdminToast('✅ Tüm moderasyon kayıtları başarıyla temizlendi.', 'success');
    }
}


function logout() {
    // ÇIKIŞTA KULLANICI DURUMUNU 'offline' YAP (ÖNEMLİ!)
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUserIndex = users.findIndex(u => u.name === currentUserName);
    
    // SADECE GİRİŞ YAPMIŞ VE AKTİF DURUMDA OLAN KULLANICILARIN DURUMU OFFLINE ÇEKİLİR.
    if (currentUserIndex !== -1 && (users[currentUserIndex].status === 'active' || users[currentUserIndex].status === 'offline')) {
        users[currentUserIndex].status = 'offline';
        saveUserData();
    }
    
    const loginTime = parseInt(sessionStorage.getItem('LOGGED_IN_SESSION'));
    if (loginTime) { // Tüm yetkililer loglansın
        const durationMs = Date.now() - loginTime;
        const durationMinutes = Math.floor(durationMs / 60000);
        
        let durationText = "";
        if (durationMinutes >= 60) {
            const hours = Math.floor(durationMinutes / 60);
            const remainingMinutes = durationMinutes % 60;
            durationText = `${hours} saat ${remainingMinutes} dakika`;
        } else {
            durationText = `${durationMinutes} dakika`;
        }
        
        // KRİTİK LOG GÜNCELLEMESİ: Tarih ve süre detayı ekle
        moderationLogs.push(`[ÇIKIŞ/SÜRE] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME} panelden ayrıldı. Oturum Süresi: ${durationText}. (Giriş: ${new Date(loginTime).toLocaleString()})`);
        saveModerationLogs();
        renderModerationLogs();
    }
    
    sessionStorage.removeItem('CURRENT_USER_ROLE');
    sessionStorage.removeItem('CURRENT_USER_NAME');
    sessionStorage.removeItem('LOGGED_IN_SESSION');
    if (chatInterval) { clearInterval(chatInterval); chatInterval = null; }
    window.location.href = 'login.html';
}
window.logout = logout;

/**
 * YENİ EKLEME: Giriş işleminin Admin Panel Loguna Detaylı Yazılması
 */
function logAdminLogin(user, loginTime) {
    const roleName = ROLE_NAMES[user.role] || 'Yetkili';
    moderationLogs.push(`[GİRİŞ] ${roleName} ${user.name} yönetici paneline giriş yaptı. Giriş Saati: ${new Date(loginTime).toLocaleString()}`);
    saveModerationLogs();
}
window.logAdminLogin = logAdminLogin;

/**
 * Sidebar menülerini yetkiye göre ayarlar.
 */
function initializeNavigation() {
    const navLinks = document.querySelectorAll('#sidebar .nav-link');
    navLinks.forEach(link => {
        const pageId = link.getAttribute('data-page');
        
        // Kara Liste için özel yetkilendirme
        if (pageId === 'blacklist-page') {
             if (['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE)) {
                 link.style.display = 'flex'; 
             } else {
                 link.style.display = 'none';
                 return;
             }
        }
        
        if (ACCESS_MATRIX[pageId] && ACCESS_MATRIX[pageId].includes(CURRENT_USER_ROLE)) {
            link.style.display = 'flex'; // Göster
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(pageId);
            });
        } else if (pageId !== 'blacklist-page') { // Zaten yukarıda kontrol edildi
            link.style.display = 'none'; // Gizle
        }
    });
}

function navigateTo(pageId) {
    const allowedRoles = ACCESS_MATRIX[pageId];
    
    // Kara Liste için özel yetki kontrolü
    if (pageId === 'blacklist-page') {
        if (!['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE)) {
            alert('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
            return;
        }
    } else if (!allowedRoles || !allowedRoles.includes(CURRENT_USER_ROLE)) {
        alert('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
        return;
    }

    // Tüm sayfaları gizle
    document.querySelectorAll('#pages-container > main, #pages-container > div').forEach(page => {
        page.style.display = 'none';
    });

    // İstenen sayfayı göster
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        
        // Başlığı Güncelle
        const titleMap = {
            'dashboard-page': 'Genel Bakış',
            'users-page': 'Kullanıcı Yönetimi',
            'posts-page': 'Gönderi Yönetimi',
            'moderation-page': 'Şikayet ve Rapor Yönetimi',
            'logs-page': 'Moderasyon Logları',
            'team-chat-page': 'Ekip Sohbeti',
            'settings-page': 'Admin Ayarları',
            'achievements-page': 'Başarılar Yönetimi',
            'blacklist-page': 'Kara Liste Kelime Yönetimi' 
        };
        document.getElementById('currentPageTitle').textContent = titleMap[pageId] || 'Yönetim Paneli';
    }

    // Aktif linki işaretle
    document.querySelectorAll('#sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });

    // Sayfaya özel render fonksiyonlarını çağır
    if (pageId === 'users-page') {
        // KRİTİK EKLENTİ: Kullanıcı sayfasına girince Rol Dropdown'unu doldur.
        if (typeof populateRoleDropdowns === 'function') populateRoleDropdowns(); 
        window.renderUserTable();
    } else if (pageId === 'posts-page') {
        window.renderPostTable();
    } else if (pageId === 'moderation-page') {
        window.updateModerationView();
    } else if (pageId === 'logs-page') {
        window.renderModerationLogs(false); // Tam Log Sayfası için false gönder
    } else if (pageId === 'team-chat-page') {
        window.renderChatMessages(true); // Sayfaya girince otomatik scroll et
        // Chat sayfasına girildiğinde, o anki mesaj sayısını kaydet
        const chatMessages = JSON.parse(localStorage.getItem('TEAM_CHAT_MESSAGES')) || [];
        lastSeenChatMessageCount = chatMessages.length;
        localStorage.setItem('LAST_SEEN_CHAT_COUNT', lastSeenChatMessageCount);
        updateNotifications(); // Badge'i sıfırlamak için
    } else if (pageId === 'achievements-page') {
         if (typeof renderAchievementsTable === 'function') {
             renderAchievementsTable();
         }
    } else if (pageId === 'blacklist-page') { // YENİ EKLEME
         // admin_blacklist.js dosyasındaki fonksiyonlar çağrılır
         if (typeof loadBlacklistedWords === 'function') loadBlacklistedWords();
         if (typeof renderBlacklistedWords === 'function') renderBlacklistedWords();
    }
}


// ----------------------------------------------------
// GÖNDERİ YÖNETİMİ
// ----------------------------------------------------

function savePostData() { localStorage.setItem('POSTS_DATA', JSON.stringify(posts)); }

// **YENİ FONKSİYON: Gönderileri Filtreleme**
function filterPosts() {
    const searchTerm = document.getElementById('postSearchInput').value.toLowerCase();

    const filtered = posts.filter(post => {
        const idMatch = post.id.toString().includes(searchTerm);
        const userMatch = post.user.toLowerCase().includes(searchTerm);
        const contentMatch = post.content.toLowerCase().includes(searchTerm);
        
        return idMatch || userMatch || contentMatch;
    });

    renderPostTable(filtered);
}

function renderPostTable(filteredPosts = posts) {
    const postTableBody = document.getElementById('postTableBody');
    if (!postTableBody) return; 

    postTableBody.innerHTML = '';
    const canEditDelete = ['super_admin', 'admin', 'manager', 'expert', 'moderator'].includes(CURRENT_USER_ROLE); 
    
    filteredPosts.forEach(post => {
        const row = postTableBody.insertRow();
        
        let statusBadge = '';
        if (post.status === 'active') {
            statusBadge = `<span class="badge bg-success">Yayında (Herkes)</span>`;
        } else if (post.status === 'followers_only') {
            statusBadge = `<span class="badge bg-primary">Sadece Takipçiler</span>`; 
        } else if (post.status === 'deleted') {
            statusBadge = `<span class="badge bg-danger">Silindi</span>`;
        } else if (post.status === 'rejected') {
            statusBadge = `<span class="badge bg-dark">Reddedildi</span>`;
        } else {
            statusBadge = `<span class="badge bg-warning text-dark">Onay Bekliyor</span>`;
        }
        
        let actions = '<span class="text-muted">Yetki Yok</span>';

        if (canEditDelete) {
             let approveButton = '';
             let followersOnlyButton = ''; 
             let rejectButton = '';
             
             if (post.status !== 'active' && post.status !== 'deleted' && post.status !== 'rejected' && post.status !== 'followers_only') {
                 approveButton = `<button class="btn btn-sm btn-success me-1" onclick="approvePost(${post.id})" title="Herkese Açık Onayla"><i class="fas fa-check"></i></button>`;
                 followersOnlyButton = `<button class="btn btn-sm btn-primary me-1" onclick="approveForFollowers(${post.id})" title="Sadece Takipçilere Onayla"><i class="fas fa-user-friends"></i></button>`;
                 rejectButton = `<button class="btn btn-sm btn-secondary me-1" onclick="rejectPost(${post.id})" title="Reddet ve Mesaj Yaz"><i class="fas fa-times"></i></button>`;
             }

             actions = `
                ${approveButton}
                ${followersOnlyButton} 
                ${rejectButton}
                <button class="btn btn-sm btn-info me-1" onclick="preparePostModal('edit', ${post.id})" title="Düzenle"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})" title="Sil"><i class="fas fa-trash-alt"></i></button>`;
        }
        
        // Beğeni ve Yorum Sayıları Tıklanabilir Yapıldı
        const likeCount = post.likedBy ? post.likedBy.length : (post.likes || 0);
        const commentCount = post.commentsData ? post.commentsData.length : (post.comments || 0);

        const likeHtml = `<span class="d-block" style="cursor:pointer;" onclick="showPostDetailList(${post.id}, 'likes')"><i class="fas fa-thumbs-up me-1"></i>${likeCount}</span>`;
        const commentHtml = `<span class="d-block" style="cursor:pointer;" onclick="showPostDetailList(${post.id}, 'comments')"><i class="fas fa-comment me-1"></i>${commentCount}</span>`;
        
        // KRİTİK DÜZELTME: Beğeni/Yorum ve İçerik Önizleme sütunları düzeltildi
        row.innerHTML = `
            <td>${post.id}</td>
            <td>${post.user}</td>
            <td>${post.content.substring(0, 40)}${post.content.length > 40 ? '...' : ''}</td>
            <td>${likeHtml} ${commentHtml}</td>
            <td>${statusBadge}</td>
            <td>${actions}</td>`;
    });
}
window.renderPostTable = renderPostTable;


// YENİ FONKSİYON: Beğeni/Yorum listesini modalda gösterir
window.showPostDetailList = function(postId, type) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const modalEl = document.getElementById('postDetailModal');
    const modalTitle = document.getElementById('postDetailModalTitle');
    const listContent = document.getElementById('postDetailListContent');
    
    let modalElement = bootstrap.Modal.getInstance(modalEl);
    if (!modalElement) { modalElement = new bootstrap.Modal(modalEl); }

    let listHtml = '';
    
    if (type === 'likes') {
        modalTitle.textContent = `#${postId} Gönderisini Beğenenler`;
        const likedBy = post.likedBy || [];
        
        if (likedBy.length === 0) {
            listHtml = '<div class="text-center p-3 text-muted">Bu gönderiyi henüz kimse beğenmemiş.</div>';
        } else {
            likedBy.forEach(userName => {
                listHtml += `<li class="list-group-item"> <i class="fas fa-heart text-danger me-2"></i> <strong>${userName}</strong></li>`;
            });
        }
    } else if (type === 'comments') {
        modalTitle.textContent = `#${postId} Gönderisine Yorum Yapanlar`;
        const comments = post.commentsData || [];
        
        if (comments.length === 0) {
            listHtml = '<div class="text-center p-3 text-muted">Bu gönderiye henüz yorum yapılmamış.</div>';
        } else {
            comments.forEach(comment => {
                const time = new Date(comment.timestamp).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                listHtml += `
                    <li class="list-group-item d-flex justify-content-between">
                        <div>
                            <strong>${comment.userName}:</strong> <span class="text-muted">${comment.text}</span>
                        </div>
                        <small class="text-secondary">${time}</small>
                    </li>`;
            });
        }
    }
    
    listContent.innerHTML = listHtml;
    modalElement.show();
}

window.approvePost = function(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (confirm(`Gönderi #${postId} HERKESE AÇIK olarak onaylanacak. Emin misiniz?`)) {
        post.status = 'active'; 
        savePostData(); 
        renderPostTable(); 
        moderationLogs.push(`[GENEL ONAY] ${CURRENT_USER_NAME} Gönderi #${postId} onayladı.`);
        saveModerationLogs();
        renderModerationLogs();
        updateDashboardMetrics();
    }
}

window.approveForFollowers = function(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (confirm(`Gönderi #${postId} SADECCE TAKİPÇİLERE ÖZEL olarak onaylanacak. Ana sayfaya düşmeyecek. Emin misiniz?`)) {
        post.status = 'followers_only'; 
        post.notificationDismissed = false; 
        
        savePostData();
        renderPostTable();
        moderationLogs.push(`[ÖZEL ONAY] ${CURRENT_USER_NAME} Gönderi #${postId} sadece takipçilere açıldı.`);
        saveModerationLogs();
        renderModerationLogs();
        updateDashboardMetrics();
        alert("İşlem tamam. Kullanıcıya bildirim gönderildi.");
    }
}

window.rejectPost = function(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // YENİ: Hazır sebepler listesini kullan
    const reasonList = BAN_REASONS.map((r, i) => `${i + 1}. ${r}`).join('\n');
    const customReasonPrompt = `Bu gönderiyi reddetmek üzeresiniz.\n\nHazır Sebepler:\n${reasonList}\n\nLütfen kullanıcıya iletilecek sebebi yazın (Veya yukarıdaki numarayı girin):`;

    let reason = prompt(customReasonPrompt, "İçerik kurallarına uygun değil.");
    
    if (reason !== null) {
        reason = reason.trim();
        const reasonNumber = parseInt(reason);
        if (!isNaN(reasonNumber) && reasonNumber > 0 && reasonNumber <= BAN_REASONS.length) {
            reason = BAN_REASONS[reasonNumber - 1];
        } else if (reason === "") {
             reason = "İçerik kurallarına uygun değil."; // Varsayılan sebep
        }
        
        post.status = 'rejected';
        post.rejectionReason = reason;
        
        savePostData();
        renderPostTable();
        moderationLogs.push(`[RED] ${CURRENT_USER_NAME}, Gönderi #${postId}'i reddetti. Sebep: ${reason}`);
        saveModerationLogs();
        renderModerationLogs();
        updateDashboardMetrics();
        alert("Gönderi reddedildi ve kullanıcıya mesaj kaydedildi.");
    }
}

window.preparePostModal = function(mode, postId = null) {
    const canEdit = ['super_admin', 'admin', 'manager', 'expert', 'moderator'].includes(CURRENT_USER_ROLE);
    if (!canEdit) { alert("Gönderi oluşturma/düzenleme yetkiniz yok."); return; }
    
    // Güvenli element yakalama
    const postForm = document.getElementById('postForm');
    const postModalElement = document.getElementById('postModal');
    const postModalLabel = document.getElementById('postModalLabel');
    const postIdInput = document.getElementById('postId');
    const postUserInput = document.getElementById('postUser');
    const postContentInput = document.getElementById('postContent');

    if (!postForm || !postModalElement) {
         console.error("Gönderi Modalı temel öğeleri bulunamadı.");
         return; 
    }
    
    // Modalı resetle
    postForm.reset();
    
    // Modal instance'ı al
    const postModal = new bootstrap.Modal(postModalElement);

    if (mode === 'create') {
        if (postModalLabel) postModalLabel.textContent = 'Yeni Gönderi Oluştur';
        if (postIdInput) postIdInput.value = '';
        if (postUserInput) {
            postUserInput.value = CURRENT_USER_NAME; 
            postUserInput.readOnly = false;
        }
        postModal.show();

    } else if (mode === 'edit' && postId !== null) {
        const post = posts.find(p => p.id === postId);
        if (!post) return alert("Gönderi bulunamadı.");

        if (postModalLabel) postModalLabel.textContent = `Gönderi Düzenle (#${postId})`;
        if (postIdInput) postIdInput.value = post.id;
        if (postUserInput) {
            postUserInput.value = post.user;
            postUserInput.readOnly = true;
        }
        if (postContentInput) postContentInput.value = post.content;
        
        postModal.show();
    }
}

function handlePostSubmit(e) {
    e.preventDefault(); 
    const postId = document.getElementById('postId').value;
    const postUser = document.getElementById('postUser').value;
    const postContent = document.getElementById('postContent').value;
    
    const postModalElement = document.getElementById('postModal');
    const postModal = bootstrap.Modal.getInstance(postModalElement);

    if (postId) {
        const index = posts.findIndex(p => p.id == postId);
        if (index !== -1) {
            posts[index].content = postContent;
            moderationLogs.push(`[GÖNDERİ DÜZENLEME] ${CURRENT_USER_NAME} Gönderi #${postId}'i düzenledi.`);
        }
    } else {
        const newId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 101;
        const newPost = { 
            id: newId, 
            user: postUser, 
            content: postContent, 
            likes: 0, 
            likedBy: [], // Yeni post oluştururken boş beğeni dizisi ekle
            comments: 0, 
            commentsData: [], // Yeni post oluştururken boş yorum dizisi ekle
            status: 'active' 
        };
        posts.push(newPost);
        moderationLogs.push(`[GÖNDERİ OLUŞTURMA] ${CURRENT_USER_NAME} yeni Gönderi #${newId}'i oluşturdu.`);
    }

    savePostData();
    saveModerationLogs();
    renderPostTable();
    renderModerationLogs();
    updateDashboardMetrics();
    
    if (postModal) postModal.hide();
    alert("İşlem başarılı.");
}
window.handlePostSubmit = handlePostSubmit;

window.editPost = function(postId) { preparePostModal('edit', postId); }

window.deletePost = function(postId) {
    if (!['super_admin', 'admin', 'manager', 'expert', 'moderator'].includes(CURRENT_USER_ROLE)) { alert("Gönderi silme yetkiniz yok."); return; }
    if (confirm(`Gönderi #${postId}'i silmek istediğinizden emin misiniz?`)) {
        posts = posts.filter(post => post.id !== postId);
        savePostData();
        renderPostTable();
        moderationLogs.push(`[${ROLE_NAMES[CURRENT_USER_ROLE]}] ${CURRENT_USER_NAME}: Gönderi #${postId} silindi.`);
        saveModerationLogs();
        renderModerationLogs();
        updateDashboardMetrics(); 
    }
}


// ----------------------------------------------------
// DİĞER PANEL FONKSİYONLARI
// ----------------------------------------------------

/**
 * KRİTİK: Toplam bildirim sayısını hesaplar.
 */
function calculateTotalNotifications() {
    // Güvenlik kontrolü
    if (typeof users === 'undefined' || typeof posts === 'undefined' || typeof reports === 'undefined') {
        return { total: 0, pendingUsers: 0, pendingPosts: 0, unresolvedReports: 0, unreadChatCount: 0 };
    }
    
    const pendingUsers = users.filter(u => u.status === 'pending').length;
    const pendingPosts = posts.filter(p => p.status === 'pending').length;
    const unresolvedReports = reports.filter(r => !r.isResolved).length;
    const currentChatMessages = JSON.parse(localStorage.getItem('TEAM_CHAT_MESSAGES')) || [];
    
    // Chat bildirimi: Son görülme sayısını baz alarak yeni mesajları sayar
    const isChatPageActive = document.getElementById('team-chat-page')?.style.display === 'block';
    let unreadChatCount = 0;
    
    if (!isChatPageActive && currentChatMessages.length > lastSeenChatMessageCount) {
        unreadChatCount = currentChatMessages.length - lastSeenChatMessageCount;
    }
    
    let total = 0;
    
    // Yalnızca yetkili roller için bildirimleri say
    if (['super_admin', 'admin', 'manager'].includes(CURRENT_USER_ROLE)) {
        total += pendingUsers;
        total += unresolvedReports;
    }
    if (['super_admin', 'admin', 'manager', 'expert', 'moderator'].includes(CURRENT_USER_ROLE)) {
        total += pendingPosts;
        total += unreadChatCount; 
    }
    
    return {
        total,
        pendingUsers,
        pendingPosts,
        unresolvedReports, // Yeni Rapor Sayısı
        unreadChatCount
    };
}

/**
 * Sağ üstteki bildirim menüsünü ve toplu badge'i günceller.
 */
function updateNotifications() {
    let totalUnread = 0;
    const menu = document.getElementById('notification-menu');
    const totalBadge = document.getElementById('total-notifications-badge');
    
    if (!menu || !totalBadge) return;
    
    menu.innerHTML = '';
    let notifications = [];
    
    const { pendingUsers, pendingPosts, unresolvedReports, unreadChatCount } = calculateTotalNotifications();

    // 1. Kullanıcı Onay Bildirimi
    if (pendingUsers > 0 && ACCESS_MATRIX['users-page'].includes(CURRENT_USER_ROLE)) {
        notifications.push({ text: `${pendingUsers} yeni kullanıcı onayı bekliyor.`, page: 'users-page' });
        totalUnread += pendingUsers;
    }

    // 2. Gönderi Onay Bildirimi
    if (pendingPosts > 0 && ACCESS_MATRIX['posts-page'].includes(CURRENT_USER_ROLE)) {
        notifications.push({ text: `${pendingPosts} yeni gönderi onayı bekliyor.`, page: 'posts-page' });
        totalUnread += pendingPosts;
    }
    
    // 3. Çözülmemiş Rapor Bildirimi (Admin Panel çan bildirimi için)
    if (unresolvedReports > 0 && ACCESS_MATRIX['moderation-page'].includes(CURRENT_USER_ROLE)) {
        notifications.push({ text: `${unresolvedReports} çözülmemiş şikayet var.`, page: 'moderation-page' });
        totalUnread += unresolvedReports;
    }
    
    // 4. Ekip Sohbeti Bildirimi
    if (unreadChatCount > 0 && ACCESS_MATRIX['team-chat-page'].includes(CURRENT_USER_ROLE)) {
        notifications.push({ text: `${unreadChatCount} yeni ekip sohbeti mesajı.`, page: 'team-chat-page' });
        totalUnread += unreadChatCount;
    }

    if (notifications.length === 0) {
        menu.innerHTML = '<li class="dropdown-item text-muted">Bildirim yok</li>';
        totalBadge.textContent = '0';
    } else {
        notifications.forEach(n => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'dropdown-item small d-flex justify-content-between align-items-center';
            a.href = '#';
            
            // KRİTİK DÜZELTME: Çan menüsündeki tıklama ile doğru sayfaya yönlendir
            a.onclick = (e) => {
                e.preventDefault();
                navigateTo(n.page);
            };
            
            // Bildirim metnine rozet ekleyerek çözülmemiş rapor sayısını göster (Moderasyon için)
            let text = n.text;
            if (n.page === 'moderation-page' && unresolvedReports > 0) {
                 text = `<i class="fas fa-flag text-danger me-1"></i> ${text}`;
            }
            a.innerHTML = text;
            
            li.appendChild(a);
            menu.appendChild(li);
        });
        totalBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
    }
    
    // Sidebar rozetlerini de burada güncelle
    updateSidebarBadges();
}
window.updateNotifications = updateNotifications;


function updateSidebarBadges() {
    const { pendingUsers, pendingPosts, unresolvedReports, unreadChatCount } = calculateTotalNotifications();

    // Sohbet bildirim rozetini güncelle
    const chatBadge = document.querySelector('.nav-link[data-page="team-chat-page"] .badge');
    if (chatBadge) {
        chatBadge.textContent = unreadChatCount > 0 ? unreadChatCount : '';
        chatBadge.style.display = unreadChatCount > 0 ? 'inline-block' : 'none';
    }

    // Kullanıcı onayı rozetini güncelle
    let userPendingCount = (['super_admin', 'admin', 'manager'].includes(CURRENT_USER_ROLE)) ? pendingUsers : 0;
    const usersBadge = document.getElementById('users-badge');
    if (usersBadge) {
        usersBadge.textContent = userPendingCount > 0 ? userPendingCount : '';
        usersBadge.style.display = userPendingCount > 0 ? 'inline-block' : 'none';
        localStorage.setItem(NOTIFICATION_KEYS['users-page'], userPendingCount);
    }

    // Gönderi onayı rozetini güncelle
    const postBadge = document.getElementById('posts-badge');
    if (postBadge) {
        postBadge.textContent = pendingPosts > 0 ? pendingPosts : '';
        postBadge.style.display = pendingPosts > 0 ? 'inline-block' : 'none';
        localStorage.setItem(NOTIFICATION_KEYS['posts-page'], pendingPosts);
    }
    
    // KRİTİK EKLEME: Moderasyon (Rapor) rozetini güncelle
    const moderationBadgeLink = document.querySelector('.nav-link[data-page="moderation-page"]');
    if (moderationBadgeLink && ACCESS_MATRIX['moderation-page'].includes(CURRENT_USER_ROLE)) {
        // Badge elemanı yoksa oluştur
        let moderationBadge = moderationBadgeLink.querySelector('.badge.moderation-badge');
        if (!moderationBadge) {
            moderationBadge = document.createElement('span');
            moderationBadge.className = 'badge bg-danger ms-auto moderation-badge'; // Yeni class ekle
            moderationBadgeLink.appendChild(moderationBadge);
        }
        
        moderationBadge.textContent = unresolvedReports > 0 ? unresolvedReports : '';
        moderationBadge.style.display = unresolvedReports > 0 ? 'inline-block' : 'none';
        localStorage.setItem(NOTIFICATION_KEYS['moderation-page'], unresolvedReports);
    }
}
window.updateSidebarBadges = updateSidebarBadges;

/**
 * Dashboard'daki en aktif kullanıcı listesini (son 7 gün) aktivite loglarına göre render eder.
 */
function renderActiveUsersList() {
    const listContainer = document.getElementById('activeUsersList');
    if (!listContainer) return;
    
    if (typeof users === 'undefined') {
         listContainer.innerHTML = '<li class="list-group-item text-muted">Kullanıcı verisi yüklenemedi.</li>';
         return;
    }

    listContainer.innerHTML = '';

    // Kullanıcıları toplam aktivite sürelerine göre sırala
    const sortedUsers = users.map(user => {
        const totalMinutes = Object.values(user.activityLogs || {}).reduce((sum, current) => sum + current, 0);
        return {
            name: user.name,
            role: user.role,
            totalMinutes: totalMinutes,
            profileImage: user.profileImage
        };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes); // En aktif olan en üste

    if (sortedUsers.length === 0) {
        listContainer.innerHTML = '<li class="list-group-item text-muted">Kullanıcı verisi bulunamadı.</li>';
        return;
    }

    // İlk 5 aktif kullanıcıyı göster
    sortedUsers.slice(0, 5).forEach(user => {
        const hours = Math.floor(user.totalMinutes / 60);
        const mins = user.totalMinutes % 60;
        const timeString = hours > 0 ? `${hours} sa ${mins} dk` : `${mins} dk`;
        
        // Sadece aktivitesi olanları veya ilk 5'i göster
        if (user.totalMinutes > 0 || listContainer.children.length < 5) {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${user.profileImage}" class="rounded-circle me-2" style="width: 30px; height: 30px; object-fit: cover;">
                    <strong>${user.name}</strong>
                    <span class="badge bg-secondary ms-2">${ROLE_NAMES[user.role] || 'Üye'}</span>
                </div>
                <span class="fw-bold text-success">${timeString}</span>
            `;
            listContainer.appendChild(listItem);
        }
    });
    
    if (listContainer.innerHTML === '') {
         listContainer.innerHTML = '<li class="list-group-item text-muted">Henüz kayıtlı bir aktivite yok.</li>';
    }
}
window.renderActiveUsersList = renderActiveUsersList;

// YENİ EKLEME: En çok şikayet edilen kullanıcıları ve gönderileri listeler
function renderTopComplained() {
    const topUsersContainer = document.getElementById('topComplainedUsers');
    const topPostsContainer = document.getElementById('topComplainedPosts');
    if (!topUsersContainer || !topPostsContainer) return;
    
    if (typeof reports === 'undefined' || typeof users === 'undefined' || typeof posts === 'undefined') {
         topUsersContainer.innerHTML = '<li class="list-group-item text-muted small">Rapor verisi yüklenemedi.</li>';
         topPostsContainer.innerHTML = '<li class="list-group-item text-muted small">Rapor verisi yüklenemedi.</li>';
         return;
    }

    // 1. En Çok Şikayet Edilen Kullanıcıları Bul
    const userReportCounts = {};
    const postReportCounts = {};

    reports.filter(r => !r.isResolved).forEach(report => {
        if (report.type === 'user_complaint' && report.targetName) {
             userReportCounts[report.targetName] = (userReportCounts[report.targetName] || 0) + 1;
        } else if (report.type === 'post_complaint' && report.targetId) {
             postReportCounts[report.targetId] = (postReportCounts[report.targetId] || 0) + 1;
        }
    });

    const sortedUsers = Object.entries(userReportCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
        
    const sortedPosts = Object.entries(postReportCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    // Kullanıcı Listesi
    if (sortedUsers.length > 0) {
        topUsersContainer.innerHTML = sortedUsers.map(([name, count]) => {
            const user = users.find(u => u.name === name);
            const userRole = user ? (ROLE_NAMES[user.role] || 'Üye') : 'Bilinmeyen';
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <strong>${name}</strong> <span class="text-muted small ms-1">(${userRole})</span>
                    <span class="badge bg-danger">${count} Rapor</span>
                </li>
            `;
        }).join('');
    } else {
        topUsersContainer.innerHTML = '<li class="list-group-item text-muted small">Şikayet edilen kullanıcı yok.</li>';
    }

    // Gönderi Listesi
    if (sortedPosts.length > 0) {
        topPostsContainer.innerHTML = sortedPosts.map(([postId, count]) => {
            const post = posts.find(p => p.id == postId);
            const preview = post ? post.content.substring(0, 20) + '...' : 'Silinmiş İçerik';
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <small title="${preview}">#${postId} (${post ? post.user : 'Bilinmeyen'})</small>
                    <span class="badge bg-danger">${count} Rapor</span>
                </li>
            `;
        }).join('');
    } else {
        topPostsContainer.innerHTML = '<li class="list-group-item text-muted small">Şikayet edilen gönderi yok.</li>';
    }
}
window.renderTopComplained = renderTopComplained;

function updateDashboardMetrics() {
    // Güvenlik kontrolü
    if (typeof users === 'undefined' || typeof posts === 'undefined' || typeof reports === 'undefined') {
         console.warn("Dashboard metrikleri için veri eksik. Atlanıyor.");
         return;
    }
    
    const totalMembers = users.length; 
    const newRegistrations = users.filter(u => u.status === 'pending').length;
    const totalPosts = posts.length; 
    
    // Rapor verisi yüklenmemişse 0 olarak al
    const pendingComplaints = reports.filter(r => !r.isResolved).length; 

    // KRİTİK: Metrik ID'lerini Düzelt (index.html'e göre)
    const totalUsersEl = document.getElementById('totalUsers'); 
    const totalPostsEl = document.getElementById('totalPosts'); 
    const pendingUsersEl = document.getElementById('pendingUsers'); 
    const pendingComplaintsEl = document.getElementById('pendingComplaints'); // Doğru ID kullanıldı

    if(totalUsersEl) totalUsersEl.textContent = totalMembers.toLocaleString();
    if(totalPostsEl) totalPostsEl.textContent = totalPosts.toLocaleString();
    if(pendingUsersEl) pendingUsersEl.textContent = newRegistrations;
    if(pendingComplaintsEl) pendingComplaintsEl.textContent = pendingComplaints;

    renderModerationLogs(true); 
    updateTeamStatusList(); 
    window.renderActiveUsersList(); // AKTİF KULLANICI LİSTESİNİ GÜNCELLE
    window.renderTopComplained(); // ŞİKAYET LİSTELERİNİ GÜNCELLE
}
window.updateDashboardMetrics = updateDashboardMetrics;


/**
 * Logları render eder. KRİTİK DÜZELTME: Dizinin kopyasını ters çeviriyoruz.
 */
function renderModerationLogs(isDashboard = true) {
    // Logları yükleyen ve ekrana basan fonksiyon
    const logContainer = isDashboard ? document.getElementById('recentLogsList') : document.getElementById('moderationLogsList'); 
    if (!logContainer) return;
    
    // Güvenlik kontrolü
    if (typeof moderationLogs === 'undefined') {
        logContainer.innerHTML = '<li class="list-group-item text-muted">Log verisi yüklenemedi.</li>';
        return;
    }

    logContainer.innerHTML = '';
    
    // KRİTİK DÜZELTME: Orijinal diziyi değiştirmemek için kopya alıyoruz ve ters çeviriyoruz.
    let logsToRender = [...moderationLogs]; 
    
    if (isDashboard) { 
        // Dashboard için son 10 logu ters çevir (en yeni üstte)
        logsToRender = logsToRender.slice(-10).reverse(); 
    } else { 
        // Tam Log Sayfası için tüm logları ters çevir
        logsToRender.reverse(); 
    }

    if (logsToRender.length === 0) {
        logContainer.innerHTML = '<li class="list-group-item text-muted">Henüz moderasyon eylemi yapılmadı.</li>';
        return;
    }

    logsToRender.forEach(log => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item small';
        listItem.textContent = log;
        logContainer.appendChild(listItem);
    });
    
    // Veri kalıcılığını sağla
    saveModerationLogs();
}
window.renderModerationLogs = renderModerationLogs;

function updateTeamStatusList() {
    const listContainer = document.getElementById('teamStatusList');
    if (!listContainer) return;
    
    listContainer.innerHTML = ''; 
    
    // Güvenlik kontrolü
    if (typeof users === 'undefined') {
         listContainer.innerHTML = '<li class="list-group-item text-muted small">Kullanıcı verisi yüklenemedi.</li>';
         return;
    }
    
    // Sadece yetkili rolleri listele (member hariç)
    const staffUsers = users.filter(u => u.role !== 'member');
    const sortedUsers = staffUsers.sort((a, b) => ROLE_LEVELS[a.role] - ROLE_LEVELS[b.role]); 

    sortedUsers.forEach(user => {
        let statusIcon = 'fa-circle';
        let statusColor = 'text-danger'; // Varsayılan Kırmızı (Offline/Pasif)
        let statusText = 'Müsait Değil';

        if (user.status === 'active') { 
            statusColor = 'text-success'; // Yeşil
            statusText = 'Aktif (Online)'; 
        } else if (user.status === 'offline') { 
            statusColor = 'text-danger'; // Kırmızı
            statusText = 'Çevrimdışı'; 
        } else if (user.status.startsWith('timeout')) { 
            statusIcon = 'fa-ban'; 
            statusColor = 'text-danger'; // Kırmızı
            statusText = 'Geçici Ban'; 
        } else if (user.status === 'inactive' || user.status === 'banned') {
            statusIcon = 'fa-ban'; 
            statusColor = 'text-danger'; // Kırmızı
            statusText = 'Kalıcı Ban'; 
        } else if (user.status === 'pending') {
            statusIcon = 'fa-user-clock'; 
            statusColor = 'text-warning'; // Sarı/Turuncu
            statusText = 'Onay Bekliyor'; 
        }

        const listItem = document.createElement('li');
        listItem.className = 'dropdown-item small';
        listItem.innerHTML = `<i class="fas ${statusIcon} me-2 ${statusColor}"></i><strong>${user.name}</strong> (${ROLE_NAMES[user.role]}): ${statusText}`;
        listContainer.appendChild(listItem);
    });
}

// ----------------------------------------------------
// MODERASYON GÖRÜNÜMÜ (MESAJ ŞİKAYETLERİ EKLENDİ)
// ----------------------------------------------------
function updateModerationView() {
    const moderationPage = document.getElementById('moderation-page');
    if (!moderationPage) return;
    
    // Güvenlik kontrolü
    if (typeof reports === 'undefined') {
         // Eğer raporlar yüklenmediyse sadece başlık gösterilsin
         moderationPage.innerHTML = `<h2>🚨 Şikayet ve Rapor Yönetimi</h2><div class="alert alert-danger">Rapor verileri yüklenemedi. Veri depolama dosyasını kontrol edin.</div>`;
         return;
    }


    const allReports = reports; // Tüm raporları al
    const unresolvedReports = allReports.filter(r => !r.isResolved);
    
    // Moderasyon sayfasının ana içeriğini yenile
    moderationPage.innerHTML = `
        <h2>🚨 Şikayet ve Rapor Yönetimi</h2>
        <div class="alert alert-info">
            Kullanıcılar tarafından yapılan tüm şikayetleri buradan takip edebilirsiniz. Toplam ${unresolvedReports.length} çözülmemiş şikayet var.
        </div>
        
        <div class="d-flex justify-content-between align-items-center mb-3">
            <p class="mb-0 text-muted" id="reportCountSummary">Toplam ${allReports.length} kayıtlı şikayet.</p>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-success" onclick="renderReportsTable(reports.filter(r => r.isResolved))"><i class="fas fa-check-circle"></i> Çözülenler</button>
                <button class="btn btn-sm btn-danger" onclick="renderReportsTable(reports.filter(r => !r.isResolved))"><i class="fas fa-times-circle"></i> Çözülmeyenler</button>
                <button class="btn btn-sm btn-primary" onclick="renderReportsTable()"><i class="fas fa-list-alt"></i> Tüm Şikayetler</button>
            </div>
        </div>
        
        <div id="reportsTableBodyContainer">
            ${createReportTable(unresolvedReports)}
        </div>
    `;

    // Bu, renderReportsTable'ı çağırır (index.html'deki varsayılan tablo yapısını kullanan fonksiyon)
    renderReportsTable(unresolvedReports);
    updateNotifications(); // Badge'leri yenile
}
window.updateModerationView = updateModerationView;


function createReportTable(reportList) {
    
    // Güvenlik kontrolü
    if (typeof users === 'undefined' || typeof posts === 'undefined' || typeof stories === 'undefined') {
         return `<div class="alert alert-danger">Tablo oluşturulurken kritik veri eksikliği: Kullanıcı/Gönderi/Hikaye verisi yüklenemedi.</div>`;
    }
    
    return `
    <div class="card">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Rapor ID</th>
                        <th>Tür</th>
                        <th>Hedef</th>
                        <th>Raporlayan</th>
                        <th>Sebep</th>
                        <th>İçerik</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody id="reportsTableBody">
                    ${reportList.map(report => {
                        const targetUser = users.find(u => u.name === report.targetName);
                        const targetInfo = `<strong>${report.targetName}</strong> (ID: ${report.targetId || targetUser?.id || '?'})`;
                        const statusBadge = report.isResolved 
                            ? `<span class="badge bg-success">Çözüldü</span>` 
                            : `<span class="badge bg-danger">Çözülmedi</span>`;

                        let actions = '';
                        
                        if (!report.isResolved) {
                            actions = `<button class="btn btn-sm btn-success me-1" onclick="closeReport(${report.reportId}, false)"><i class="fas fa-check"></i> Temiz</button>`;
                            
                            if (report.type === 'message_complaint' || report.type === 'user_complaint') {
                                // Kullanıcı ID'sini bulmak için names'i kullan (çünkü targetId bazen post/story id'si olabilir)
                                
                                if (targetUser) {
                                    actions += `<button class="btn btn-sm btn-warning me-1" onclick="banReportedUser(${report.reportId}, ${targetUser.id})"><i class="fas fa-ban"></i> Banla</button>`;
                                } else {
                                     actions += `<span class="text-muted small">Kullanıcı Bulunamadı</span>`;
                                }
                            } else if (report.type.includes('post') || report.type.includes('story')) {
                                actions += `<button class="btn btn-sm btn-danger" onclick="deleteReportedPost(${report.reportId}, ${report.targetId})"><i class="fas fa-trash-alt"></i> Sil</button>`;
                            }
                        } else {
                            actions = `<span class="text-muted small">İşlem Tamam</span>`;
                        }
                        
                        const contentPreview = report.contentPreview || 'N/A';

                        return `
                        <tr>
                            <td>${report.reportId}</td>
                            <td><span class="badge bg-${report.type === 'message_complaint' ? 'warning text-dark' : 'primary'}">${report.type}</span></td>
                            <td>${targetInfo}</td>
                            <td>${report.reportedBy}</td>
                            <td class="text-danger fw-bold small">${report.reason}</td>
                            <td><div style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" class="small fst-italic">"${contentPreview}"</div></td>
                            <td>${statusBadge}</td>
                            <td>${actions}</td>
                        </tr>
                        `;
                    }).join('')}
                    ${reportList.length === 0 ? '<tr><td colspan="8" class="text-center text-muted">Şikayet bulunmamaktadır.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    </div>
    `;
}

// Global olarak renderReportsTable'ı tanımla (index.html'de çağrıldığı için)
window.renderReportsTable = function(filteredReports = reports) {
     const container = document.getElementById('reportsTableBodyContainer');
     if (container) {
         container.innerHTML = createReportTable(filteredReports);
     }
}


// Yardımcı: İsimden ID bulma
function getUserIdByName(name) {
    const u = users.find(user => user.name === name);
    return u ? u.id : 0;
}

// ----------------------------------------------------
// MODERASYON AKSİYONLARI
// ----------------------------------------------------

function closeReport(reportId, shouldDeleteContent) {
    const canModerate = ['super_admin', 'admin', 'moderator', 'manager', 'expert'].includes(CURRENT_USER_ROLE);
    if (!canModerate) { alert("Yetkiniz yok."); return; }
    
    const reportIndex = reports.findIndex(r => r.reportId === reportId);
    if (reportIndex === -1) { alert("Şikayet bulunamadı."); return; }

    const report = reports[reportIndex];
    
    if (shouldDeleteContent) {
        if (report.type === 'post_complaint') {
            posts = posts.filter(post => post.id !== report.targetId);
            savePostData();
            moderationLogs.push(`[GÖNDERİ SİLİNDİ] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME} şikayet #${reportId} üzerine Gönderi #${report.targetId}'i sildi.`);
        } else if (report.type === 'story_complaint') {
            window.stories = window.stories.filter(story => story.id !== report.targetId);
            saveStoryData();
            moderationLogs.push(`[HİKAYE SİLİNDİ] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME} şikayet #${reportId} üzerine Hikaye #${report.targetId}'i sildi.`);
        }
    } else {
        moderationLogs.push(`[ŞİKAYET KAPATILDI] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME} şikayet #${reportId}'i çözüldü (Temiz).`);
    }
    
    // Raporu "çözülmüş" olarak işaretle
    reports[reportIndex].isResolved = true;
    saveReportData();
    
    saveModerationLogs();
    renderModerationLogs();
    updateModerationView(); // Görünümü ve bildirimleri yenile
    updateDashboardMetrics();
    alert(`Şikayet #${reportId} kapatıldı.`);
}
window.closeReport = closeReport;

function deleteReportedPost(reportId, targetId) {
    const report = reports.find(r => r.reportId === reportId);
    if (!report) return;
    const targetType = report.type === 'story_complaint' ? 'Hikaye' : 'Gönderi';
    if (confirm(`${targetType} SİLME ONAYI: #${targetId} numaralı içerik kalıcı olarak SİLİNECEK. Onaylıyor musunuz?`)) {
        closeReport(reportId, true); 
    }
}
window.deleteReportedPost = deleteReportedPost;

window.banReportedUser = function(reportId, userId) {
    const userToBan = users.find(u => u.id === userId);
    if (!userToBan) { alert("Kullanıcı bulunamadı."); return; }
    
    // YENİ: Hazır sebep listesini kullanarak ban sebebi al
    const reasonList = BAN_REASONS.map((r, i) => `${i + 1}. ${r}`).join('\n');
    const customReasonPrompt = `Kullanıcı ${userToBan.name} kalıcı olarak banlanacaktır.\n\nHazır Sebepler:\n${reasonList}\n\nLütfen ban sebebini yazın (Veya yukarıdaki numarayı girin):`;
    
    let reason = prompt(customReasonPrompt, BAN_REASONS[0]); // Varsayılan sebep
    
    if (reason !== null) {
        reason = reason.trim();
        const reasonNumber = parseInt(reason);
        if (!isNaN(reasonNumber) && reasonNumber > 0 && reasonNumber <= BAN_REASONS.length) {
            reason = BAN_REASONS[reasonNumber - 1];
        } else if (reason === "") {
             alert("Sebep girmelisiniz."); return;
        }

        if (confirm(`Kullanıcı ${userToBan.name} kalıcı olarak banlanacaktır. Sebep: "${reason}". Onaylıyor musunuz?`)) {
            const userIndex = users.findIndex(u => u.id === userId);
            users[userIndex].status = 'inactive';
            users[userIndex].ban_reason = reason;
            saveUserData();
            closeReport(reportId, false);
            moderationLogs.push(`[KULLANICI BANLANDI] ${CURRENT_USER_NAME} şikayet #${reportId} üzerine kullanıcı ${userToBan.name} banladı. Sebep: ${reason}`);
            saveModerationLogs();
            renderModerationLogs();
            alert(`Kullanıcı banlandı ve şikayet kapatıldı.`);
        }
    }
}


// ----------------------------------------------------
// AYARLAR VE SOHBET İŞLEMLERİ
// ----------------------------------------------------

function changePassword(e) {
    e.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const messageDisplay = document.getElementById('passwordChangeMessage');

    const currentUserIndex = users.findIndex(u => u.name === CURRENT_USER_NAME);
    const currentUser = users[currentUserIndex];

    if (currentUser.password !== oldPassword) {
        messageDisplay.textContent = 'Hata: Mevcut şifre yanlış.';
        messageDisplay.className = 'alert alert-danger';
        return;
    }

    currentUser.password = newPassword;
    users[currentUserIndex] = currentUser;
    saveUserData();
    
    moderationLogs.push(`[AYAR] ${CURRENT_USER_NAME} şifresini başarıyla değiştirdi.`);
    saveModerationLogs();
    renderModerationLogs();

    messageDisplay.textContent = 'Şifreniz başarıyla güncellendi!';
    messageDisplay.className = 'alert alert-success';
    document.getElementById('changePasswordForm').reset();
}

// **GÜNCELLEMİŞ FONKSİYON: KULLANICI ADI DEĞİŞTİRME VE TAM SENKRONİZASYON**
function changeUsername(e) {
    e.preventDefault();
    const newName = document.getElementById('newUserNameInput').value.trim();
    const messageDisplay = document.getElementById('nameChangeMessage');
    const oldName = sessionStorage.getItem('CURRENT_USER_NAME');
    
    if (!newName || !oldName) return;
    if (newName === oldName) {
        messageDisplay.innerHTML = '<div class="alert alert-warning">Yeni isim eskisiyle aynı olamaz.</div>';
        return;
    }

    const nameExists = users.some(u => u.name.toLowerCase() === newName.toLowerCase());
    if (nameExists) {
        messageDisplay.innerHTML = '<div class="alert alert-danger fw-bold"><i class="fas fa-exclamation-circle me-2"></i>Bu isim KULLANIMDA! Lütfen başka bir isim seçin.</div>';
        return;
    }

    const currentUserIndex = users.findIndex(u => u.name === oldName);
    if (currentUserIndex !== -1) {
        
        // 1. Kullanıcı Verisini Güncelle
        users[currentUserIndex].name = newName;
        
        // 2. TÜM VERİ SETLERİNİ TARA VE GÜNCELLE
        // Gönderileri Güncelle
        posts.forEach(post => {
            if (post.user === oldName) post.user = newName;
            // Beğenenleri Güncelle
            if (post.likedBy) {
                const likeIndex = post.likedBy.indexOf(oldName);
                if (likeIndex !== -1) post.likedBy[likeIndex] = newName;
            }
            // Yorumları Güncelle
            if (post.commentsData) {
                post.commentsData.forEach(comment => {
                    if (comment.userName === oldName) comment.userName = newName;
                });
            }
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
                if (story.likedBy) {
                    const likeIndex = story.likedBy.indexOf(oldName);
                    if (likeIndex !== -1) story.likedBy[likeIndex] = newName;
                }
            });
            saveStoryData();
        }

        // 3. Oturumu ve Veriyi Kaydet
        sessionStorage.setItem('CURRENT_USER_NAME', newName);
        saveUserData(); 
        
        moderationLogs.push(`[İSİM DEĞİŞİKLİĞİ] ${oldName} ismini "${newName}" olarak değiştirdi. Veritabanı kayıtları güncellendi.`);
        saveModerationLogs();

        alert(`İsminiz başarıyla "${newName}" olarak değiştirildi. Sayfa yenileniyor...`);
        location.reload(); 
    }
}

function toggleUserStatus() {
    const currentUserIndex = users.findIndex(u => u.name === CURRENT_USER_NAME);
    const currentUser = users[currentUserIndex];
    if (!currentUser) return;

    // Normalde 'active' ve 'offline' arasında geçiş yapacak
    let newStatus = currentUser.status === 'active' ? 'offline' : 'active'; 
    
    // Banlı/Timeout/Pending durumları kilitli kalır
    if (currentUser.status.startsWith('timeout') || currentUser.status === 'inactive' || currentUser.status === 'pending') {
        alert("Durumunuz kilitli. Status Change yapamazsınız.");
        return;
    }

    currentUser.status = newStatus;
    users[currentUserIndex] = currentUser;
    saveUserData();

    updateStatusButtonVisual(currentUser);
    updateTeamStatusList(); 
    renderUserTable(); 
    updateDashboardMetrics(); 
}

function updateStatusButtonVisual(user) {
    const statusBtn = document.getElementById('statusToggleBtn');
    if (!statusBtn || !user) return;
    const isOnline = user.status === 'active';
    
    if (isOnline) { statusBtn.className = 'btn btn-success w-100'; statusBtn.innerHTML = '<i class="fas fa-circle me-2"></i> Şu an: Aktif (Online)'; } 
    else { statusBtn.className = 'btn btn-danger w-100'; statusBtn.innerHTML = '<i class="fas fa-circle me-2"></i> Şu an: Müsait Değil (Offline)'; } 
}

function renderChatMessages(forceScroll = false) {
    // Sohbet kutusunun ID'sinin index.html'deki 'chatMessagesContainer' olduğundan emin olmalıyız.
    const chatMessagesContainer = document.getElementById('chatMessagesContainer');
    if (!chatMessagesContainer) return;

    // LocalStorage'dan sohbet verisini çek
    const storedMessages = localStorage.getItem('TEAM_CHAT_MESSAGES');
    let chatMessages = [];
    if (storedMessages) { 
        try {
            chatMessages = JSON.parse(storedMessages); 
        } catch(e) {
            console.error("Chat verisi bozuk:", e);
        }
    }

    // Ekrandaki içeriğin yenilenip yenilenmediğini kontrol etmek için bir bayrak kullan
    const currentHtml = chatMessagesContainer.innerHTML;
    const totalMessages = chatMessages.length;
    let newMessagesArrived = totalMessages > lastSeenChatMessageCount; // Yeni mesaj var mı?
    let newHtml = '';
    
    if (totalMessages === 0) {
        newHtml = '<div class="text-center text-muted mt-5">Henüz mesaj yok.</div>';
    } else {
        chatMessages.forEach(msg => {
            const isSelf = msg.user === CURRENT_USER_NAME;
            let userColor = (msg.role === 'super_admin' || msg.role === 'admin') ? 'text-danger' : 'text-primary';
            const messageClass = isSelf ? 'text-end' : 'text-start';
            const userName = isSelf ? 'Siz' : msg.user;
            const timeHTML = `<small class="text-muted" style="display: block;">${msg.timestamp}</small>`;
            
            // Sansürü uygula
            const filteredText = typeof window.filterBlacklistedWords === 'function' ? window.filterBlacklistedWords(msg.text) : msg.text;


            newHtml += `<div class="${messageClass} mb-2"><div class="d-flex ${isSelf ? 'flex-row-reverse' : 'flex-row'} align-items-end"><div class="p-2 rounded" style="max-width: 75%; background-color: ${isSelf ? '#e0f7fa' : '#f0f0f0'};"><strong class="${userColor}">[${ROLE_NAMES[msg.role] || msg.role}] ${userName}:</strong><p class="mb-0">${filteredText}</p></div></div>${timeHTML}</div>`;
        });
    }

    // YALNIZCA HTML DEĞİŞMİŞSE GÜNCELLE VE AŞAĞI KAYDIR
    if (currentHtml !== newHtml) {
        chatMessagesContainer.innerHTML = newHtml;
        if (forceScroll) {
             chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        } else if (newMessagesArrived && !document.getElementById('team-chat-page')?.style.display === 'block') {
             // Yeni mesaj geldiyse ve chat sayfası açık değilse scroll etme.
        } else if (newMessagesArrived && document.getElementById('team-chat-page')?.style.display === 'block') {
             // Yeni mesaj geldiyse ve chat sayfası açıksa en alta kaydır
             chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
        
        // Tarayıcı Bildirimi (Pop-up)
        if (Notification.permission === 'granted' && newMessagesArrived) {
            const lastMsg = chatMessages[totalMessages - 1];
            if (lastMsg && lastMsg.user !== CURRENT_USER_NAME) {
                 const notification = new Notification(`Yeni Ekip Mesajı: ${lastMsg.user}`, {
                     body: lastMsg.text.substring(0, 50) + (lastMsg.text.length > 50 ? '...' : ''),
                     icon: 'https://via.placeholder.com/40/0d6efd/ffffff?text=C' 
                 });
                 notification.onclick = function() {
                     window.focus();
                 };
            }
        }
    }
    
    // YENİ KRİTİK: Sohbet sayfasındaysak, rozeti sıfırla ve son görülen mesaj sayısını güncelle
    const isChatPageActive = document.getElementById('team-chat-page')?.style.display === 'block';
    if (isChatPageActive) {
        lastSeenChatMessageCount = totalMessages;
        localStorage.setItem('LAST_SEEN_CHAT_COUNT', lastSeenChatMessageCount);
    }
    
    // Her render sonrasında rozetleri yeniden hesapla
    updateSidebarBadges(); 
}
window.renderChatMessages = renderChatMessages;

function handleChatSubmit(e) {
    e.preventDefault(); 
    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    
    if (!messageText) return;

    if (messageText.toLowerCase() === '/clear' && ['super_admin', 'admin'].includes(CURRENT_USER_ROLE)) {
        let chatMessages = JSON.parse(localStorage.getItem('TEAM_CHAT_MESSAGES')) || [];
        chatMessages = [{ user: 'Sistem', role: 'system', text: `Sohbet temizlendi.`, timestamp: new Date().toLocaleTimeString() }];
        
        localStorage.setItem('TEAM_CHAT_MESSAGES', JSON.stringify(chatMessages));
        
        // KRİTİK: Temizlendikten sonra da son görülen mesaj sayısını sıfırla
        lastSeenChatMessageCount = 0;
        localStorage.setItem('LAST_SEEN_CHAT_COUNT', 0);
        
        renderChatMessages(true); 
        chatInput.value = '';
        return;
    }
    
    let chatMessages = JSON.parse(localStorage.getItem('TEAM_CHAT_MESSAGES')) || [];
    
    // Kara liste filtresini uygula
    const filteredText = typeof window.filterBlacklistedWords === 'function' ? window.filterBlacklistedWords(messageText) : messageText;

    const newMessage = { user: CURRENT_USER_NAME, role: CURRENT_USER_ROLE, text: filteredText, timestamp: new Date().toLocaleTimeString() };
    chatMessages.push(newMessage);
    
    localStorage.setItem('TEAM_CHAT_MESSAGES', JSON.stringify(chatMessages));
    
    // KRİTİK: Mesaj gönderildiğinde son görülen mesaj sayısını güncelle
    lastSeenChatMessageCount = chatMessages.length; 
    localStorage.setItem('LAST_SEEN_CHAT_COUNT', lastSeenChatMessageCount);

    renderChatMessages(true); 
    chatInput.value = '';
}
window.handleChatSubmit = handleChatSubmit;