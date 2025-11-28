// =======================================================
// kullanici.js: KULLANICI YÖNETİMİ VE ERİŞİM KONTROLÜ
// =======================================================

// Bu dosya, data_store.js'ten gelen tüm global değişkenlere (users, ROLE_LEVELS, moderationLogs vb.) erişir.
// DİKKAT: Aşağıdaki fonksiyonlar global scope'taki users, posts, reports, privateMessages, chatMessages, stories değişkenlerine erişir.

// ----------------------------------------------------
// KULLANICI ARAYÜZ İŞLEMLERİ
// ----------------------------------------------------

// Mod/Yetkili Rozeti için HTML içeriği (GÜNCEL: KALKAN)
const MOD_BADGE_HTML = `<i class="fas fa-shield-alt text-dark me-1"></i>`;
const MOD_BADGE_ALERT_TEXT = '⚫ MOD/YETKİLİ TİKİ: Yönetici ve Moderatörlere Özel. (Kalkan)';
const TECH_BADGE_HTML = `<i class="fas fa-code text-success me-1"></i>`; // Teknisyen
const VIP_BADGE_HTML = `<i class="fas fa-star text-warning me-1"></i>`; // VIP
const RESPONSIBLE_BADGE_HTML = `<i class="fas fa-user-tie text-info me-1"></i>`; // Sorumlu

/**
 * Kullanıcı tablosunu oluşturur ve günceller.
 * KRİTİK GÜNCELLEME: IP/Konum verisi sadece Baş Yönetici, Yönetici ve Moderatörlere gösterilir.
 */
function renderUserTable(filteredUsers = users) {
    const userTableBody = document.getElementById('userTableBody');
    if (!userTableBody) return;
    userTableBody.innerHTML = '';
    
    // YETKİ KONTROLÜ AYARLARI
    const canBan = ['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE);
    const isManager = CURRENT_USER_ROLE === 'manager';
    const canViewDetails = ['super_admin', 'admin', 'manager', 'expert', 'moderator'].includes(CURRENT_USER_ROLE); 
    const loggedInUserLevel = ROLE_LEVELS[CURRENT_USER_ROLE]; 
    
    // IP bilgisini görmeye yetkili roller
    const ALLOWED_IP_ROLES = ['super_admin', 'admin', 'moderator'];
    
    // Mevcut kullanıcının rolünü al (Eğer global değişken yoksa session'dan çek)
    const currentRole = window.CURRENT_USER_ROLE || sessionStorage.getItem('CURRENT_USER_ROLE');
    
    // Mevcut kullanıcının IP görme yetkisini kontrol et
    const canSeeIP = ALLOWED_IP_ROLES.includes(currentRole);

    
    filteredUsers.forEach(user => {
        const row = userTableBody.insertRow();
        
        // --- TİK (ROZET) SİSTEMİ (TIKLANINCA AÇIKLAMA) ---
        let badgeHtml = '';
        if (user.badges) {
            // Siyah Tik (MOD)
            if (user.badges.black) {
                badgeHtml += `<span style="cursor:pointer;" title="Tıkla: Rozet Bilgisi" onclick="alert('${MOD_BADGE_ALERT_TEXT}')">${MOD_BADGE_HTML}</span>`;
            }
            // Mavi Tik (Onaylı)
            if (user.badges.blue) {
                badgeHtml += `<i class="fas fa-check-circle text-primary ms-1" style="cursor:pointer;" title="Tıkla: Rozet Bilgisi" onclick="alert('🔵 MAVİ TİK: ONAYLI HESAP')" title="Onaylı Hesap"></i>`;
            }
            // Kırmızı Tik (Aktif) -> Ateş İkonu
            if (user.badges.red) {
                badgeHtml += `<i class="fas fa-fire text-danger ms-1" style="cursor:pointer;" title="Tıkla: Rozet Bilgisi" onclick="alert('🔥 KIRMIZI TİK: YÜKSEK AKTİVİTE\\n\\nBu kullanıcı son 7 gün içinde sitede çok aktif olmuştur.')"></i>`;
            }
            // Teknisyen/Yazılımcı Tiki
            if (user.badges.tech) {
                 badgeHtml += `<i class="fas fa-code text-success ms-1" style="cursor:pointer;" title="Tıkla: Rozet Bilgisi" onclick="alert('🟢 TEKNİSYEN TİKİ: Yazılımcı/Geliştirici ekibine aittir.')"></i>`;
            }
            // VIP Tiki
            if (user.badges.vip) {
                 badgeHtml += `<i class="fas fa-star text-warning ms-1" style="cursor:pointer;" onclick="alert('⭐ VIP TİKİ: Platforma destek çıkan özel kullanıcılara verilir.')"></i>`;
            }
            
            // Sorumlu Tiki (Manager ve Expert için otomatik eklensin)
            if (user.role === 'manager' || user.role === 'expert') {
                 badgeHtml += `<span style="cursor:pointer;" title="Tıkla: Rozet Bilgisi" onclick="alert('👔 SORUMLU TİKİ: Belirli bir alanda sorumluluğu olan yetkili.')">${RESPONSIBLE_BADGE_HTML}</span>`;
            }

        }
        
        // İsim Hücresi (İsim + Tikler)
        const nameCellContent = `<strong>${user.name}</strong> ${badgeHtml}`;

        // DURUM HESAPLAMASI (Metin)
        const isPending = user.status === 'pending';
        const isNotice = user.status === 'pending_approval_notice';
        const isTimedOut = user.status.startsWith('timeout:'); 
        const isPermanentlyBanned = user.status === 'inactive' || user.status === 'banned'; // 'banned' da dahil
        
        let statusText;
        let statusBg;

        if (isTimedOut) {
            const durationMatch = user.status.match(/timeout:(\d+)/);
            const duration = durationMatch ? durationMatch[1] : '?';
            statusText = `Geçici Ban (${duration} Saat)`;
            statusBg = 'danger';
        } else if (isPermanentlyBanned) { 
            statusText = 'Kalıcı Ban'; 
            statusBg = 'danger';
        } else if (isPending) { 
            statusText = 'Onay Bekliyor'; 
            statusBg = 'warning';
        } else if (isNotice) {
            statusText = 'Onaylandı (Bildirim Bekliyor)'; 
            statusBg = 'info';
        } else { // active veya offline ise onaylanmış demektir.
            // Bu, kullanıcının sisteme giriş izni olduğu anlamına gelir.
            statusText = 'Onaylandı (Giriş İzni)'; 
            statusBg = 'success';
        }
        
        const statusBadge = `<span class="badge bg-${statusBg}">${statusText}</span>`;
        const roleName = ROLE_NAMES[user.role] || user.role;
        let actions = '<span class="text-muted">Görüntüleme Yetkisi</span>';
        
        // HİYERARŞİ KONTROLÜ
        const targetUserLevel = ROLE_LEVELS[user.role];
        const loggedInUser = users.find(u => u.name === CURRENT_USER_NAME);
        const isSelf = (loggedInUser && loggedInUser.id === user.id); 
        const shouldDisableAction = loggedInUserLevel >= targetUserLevel && !isSelf; 
        
        let permanentBanButton = '';
        let timeoutButton = '';
        let editButton = ''; 
        let deletePermanentButton = '';
        let warningButton = ''; // YENİ: Uyarı Butonu

        // YENİ: UYARI BUTONU (Kullanıcıya özel mesaj/uyarı gönder)
        if (canViewDetails && !isSelf) {
            warningButton = `<button class="btn btn-sm btn-warning me-1" onclick="openWarningModal(${user.id})" title="Kullanıcıya Uyarı Gönder"><i class="fas fa-bell"></i></button>`;
        }

        // SİLME BUTONU (Sadece Admin/SuperAdmin)
        if (CURRENT_USER_ROLE === 'super_admin' || CURRENT_USER_ROLE === 'admin') {
            const deleteButtonDisabled = (shouldDisableAction || isSelf) ? 'disabled' : ''; 
            const deleteButtonClass = (shouldDisableAction || isSelf) ? 'btn-light disabled' : 'btn-dark';
            deletePermanentButton = `<button class="btn btn-sm ${deleteButtonClass} me-1" onclick="permanentlyDeleteUser(${user.id})" ${deleteButtonDisabled} title="Sil"><i class="fas fa-user-times"></i></button>`;
        }

        // DÜZENLEME BUTONU MANTIĞI
        if (canViewDetails) {
            
            // Manager'ın sadece member ve expert'i düzenleme izni var.
            const canManagerEdit = isManager && (user.role === 'member' || user.role === 'expert');
            
            // Edit butonu görünür olacak mı?
            const editButtonVisible = ['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE) || canManagerEdit;
            
            if (editButtonVisible) {
                const editButtonClass = shouldDisableAction ? 'btn-secondary disabled' : 'btn-info';
                editButton = `<button class="btn btn-sm ${editButtonClass} me-1" onclick="prepareUserModal('edit', ${user.id})" ${shouldDisableAction ? 'disabled' : ''} title="Düzenle"><i class="fas fa-edit"></i> Düzenle</button>`;
            }
        }
        
        // AKSIYON BUTONLARI MANTIĞI (Manager Hızlı Onay)
        if (isManager && isPending) {
             // Manager'ın sadece member ve expert'i onaylama izni var.
             if (user.role === 'member' || user.role === 'expert') {
                 actions = `<button class="btn btn-sm btn-success" onclick="approveUser(${user.id})"><i class="fas fa-check"></i> Onayla</button>`;
             }
        } else if (canBan) {
             const banButtonDisabled = (shouldDisableAction || isSelf) ? 'disabled' : ''; 
             const banButtonClass = (shouldDisableAction || isSelf) ? 'btn-secondary disabled' : 'btn-danger';
             
             // Ban Butonları (Aynı kalır)
             if (isTimedOut) {
                 timeoutButton = `<button class="btn btn-sm btn-info me-1" onclick="clearTimeout(${user.id})" ${banButtonDisabled} title="Ban Kaldır"><i class="fas fa-undo"></i></button>`;
             } else if (!isPermanentlyBanned && !isPending && !isNotice) { 
                 timeoutButton = `<button class="btn btn-sm btn-warning me-1" onclick="timeoutUser(${user.id})" ${banButtonDisabled} title="Geçici Ban"><i class="fas fa-clock"></i></button>`;
             }

             if (isPermanentlyBanned) {
                 permanentBanButton = `<button class="btn btn-sm btn-success me-1" onclick="liftPermanentBan(${user.id})" ${banButtonDisabled} title="Banı Kaldır"><i class="fas fa-check"></i></button>`;
             } else if (!isPending && !isNotice) { 
                 permanentBanButton = `<button class="btn btn-sm ${banButtonClass} me-1" onclick="deleteUser(${user.id})" ${banButtonDisabled} title="Kalıcı Ban"><i class="fas fa-ban"></i></button>`;
             }
             
             actions = warningButton + editButton + timeoutButton + permanentBanButton + deletePermanentButton; // Uyarı butonu eklendi

        } else if (canViewDetails) {
            actions = warningButton + editButton + deletePermanentButton; // Uyarı butonu eklendi
        }


        // *************** ONLINE İKON MANTIĞI ***************
        // SADECE 'active' olanlar yeşil (Çevrimiçi) olmalı, diğer tüm durumlar (offline, pending, banned, notice) kırmızıdır.
        const isCurrentlyOnline = user.status === 'active'; 
        
        const onlineIconColor = isCurrentlyOnline ? 'text-success' : 'text-danger'; 
        onlineStatusIcon = `<i class="fas fa-circle ${onlineIconColor}" title="${isCurrentlyOnline ? 'Online/Aktif' : 'Offline/Pasif'}"></i>`;
        
        // ********************************************************************************
        
        // *************** YENİ: SON GİRİŞ KONUM / IP KISITLAMASI ***************
        let lastLoginHtml;
        
        if (canSeeIP) {
            const lastSuccessfulLog = user.securityLogs ? user.securityLogs
                .filter(log => log.success) // Sadece başarılı girişleri al
                .sort((a, b) => b.timestamp - a.timestamp)[0] : null; // En yeni logu al

            if (lastSuccessfulLog) {
                // Konum bilgisini, IP adresini ve zamanı gösteren HTML oluştur
                lastLoginHtml = `
                    <span class="d-block fw-bold small text-primary">${lastSuccessfulLog.location || 'Bilinmeyen Konum'}</span>
                    <span class="d-block text-muted" style="font-size: 0.75rem;">${lastSuccessfulLog.ip || '0.0.0.0'}</span>
                    <span class="d-block text-muted" style="font-size: 0.7rem;">${new Date(lastSuccessfulLog.timestamp).toLocaleString()}</span>
                `;
            } else {
                 lastLoginHtml = '<span class="text-muted small">Yok / Banlı</span>';
            }
        } else {
            // Manager, Expert ve Member rolleri için gizli alan
            lastLoginHtml = '<span class="text-muted small"><i class="fas fa-lock me-1"></i> Gizli</span>';
        }
        // **********************************************************

        row.innerHTML = `
            <td>${user.id}</td><td>${nameCellContent}</td><td>${user.email}</td><td>${roleName}</td><td>${statusBadge}</td><td>${lastLoginHtml}</td><td>${actions}</td><td>${onlineStatusIcon}</td>
        `;
    });
}
window.renderUserTable = renderUserTable;

/**
 * Kullanıcı tablosundaki filtrelemeyi uygular.
 */
function applyFilters() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    
    // NOT: userRoleFilter henüz index.html'de tanımlı olmadığı için basit arama ile devam ediyoruz.
    // const roleFilter = document.getElementById('userRoleFilter').value;

    const filtered = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm) || (user.full_name && user.full_name.toLowerCase().includes(searchTerm)) || user.email.toLowerCase().includes(searchTerm);
        // const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch; // && matchesRole;
    });

    renderUserTable(filtered);
}
window.applyFilters = applyFilters;

/**
 * Rol dropdown'larını doldurur. (Kullanıcı Düzenleme Modalı için)
 */
function populateRoleDropdowns() {
    const modalDropdown = document.getElementById('userRole');

    if (modalDropdown) modalDropdown.innerHTML = '';

    // ROLE_NAMES global olarak data_store.js'ten geliyor.
    if (typeof ROLE_NAMES === 'undefined') return;

    for (const roleId in ROLE_NAMES) {
        if (modalDropdown) {
            const modalOption = document.createElement('option');
            modalOption.value = roleId;
            modalOption.textContent = ROLE_NAMES[roleId];
            modalDropdown.appendChild(modalOption);
        }
    }
}
window.populateRoleDropdowns = populateRoleDropdowns;


// ----------------------------------------------------
// KULLANICI CRUD/BAN İŞLEMLERİ (YETKİLİ)
// ----------------------------------------------------

// YENİ FONKSİYON: Kullanıcıya Ait Moderasyon Loglarını Yükle
function renderUserModerationLogs(userName) {
    const logsContainer = document.getElementById('userModerationLogsContainer');
    if (!logsContainer) return;

    // Loglarda kullanıcı adı geçen ve ilgili eylem anahtar kelimeleri içeren logları filtrele
    const userLogs = moderationLogs.filter(log => {
        const nameInLog = log.includes(userName);
        // Genişletilmiş eylem kelimeleri, giriş ve çıkış sürelerini de içerecek
        const actionKeywords = ['banlandı', 'silindi', 'onaylandı', 'düzenledi', 'oluşturuldu', 'REDDEDİLDİ', 'GİRİŞ', 'ÇIKIŞ/SÜRE'];
        const isActionLog = actionKeywords.some(keyword => log.toUpperCase().includes(keyword.toUpperCase()));
        
        return nameInLog && isActionLog;
    }).reverse(); 

    let html = '';

    if (userLogs.length === 0) {
        html = '<li class="list-group-item text-muted small">Bu kullanıcı hakkında kayıtlı moderasyon kaydı bulunamadı.</li>';
    } else {
        html = userLogs.map(log => {
            const isBan = log.includes('BAN') || log.includes('SİLDİ');
            const isLogin = log.includes('GİRİŞ');
            const isLogout = log.includes('ÇIKIŞ/SÜRE');
            
            let logClass = 'list-group-item-light';
            if (isBan) logClass = 'list-group-item-danger';
            else if (log.includes('onaylandı')) logClass = 'list-group-item-success';
            else if (isLogin || isLogout) logClass = 'list-group-item-info';
            
            // Log metnini doğrudan bas (Detaylı log mesajları admin.js'te oluşturuluyor)
            return `<li class="list-group-item ${logClass} small">${log}</li>`;
        }).join('');
    }

    logsContainer.innerHTML = html;
}


/**
 * Kullanıcı Ekle/Düzenle modalını hazırlar.
 */
window.prepareUserModal = function(mode, userId = null) {
    // Modal Elementlerini yakala (Hata almamak için güvenli kontrol)
    const userIdInput = document.getElementById('userId'); 
    const internalUserIdInput = document.getElementById('internalUserId');
    const userNameInput = document.getElementById('userName'); 
    const userFullNameInput = document.getElementById('userFullName'); 
    const userEmailInput = document.getElementById('userEmail');
    const userPasswordInput = document.getElementById('userPassword');
    const userRoleSelect = document.getElementById('userRole');
    const userStatusSelect = document.getElementById('userStatus');
    const blackCheck = document.getElementById('badgeBlack');
    const blueCheck = document.getElementById('badgeBlue');
    const redCheck = document.getElementById('badgeRed');
    const techCheck = document.getElementById('badgeTech'); 
    const vipCheck = document.getElementById('badgeVIP'); 
    const userForm = document.getElementById('userForm');
    const submitButton = userForm ? userForm.querySelector('button[type="submit"]') : null;
    const modalLabel = document.getElementById('userModalLabel');
    const logsSection = document.getElementById('userModerationLogsSection'); 
    const logTableBody = document.getElementById('activityLogTableBody');
    const lastPostsContainer = document.getElementById('lastUserPostsContainer'); // Yeni Ekleme
    const passwordResetBtn = document.getElementById('resetPasswordButton'); // Yeni Ekleme


    // Eğer temel elementler yoksa uyarı verip çık
    // Sadece zorunlu alanları kontrol ediyoruz.
    if (!userForm || !userIdInput || !userNameInput || !userEmailInput) {
        console.error("KRİTİK HATA: #userModal içindeki zorunlu input ID'leri (userId, userName, userEmail) bulunamadı. Modal yapısını kontrol edin.");
        // Modal açılmasını engelleme (daha temiz bir deneyim için)
        alert("Admin Panel Yapılandırma Hatası: Kullanıcı düzenleme modalı doğru yüklenemedi. Lütfen Console'u kontrol edin.");
        return;
    }
    
    const userModal = document.getElementById('userModal') ? new bootstrap.Modal(document.getElementById('userModal')) : null;
    
    // YETKİ KONTROLÜ AYARLARI
    const canEditRoleAndSecurity = ['super_admin', 'admin'].includes(CURRENT_USER_ROLE);
    const isModerator = CURRENT_USER_ROLE === 'moderator';
    const isManager = CURRENT_USER_ROLE === 'manager';
    const loggedInUserLevel = ROLE_LEVELS[CURRENT_USER_ROLE];

    
    const user = users.find(u => u.id === userId);
    
    // Kendi hesabımız değilse VE yetki hiyerarşisi ihlal ediliyorsa engelleme mantığı
    const loggedInUser = users.find(u => u.name === CURRENT_USER_NAME);
    const isSelf = (loggedInUser && loggedInUser.id === userId); 
    if (user && !isSelf && ROLE_LEVELS[CURRENT_USER_ROLE] >= ROLE_LEVELS[user.role] && !canEditRoleAndSecurity) {
        if (isManager && user.role !== 'member' && user.role !== 'expert') {
             alert(`UYARI: ${ROLE_NAMES[CURRENT_USER_ROLE]} olarak, bu yetki seviyesindeki kullanıcıyı düzenleyemezsiniz.`);
             return;
        } else if (!isManager) {
             alert(`UYARI: ${ROLE_NAMES[CURRENT_USER_ROLE]} olarak, sizden daha yüksek veya eşit yetkiye sahip bir ${ROLE_NAMES[user.role]} kullanıcısını düzenleyemezsiniz.`);
             return;
        }
    }

    // Hata mesajlarını temizle
    const idError = document.getElementById('idError');
    const usernameError = document.getElementById('usernameError');
    if (idError) idError.textContent = '';
    if (usernameError) usernameError.textContent = '';
    
    userForm.reset();
    
    // Tüm inputları (yakalanabilenleri) default olarak aç
    [internalUserIdInput, userIdInput, userNameInput, userFullNameInput, userPasswordInput, userRoleSelect, userStatusSelect].forEach(el => {
        if (el) { el.disabled = false; el.readOnly = false; }
    });
    // Checkbox'ları default olarak aç
    [blackCheck, blueCheck, redCheck, techCheck, vipCheck].forEach(el => {
        if (el) el.disabled = false;
    });
    if (userEmailInput) userEmailInput.readOnly = true; 
    if (submitButton) submitButton.disabled = false;
    if (passwordResetBtn) passwordResetBtn.style.display = 'block'; // Şifre sıfırlama butonunu göster


    // ********** MODERATÖR VE MANAGER KISITLI YETKİ KONTROLLERİ **********
    if (isModerator || isManager) {
        
        // Temel Kısıtlamalar
        if (userIdInput) userIdInput.readOnly = true; 
        if (userPasswordInput) userPasswordInput.disabled = true; 
        [blackCheck, blueCheck, redCheck, techCheck, vipCheck].forEach(el => {
            if (el) el.disabled = true;
        });
        
        // Rol Kısıtlaması: Sadece Admin/SuperAdmin rol atayabilir/değiştirebilir.
        if (userRoleSelect) userRoleSelect.disabled = true;
        if (passwordResetBtn) passwordResetBtn.style.display = 'none'; // Şifre sıfırlama butonu gizlenir

        // Durum (Status) Kısıtlaması: Manager Kalıcı Ban seçemez
        if (userStatusSelect && isManager) {
             userStatusSelect.querySelectorAll('option').forEach(option => {
                 if (option.value === 'inactive') { 
                     option.disabled = true;
                 }
             });
        }
        
        // Edit modunda kısıtlı roller için ince ayar
        if (isManager && mode === 'edit' && user) {
            if (user.role === 'member' || user.role === 'expert') {
                 // Manager: Sadece durumu değiştirebilir, isimler kilitli kalır
                 if (userNameInput) userNameInput.readOnly = true;
                 if (userFullNameInput) userFullNameInput.readOnly = true;
                 if (userStatusSelect) userStatusSelect.disabled = false;
            } else {
                 // Diğer üst rollerde düzenleme kilitli
                 [userNameInput, userFullNameInput, userStatusSelect].forEach(el => {
                     if (el) { el.disabled = true; el.readOnly = true; }
                 });
                 if (submitButton) submitButton.disabled = true;
                 if (submitButton) submitButton.textContent = "Kaydet (Yetki Kısıtlaması)";
            }
        }
    } else if (!canEditRoleAndSecurity) {
        // Genel Görüntüleme modunda ise her şeyi kilitler
        [userIdInput, userNameInput, userFullNameInput, userPasswordInput, userRoleSelect, userStatusSelect, submitButton].forEach(el => {
            if (el) { el.disabled = true; el.readOnly = true; }
        });
        [blackCheck, blueCheck, redCheck, techCheck, vipCheck].forEach(el => {
            if (el) el.disabled = true;
        });
        if (passwordResetBtn) passwordResetBtn.style.display = 'none';
    }
    // ***************************************

    // Rol Dropdown'u her zaman doldurulur (Kullanıcı Yönetimi Sayfasına girince çağrılsa da)
    if (typeof populateRoleDropdowns === 'function') populateRoleDropdowns();
    
    if (mode === 'create') {
        if (modalLabel) modalLabel.textContent = 'Yeni Kullanıcı Ekle';
        if (userPasswordInput) userPasswordInput.required = true;
        if (userStatusSelect) userStatusSelect.value = 'pending'; 
        if (userIdInput) userIdInput.readOnly = false; 
        if (internalUserIdInput) internalUserIdInput.value = '';
        
        if(logTableBody) logTableBody.innerHTML = '<tr><td colspan="2" class="text-muted">Yeni kayıt</td></tr>';
        if (logsSection) logsSection.style.display = 'none'; 
        if (lastPostsContainer) lastPostsContainer.innerHTML = '';
        
    } else if (mode === 'edit' && user) {
        if (modalLabel) modalLabel.textContent = `Kullanıcıyı Düzenle: ${user.name}`;
        if (userPasswordInput) userPasswordInput.required = false; 
        
        if (internalUserIdInput) internalUserIdInput.value = user.id;
        if (userIdInput) { userIdInput.value = user.id; userIdInput.readOnly = true; } 
        if (userNameInput) userNameInput.value = user.name;
        if (userFullNameInput) userFullNameInput.value = user.full_name || ''; 
        if (userEmailInput) userEmailInput.value = user.email;
        
        // OTOMATİK DURUM SEÇİMİ (active/offline/notice ise 'active' (Onaylandı) seçilsin)
        if (userStatusSelect) {
            if (user.status === 'active' || user.status === 'offline' || user.status === 'pending_approval_notice') {
                userStatusSelect.value = 'active'; 
            } else {
                 userStatusSelect.value = user.status;
            }
        }
        
        if (userRoleSelect) userRoleSelect.value = user.role;
            
        // Tik Seçenekleri doldurulur 
        if (!user.badges) user.badges = { black: false, blue: false, red: false, tech: false, vip: false };
            
        if(blackCheck) blackCheck.checked = user.badges.black;
        if(blueCheck) blueCheck.checked = user.badges.blue;
        if(redCheck) redCheck.checked = user.badges.red;
        if(techCheck) techCheck.checked = user.badges.tech; 
        if(vipCheck) vipCheck.checked = user.badges.vip;   
        
        // Ek Super Admin kısıtlamaları (siyah tik ve rol)
        if (canEditRoleAndSecurity) {
            if(blackCheck) blackCheck.disabled = CURRENT_USER_ROLE !== 'super_admin';
            if (userRoleSelect) userRoleSelect.disabled = !canEditRoleAndSecurity;
        }

        // Aktivite Log Tablosu
        if (logTableBody) {
            logTableBody.innerHTML = '';
            const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
                
            days.forEach(day => {
                const minutes = user.activityLogs ? (user.activityLogs[day] || 0) : 0;
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                let timeString = "";
                    
                if(hours > 0) timeString += `<strong>${hours} sa</strong> `;
                if(mins > 0 || hours === 0) timeString += `${mins} dk`;
                    
                const rowClass = minutes > 0 ? 'table-success' : '';
                    
                logTableBody.innerHTML += `
                    <tr class="${rowClass}">
                        <td>${day}</td>
                        <td>${timeString}</td>
                    </tr>`;
            });
        }
        
        // YENİ EKLEME: Son Gönderi Önizlemesi
        if (lastPostsContainer) {
             renderLastUserPosts(user.name, lastPostsContainer);
        }
            
        // Moderasyon Loglarını Yükle ve Göster
        if (logsSection) logsSection.style.display = 'block'; 
        renderUserModerationLogs(user.name);
        
        // Şifre sıfırlama butonu event'ı (sadece gösteriliyorsa)
        if (passwordResetBtn && passwordResetBtn.style.display !== 'none') {
             passwordResetBtn.onclick = () => resetUserPassword(user.id, user.name);
        }
    }
    if (userModal) userModal.show();
}

/**
 * Kullanıcının son 3 gönderisini modal içinde listeler.
 */
function renderLastUserPosts(userName, container) {
    const userPosts = posts
        .filter(p => p.user === userName)
        .sort((a, b) => b.timestamp - a.timestamp) // En yeniyi en üste al
        .slice(0, 3); // Son 3 gönderiyi al
        
    if (userPosts.length === 0) {
        container.innerHTML = '<p class="text-muted small">Bu kullanıcı henüz bir gönderi paylaşmadı.</p>';
        return;
    }

    container.innerHTML = `
        <h6 class="text-primary small">Son 3 Aktif Gönderi:</h6>
        <ul class="list-group list-group-flush small">
            ${userPosts.map(p => `
                <li class="list-group-item d-flex justify-content-between align-items-center p-2">
                    <div style="max-width: 80%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <strong>#${p.id}:</strong> ${p.content}
                    </div>
                    <span class="badge bg-${p.status === 'active' ? 'success' : (p.status === 'pending' ? 'warning' : 'danger')}">${p.status}</span>
                </li>
            `).join('')}
        </ul>
    `;
}


/**
 * Şifreyi rastgele bir değere sıfırlar. (Sadece Admin/SuperAdmin)
 */
window.resetUserPassword = function(userId, userName) {
    if (!['super_admin', 'admin'].includes(CURRENT_USER_ROLE)) {
        window.showAdminToast('⛔ Yetki Hatası: Şifre sıfırlama yetkiniz yok.', 'danger');
        return;
    }
    
    if (confirm(`${userName} kullanıcısının şifresi rastgele bir değere sıfırlanacaktır. Emin misiniz?`)) {
        const newPassword = Math.random().toString(36).slice(-8); // 8 karakterli rastgele şifre
        
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            saveUserData();
            
            // Loglama
            moderationLogs.push(`[ŞİFRE SIFIRLAMA] ${CURRENT_USER_NAME}, ${userName} kullanıcısının şifresini sıfırladı. Yeni Şifre: ${newPassword}`);
            window.saveModerationLogs();
            
            alert(`✅ Şifre başarıyla sıfırlandı!\nYeni Şifre: ${newPassword}\n\nNOT: Lütfen bu şifreyi güvenli bir kanaldan kullanıcıya iletin.`);
        }
    }
}

/**
 * Kullanıcıyı düzenler/ekler (Form Submit Handler)
 */
function handleUserSubmit(e) {
    e.preventDefault();
    
    // Güvenli element yakalama ve değer alma
    const internalId = document.getElementById('internalUserId')?.value;
    const newId = parseInt(document.getElementById('userId')?.value); 
    const name = document.getElementById('userName')?.value.trim();
    const fullName = document.getElementById('userFullName')?.value.trim(); 
    const email = document.getElementById('userEmail')?.value;
    const password = document.getElementById('userPassword')?.value; 
    const role = document.getElementById('userRole')?.value;
    const status = document.getElementById('userStatus')?.value; // Bu modal'dan gelen status (active/inactive/pending)
    
    // Temel null/undefined kontrolü (Çalışmama hatası riskini azaltır)
    if (!name || !newId || !role || !status) { alert("Form alanları eksik. Lütfen tüm zorunlu alanları doldurun."); return; }

    const idError = document.getElementById('idError');
    const usernameError = document.getElementById('usernameError');
    if (idError) idError.textContent = '';
    if (usernameError) usernameError.textContent = '';
    
    // YETKİ KONTROLÜ
    const canEditRoleAndSecurity = ['super_admin', 'admin'].includes(CURRENT_USER_ROLE);
    const isModeratorOrManager = ['moderator', 'manager'].includes(CURRENT_USER_ROLE);
    const canSave = canEditRoleAndSecurity || isModeratorOrManager; 

    // Rozetleri sadece Admin/SuperAdmin değiştirebilir.
    const badgeBlack = document.getElementById('badgeBlack')?.checked || false;
    const badgeBlue = document.getElementById('badgeBlue')?.checked || false;
    const badgeRed = document.getElementById('badgeRed')?.checked || false;
    const badgeTech = document.getElementById('badgeTech')?.checked || false;
    const badgeVIP = document.getElementById('badgeVIP')?.checked || false;

    if (!canSave) { 
        alert("Yetki hatası: Değişiklikleri kaydetme yetkiniz yok."); 
        return; 
    }
    
    // MANAGER Kalıcı Ban Kısıtlaması (Modal Kaydetme sırasında)
    if (CURRENT_USER_ROLE === 'manager' && status === 'inactive') {
        alert("Yetki hatası: Manager olarak Kalıcı Ban durumunu bu modal aracılığıyla atayamazsiniz. Sadece onay/onay bekleme işlemlerini yapabilirsiniz.");
        return;
    }
    
    let isEditMode = !!internalId;
    let currentUser = isEditMode ? users.find(u => u.id == internalId) : null;
    let nameChange = isEditMode && currentUser.name !== name;

    // --- BENZERSİZLİK KONTROLLERİ ---
    if (!isEditMode || (isEditMode && newId !== currentUser.id)) {
        if (users.some(u => u.id === newId)) {
            if (idError) idError.textContent = 'Bu ID numarası zaten kullanımda.';
            return;
        }
    }
    if (users.some(u => u.name.toLowerCase() === name.toLowerCase() && u.id != internalId)) {
        if (usernameError) usernameError.textContent = 'Bu kullanıcı adı zaten kullanımda.';
            return;
    }
    
    
    // --- KAYIT VEYA GÜNCELLEME İŞLEMİ ---

    if (isEditMode) {
        const index = users.findIndex(u => u.id == internalId);
        if (index !== -1) {
            const oldName = users[index].name; 
            
            // Moderator ve Manager için kısıtlı alanlar (Şifre, Rol)
            const newPassword = (isModeratorOrManager || !password) ? users[index].password : (password || users[index].password);
            
            // Rol: Kısıtlı roller için eski rol korunur, Admin/Super Admin için yeni rol atanır.
            const newRole = (isModeratorOrManager) ? users[index].role : role;

            // Durum Güncelleme Mantığı 
            let newStatus = status;
            
            // DÜZELTME: Eğer modal'da 'Onaylandı (Giriş İzni)' seçildiyse (value='active'),
            // ve kullanıcı durumu pending/notice değilse, 'offline' olarak ayarlanır.
            if (newStatus === 'active') {
                newStatus = (users[index].status === 'active' || users[index].status === 'offline' || users[index].status === 'pending_approval_notice') ? users[index].status : 'offline';
            }
            
            // Log mesajı için değişiklikleri kontrol et
            let changes = [];
            if (oldName !== name) changes.push(`İsim: ${oldName} -> ${name}`);
            if (users[index].role !== newRole) changes.push(`Rol: ${ROLE_NAMES[users[index].role]} -> ${ROLE_NAMES[newRole]}`);
            if (users[index].status !== newStatus) changes.push(`Durum: ${users[index].status} -> ${newStatus}`);
            
            // Rozet değişikliklerini logla
            const logBadgeChange = (badgeName, isChecked, oldValue) => {
                if (isChecked !== oldValue) {
                    changes.push(`${badgeName} Rozeti: ${oldValue ? 'Var' : 'Yok'} -> ${isChecked ? 'Var' : 'Yok'}`);
                }
            };
            if(canEditRoleAndSecurity) {
                logBadgeChange('Siyah Tik', badgeBlack, users[index].badges?.black);
                logBadgeChange('Mavi Tik', badgeBlue, users[index].badges?.blue);
                logBadgeChange('Kırmızı Tik', badgeRed, users[index].badges?.red);
                logBadgeChange('Teknisyen', badgeTech, users[index].badges?.tech);
                logBadgeChange('VIP', badgeVIP, users[index].badges?.vip);
            }
            
            // Log mesajı oluştur
            let logMessage = `[DÜZENLEME] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME}, ${oldName} kullanıcısının detaylarını düzenledi.`;
            if(changes.length > 0) {
                 logMessage += ` Değişiklikler: (${changes.join(', ')})`;
            }

            users[index] = { 
                ...users[index],
                id: newId,
                name: name, 
                full_name: fullName, 
                email: email, 
                password: newPassword, 
                role: newRole, 
                status: newStatus, // Yeni durum atanır (Ban/Pending/Active/Offline ise)
                // Rozetler sadece Admin/SuperAdmin değiştirebilir, aksi takdirde eski rozetler korunur.
                badges: (canEditRoleAndSecurity) ? { black: badgeBlack, blue: badgeBlue, red: badgeRed, tech: badgeTech, vip: badgeVIP } : users[index].badges
            };
            
            moderationLogs.push(logMessage);
            
            if (users[index].id == internalId && nameChange) {
                 sessionStorage.setItem('CURRENT_USER_NAME', name);
            }
        }
    } else {
        // Yeni Kullanıcı Ekleme
        if (!password) { alert("Yeni kullanıcı eklemek için şifre alanı zorunludur."); return; }
        
        // Yeni kullanıcı eklerken, Moderator ve Manager sadece kendi altındaki rolleri atayabilir.
        if (isModeratorOrManager) {
            const currentLevel = ROLE_LEVELS[CURRENT_USER_ROLE];
            const targetLevel = ROLE_LEVELS[role];

            // Atanmak istenen rol, mevcut kullanıcının seviyesinden (numara olarak) BÜYÜK (yani daha düşük yetkili) OLMALI
            if (currentLevel >= targetLevel) {
                 alert(`Yetki hatası: ${ROLE_NAMES[CURRENT_USER_ROLE]} olarak kendinizle eşit veya üst düzeyde rol (örn: ${ROLE_NAMES[role]}) atayamazsınız.`);
                 return;
            }
        }
        
        // Yeni oluşturulan kullanıcı onaylandıysa, durumunu "offline" olarak ayarla
        let finalStatus = status;
        if (finalStatus === 'active') {
             finalStatus = 'offline';
        }


        const newRole = role || 'member'; 
        users.push({ 
            id: newId, 
            name: name, 
            full_name: fullName, 
            email: email, 
            password: password, 
            role: newRole, 
            status: finalStatus, 
            ban_reason: "",
            badges: { black: badgeBlack, blue: blueCheck, red: redCheck, tech: techCheck, vip: vipCheck }, 
            activityLogs: {},
            securityLogs: []
        }); 
        moderationLogs.push(`[KULLANICI OLUŞTURMA] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME}: Yeni kullanıcı (${name}, ID: ${newId}, Rol: ${ROLE_NAMES[newRole]}) oluşturuldu.`);
    }
    
    saveUserData();
    saveModerationLogs();
    renderUserTable();
    const modalEl = document.getElementById('userModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if(modalInstance) modalInstance.hide();

    window.updateDashboardMetrics(); 
}

window.editUser = function(userId) { prepareUserModal('edit', userId); }

window.approveUser = function(userId) {
    // Onay yetkisi Manager/Moderator/Admin/SuperAdmin'de
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Yetki kontrolü (mevcut mantık aynı)
    if (CURRENT_USER_ROLE === 'manager' && user.role !== 'member' && user.role !== 'expert') {
         alert("Yetki hatası: Manager olarak sadece 'Kullanıcı' ve 'Uzman' rollerini onaylayabilirsiniz.");
         return;
    }
    
    if (ROLE_LEVELS[CURRENT_USER_ROLE] > ROLE_LEVELS['moderator'] && CURRENT_USER_ROLE !== 'manager') { return; } 

    const userIndex = users.findIndex(u => u.id === userId);
    // Onay sadece 'pending' durumundakiler için geçerlidir.
    if (userIndex === -1 || users[userIndex].status !== 'pending') { return; }
    
    if (confirm(`Kullanıcı ${users[userIndex].name}'i onaylayıp, durumunu bildirim bekleme moduna almak istediğinizden emin misiniz?`)) {
        
        // YENİ KRİTİK MANTIK: Kullanıcıyı direkt 'offline' yapmak yerine, onay bildirimini bekleyen duruma al.
        users[userIndex].status = 'pending_approval_notice'; 
        users[userIndex].showPendingWarning = false; // İlk uyarıyı kapat

        saveUserData();
        renderUserTable();
        window.updateSidebarBadges();
        
        moderationLogs.push(`[ONAY] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME}: ${users[userIndex].name} kullanıcısı onaylandı ve bildirim bekliyor. (Rol: ${ROLE_NAMES[users[userIndex].role]})`);
        window.saveModerationLogs();
        window.renderModerationLogs();
        window.updateDashboardMetrics(); 
        
        alert(`Kullanıcı ${users[userIndex].name} başarıyla onaylandı. Kullanıcıya özel bir bildirim mesajı gösterilecektir.`);
    }
}

// **KENDİNİ BANLAMAYI ENGELLEYEN GÜNCELLEME**
window.timeoutUser = function(userId) {
    const canBan = ['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE);
    const userIndex = users.findIndex(u => u.id === userId);
    if (!canBan || userIndex === -1) { return; }
    const userToTimeout = users[userIndex];
    const loggedInUser = users.find(u => u.name === CURRENT_USER_NAME);
    const isSelf = (loggedInUser && loggedInUser.id === userId);

    if (ROLE_LEVELS[CURRENT_USER_ROLE] >= ROLE_LEVELS[userToTimeout.role] && !isSelf) { alert("Yetki hatası: Kendi seviyenize veya sizden yüksek yetkiye sahip bir kullanıcıya işlem yapamazsiniz."); return; }
    if (isSelf) { alert("Yetki hatası: Kendi hesabınızı banlayamazsınız."); return; } 
    
    let duration = prompt(`Kaç saat ban?`, "1");
    if (!duration || isNaN(parseInt(duration)) || parseInt(duration) <= 0) { return; }
    duration = parseInt(duration);
    
    // YENİ EKLEME: Hazır sebep listesini kullanarak ban sebebi al
    const reasonList = BAN_REASONS.map((r, i) => `${i + 1}. ${r}`).join('\n');
    const customReasonPrompt = `Kullanıcı ${userToTimeout.name} ${duration} saat süreliğine banlanacaktır.\n\nHazır Sebepler:\n${reasonList}\n\nLütfen ban sebebini yazın (Veya yukarıdaki numarayı girin):`;

    let reason = prompt(customReasonPrompt, BAN_REASONS[0]);
    
    if (reason !== null) {
        reason = reason.trim();
        const reasonNumber = parseInt(reason);
        if (!isNaN(reasonNumber) && reasonNumber > 0 && reasonNumber <= BAN_REASONS.length) {
            reason = BAN_REASONS[reasonNumber - 1];
        } else if (reason === "") {
             alert("Sebep girmelisiniz."); return;
        }

        if (confirm(`Kullanıcı ${userToTimeout.name}, ${duration} saat süreliğine banlanacaktır? Sebep: "${reason}"`)) {
            userToTimeout.status = `timeout:${duration}`; 
            userToTimeout.ban_reason = reason;
            saveUserData();
            renderUserTable();
            moderationLogs.push(`[GEÇİCİ BAN] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME}: ${userToTimeout.name} geçici banlandı (${duration} saat). Sebep: ${reason}.`);
            window.saveModerationLogs();
            window.renderModerationLogs();
            window.updateDashboardMetrics(); 
        }
    }
}

// **KENDİ BANINI KALDIRMAYI ENGELLEYEN GÜNCELLEME**
window.clearTimeout = function(userId) {
    const canBan = ['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE);
    const userIndex = users.findIndex(u => u.id === userId);
    if (!canBan || userIndex === -1) { return; }
    const userToClear = users[userIndex];
    const loggedInUser = users.find(u => u.name === CURRENT_USER_NAME);
    const isSelf = (loggedInUser && loggedInUser.id === userId);

    if (ROLE_LEVELS[CURRENT_USER_ROLE] >= ROLE_LEVELS[userToClear.role] && !isSelf) { alert("Yetki hatası."); return; }
    if (isSelf) { alert("Yetki hatası: Kendi hesabınızın banını kaldıramazsınız."); return; } 

    if (confirm(`Geçici ban kaldırılsın mı?`)) {
        // BAN KALDIRILDIĞINDA KULLANICI DURUMU ARTIK 'offline' OLARAK AYARLANIR
        userToClear.status = 'offline'; 
        userToClear.ban_reason = "";
        saveUserData();
        renderUserTable();
        moderationLogs.push(`[BAN KALDIRILDI] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME}: ${userToClear.name} geçici banı kaldırıldı.`);
        window.saveModerationLogs();
        window.renderModerationLogs();
        window.updateDashboardMetrics(); 
    }
}

// **KENDİSİNE KALICI BAN ATMAYI ENGELLEYEN GÜNCELLEME**
window.deleteUser = function(userId) {
    const canBan = ['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE);
    const userIndex = users.findIndex(u => u.id === userId);
    if (!canBan || userIndex === -1) { return; }
    const userToBan = users[userIndex];
    const loggedInUser = users.find(u => u.name === CURRENT_USER_NAME);
    const isSelf = (loggedInUser && loggedInUser.id === userId);
    
    if (ROLE_LEVELS[CURRENT_USER_ROLE] >= ROLE_LEVELS[userToBan.role] && !isSelf) { alert("Yetki hatası."); return; }
    if (isSelf) { alert("Yetki hatası: Kendi hesabınıza kalıcı ban atamazsınız."); return; } 
    
    // YENİ EKLEME: Hazır sebep listesini kullanarak ban sebebi al
    const reasonList = BAN_REASONS.map((r, i) => `${i + 1}. ${r}`).join('\n');
    const customReasonPrompt = `Kullanıcı ${userToBan.name} kalıcı olarak banlanacaktır.\n\nHazır Sebepler:\n${reasonList}\n\nLütfen ban sebebini yazın (Veya yukarıdaki numarayı girin):`;

    let reason = prompt(customReasonPrompt, BAN_REASONS[0]);
    
    if (reason !== null) {
        reason = reason.trim();
        const reasonNumber = parseInt(reason);
        if (!isNaN(reasonNumber) && reasonNumber > 0 && reasonNumber <= BAN_REASONS.length) {
            reason = BAN_REASONS[reasonNumber - 1];
        } else if (reason === "") {
             alert("Sebep girmelisiniz."); return;
        }

        if (confirm(`Kullanıcı ${userToBan.name} kalıcı olarak banlanacaktır? Sebep: "${reason}"`)) {
            users[userIndex].status = 'inactive';
            users[userIndex].ban_reason = reason;
            saveUserData();
            renderUserTable();
            moderationLogs.push(`[KALICI BAN] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME}: ${userToBan.name} kalıcı banlandı. Sebep: ${reason}`);
            window.saveModerationLogs();
            window.renderModerationLogs();
            window.updateDashboardMetrics(); 
        }
    }
}

// **KENDİ BANINI KALDIRMAYI ENGELLEYEN GÜNCELLEME (Kalıcı)**
window.liftPermanentBan = function(userId) {
    const canBan = ['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE);
    const userIndex = users.findIndex(u => u.id === userId);
    if (!canBan || userIndex === -1) { return; }
    const userToClear = users[userIndex];
    const loggedInUser = users.find(u => u.name === CURRENT_USER_NAME);
    const isSelf = (loggedInUser && loggedInUser.id === userId);

    if (ROLE_LEVELS[CURRENT_USER_ROLE] >= ROLE_LEVELS[userToClear.role] && !isSelf) { alert("Yetki hatası."); return; }
    if (isSelf) { alert("Yetki hatası: Kendi hesabınızın banını kaldıramazsınız."); return; } 

    if (confirm(`Kullanıcı ${userToClear.name}'nin kalıcı banı kaldırılsın mı?`)) {
        // BAN KALDIRILDIĞINDA KULLANICI DURUMU ARTIK 'offline' OLARAK AYARLANIR
        userToClear.status = 'offline'; 
        userToClear.ban_reason = "";
        saveUserData();
        renderUserTable();
        moderationLogs.push(`[BAN KALDIRILDI] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME}: ${userToClear.name} kalıcı banı kaldırıldı.`);
        window.saveModerationLogs();
        window.renderModerationLogs();
        window.updateDashboardMetrics(); 
    }
}

// **KENDİ HESABINI SİLMEYİ ENGELLEYEN VE VERİ TEMİZLİĞİ YAPAN GÜNCELLEME**
window.permanentlyDeleteUser = function(userId) {
    const canDelete = ['super_admin', 'admin'].includes(CURRENT_USER_ROLE);
    const userIndex = users.findIndex(u => u.id === userId);
    if (!canDelete || userIndex === -1) { return; }
    const userToDelete = users[userIndex];
    const loggedInUser = users.find(u => u.name === CURRENT_USER_NAME);
    const isSelf = (loggedInUser && loggedInUser.id === userToDelete.id);

    if (ROLE_LEVELS[CURRENT_USER_ROLE] >= ROLE_LEVELS[userToDelete.role] && !isSelf) { alert("Yetki hatası."); return; }
    if (isSelf) { alert("Yetki hatası: Kendi hesabınızı kalıcı olarak silemezsiniz."); return; } 

    if (confirm(`DİKKAT! ${userToDelete.name} hesabı SİLİNECEK. Bu işlem geri alınamaz ve tüm ilişkili veriler silinecektir. Onaylıyor musunuz?`)) {
        
        // 1. KAPSAMLI VERİ TEMİZLİĞİ
        
        // A. Takip/Takipçi Listelerini Temizle
        users.forEach(u => {
            if (u.followers) u.followers = u.followers.filter(id => id !== userId);
            if (u.following) u.following = u.following.filter(id => id !== userId);
            if (u.pendingFollowers) u.pendingFollowers = u.pendingFollowers.filter(id => id !== userId);
        });

        // B. Gönderileri Temizle
        posts = posts.filter(post => post.user !== userToDelete.name);
        savePostData();

        // C. Hikayeleri Temizle
        window.stories = window.stories.filter(story => story.user !== userToDelete.name);
        saveStoryData();
        
        // D. Raporları Temizle (Şikayet eden ve şikayet edilen olarak)
        reports = reports.filter(report => report.targetId !== userId && report.reportedBy !== userToDelete.name);
        saveReportData();

        // E. Özel Mesajları Temizle
        if (typeof privateMessages !== 'undefined') {
            privateMessages = privateMessages.filter(msg => msg.sender !== userToDelete.name && msg.receiver !== userToDelete.name);
            savePrivateMessages();
        }

        // F. Ekip Sohbetini Temizle (Sadece gönderilen mesajları temizle)
        if (typeof chatMessages !== 'undefined') {
            chatMessages = chatMessages.filter(msg => msg.user !== userToDelete.name);
            saveChatData();
        }

        // 2. Kullanıcıyı Sil
        users = users.filter(user => user.id !== userId);
        saveUserData();
        
        // 3. Arayüzü Güncelle
        renderUserTable();
        moderationLogs.push(`[HESAP SİLİNDİ] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${CURRENT_USER_NAME}: ${userToDelete.name} hesabını SİLDİ ve tüm verileri temizlendi.`);
        window.saveModerationLogs();
        window.renderModerationLogs();
        window.updateDashboardMetrics(); 
        
        alert(`Kullanıcı hesabı ve tüm ilişkili verileri kalıcı olarak silinmiştir.`);
    }
}


// ----------------------------------------------------
// KULLANICI UYARI SİSTEMİ (YENİ EKLENTİ)
// ----------------------------------------------------

/**
 * Kullanıcıya özel uyarı gönderme modalını açar.
 * NOT: Bu fonksiyon, index.html'e eklenmiş olan <div class="modal fade" id="warningModal" ...> yapısını kullanır.
 * @param {number} userId - Uyarı gönderilecek kullanıcının ID'si.
 */
window.openWarningModal = function(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Modal Elementlerini yakala
    const modalEl = document.getElementById('warningModal');
    const titleEl = document.getElementById('warningModalTitle');
    const targetIdEl = document.getElementById('warningTargetUserId');
    const targetNameEl = document.getElementById('warningTargetUserName');
    
    if (!modalEl || !titleEl) {
        // Eğer modal HTML'i eksikse hata verir
        alert("Uyarı Modal öğesi (ID: warningModal) bulunamadı. Lütfen index.html dosyanızı kontrol edin.");
        return;
    }
    
    // Değerleri doldur
    titleEl.textContent = `${user.name} kullanıcısına uyarı gönder`;
    targetIdEl.value = userId;
    targetNameEl.textContent = user.name;
    
    // YENİ EKLEME: Hazır sebep listesi
    const reasonSelect = document.getElementById('warningReasonSelect');
    if (reasonSelect) {
         // Seçenekleri oluştur
         const optionsHtml = BAN_REASONS.map(r => `<option value="${r}">${r}</option>`).join('');
         reasonSelect.innerHTML = `<option value="">--- Veya Hazır Sebep Seç ---</option>` + optionsHtml;
    }
    document.getElementById('warningMessageInput').value = '';
    
    // Modal'ı göster
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

/**
 * KRİTİK DEĞİŞİKLİK: Kullanıcıya özel uyarı mesajını gönderir (privateMessages dizisine).
 */
window.sendUserWarning = function(e) {
    e.preventDefault();
    
    const userId = parseInt(document.getElementById('warningTargetUserId').value);
    const message = document.getElementById('warningMessageInput').value.trim();
    const selectedReason = document.getElementById('warningReasonSelect')?.value;
    
    const finalMessage = message || selectedReason;
    
    if (!finalMessage) return alert("Uyarı mesajı veya hazır bir sebep seçimi boş olamaz.");

    const user = users.find(u => u.id === userId);
    const senderName = CURRENT_USER_NAME; // Uyarının kimden geldiği (Admin/Mod)

    if (!user || !senderName) return;
    
    // YENİ SİSTEM MESAJI OBJESİ: Private Messages dizisine eklenir
    const newMessage = {
        id: Date.now(),
        sender: `Sistem Uyarısı (${ROLE_NAMES[CURRENT_USER_ROLE]} ${senderName})`, // Göndericiyi detaylı yapalım
        receiver: user.name,
        text: `❗ YÖNETİCİ UYARISI: ${finalMessage}`,
        timestamp: Date.now(),
        read: false // Kullanıcı okuyana kadar yeni mesaj olarak kalır
    };
    
    window.privateMessages.push(newMessage);
    window.savePrivateMessages(); // Kalıcı kaydet

    // Loglama
    const logMessage = `[UYARI GÖNDERİLDİ] ${ROLE_NAMES[CURRENT_USER_ROLE]} ${senderName} -> ${user.name} (Özel Mesaj): "${finalMessage.substring(0, 50)}..."`;
    moderationLogs.push(logMessage);
    window.saveModerationLogs();
    window.renderModerationLogs();

    // Admin'e başarı bildirimi göster
    if (typeof window.showAdminToast === 'function') {
        window.showAdminToast(`✅ Uyarı ${user.name} kullanıcısının MESAJLARINA gönderildi.`, 'info', 4000);
    }
    
    // Modal'ı kapat
    const modalEl = document.getElementById('warningModal');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl).hide();
    }
}