// =======================================================
// messages.js: ÖZEL MESAJLAŞMA MANTIĞI (GELİŞMİŞ)
// =======================================================

let currentChatUser = null; 

document.addEventListener('DOMContentLoaded', () => {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    if (!currentUserName) { window.location.href = 'login.html'; return; }

    const currentUser = users.find(u => u.name === currentUserName);
    if(currentUser) {
        document.getElementById('mainUserName').textContent = currentUser.name;
        document.getElementById('userRoleBadge').textContent = ROLE_NAMES[currentUser.role] || 'Üye';
        document.getElementById('sidebarUserAvatar').src = currentUser.profileImage || "https://via.placeholder.com/60";
    }

    loadFriendsList();
    checkUnreadMessages(false); // İlk yüklemede pop-up'ı tetikleme

    document.getElementById('sendMessageForm').addEventListener('submit', sendMessage);

    // Canlı Yenileme (Mesajlar ve Bildirimler)
    setInterval(() => {
        if(currentChatUser) {
            renderMessages(false);
        }
        checkUnreadMessages(true); // KRİTİK: True göndererek pop-up kontrolünü tetikle
    }, 2000);
    
    // Tarayıcı bildirim izni
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

// --- YARDIMCI FONKSİYON: Sansürleme için global kopyayı kullan (messages.js) ---
function safeFilterWords(text) {
    if (typeof window.filterBlacklistedWords === 'function') {
        return window.filterBlacklistedWords(text);
    }
    return text;
}
// ---------------------------------------------------------------------------------


// --- BİLDİRİM SİSTEMİ ---
function checkUnreadMessages(shouldShowNotification = false) {
    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const unreadMessages = privateMessages.filter(msg => 
        msg.receiver === currentUserName && !msg.read
    );

    // Mesajlar Sidebar Rozeti
    const badge = document.getElementById('msgNotificationBadge');
    if (badge) {
        badge.textContent = unreadMessages.length > 0 ? unreadMessages.length : '';
        badge.style.display = unreadMessages.length > 0 ? 'inline-block' : 'none';
    }

    // Anlık Tarayıcı Bildirimi (Pop-up)
    if (shouldShowNotification && unreadMessages.length > 0 && Notification.permission === 'granted') {
        const latestMsg = unreadMessages[unreadMessages.length - 1];
        
        // Sadece son 5 saniyede gelen mesajlar için bildirimi tetikle
        if (Date.now() - latestMsg.timestamp < 5000) {
            
            // Sistem uyarıları için özel başlık ve ses
            if (latestMsg.sender.startsWith('Sistem Uyarısı')) {
                 const audio = new Audio('https://s3-us-west-2.amazonaws.com/s.cdpn.io/3/success.mp3');
                 audio.play().catch(e => console.error("Ses çalma hatası:", e));
                 
                 new Notification("📢 KRİTİK SİSTEM UYARISI!", {
                    body: latestMsg.text,
                    icon: "https://via.placeholder.com/40/FF0000/FFFFFF?text=SYS"
                 });
                 
            } else if (latestMsg.sender !== currentChatUser) {
                 // Normal özel mesaj bildirimi
                 new Notification(`Yeni Mesaj: ${latestMsg.sender}`, {
                    body: latestMsg.text.substring(0, 50) + '...',
                    icon: getUserAvatar(latestMsg.sender)
                 });
            }
        }
    }
}

// --- LİSTELEME ---
function loadFriendsList() {
    const listContainer = document.getElementById('friendsList');
    listContainer.innerHTML = '';

    const currentUserName = sessionStorage.getItem('CURRENT_USER_NAME');
    const currentUser = users.find(u => u.name === currentUserName);
    
    const friendsMap = new Map();
    if (currentUser && currentUser.following) {
        currentUser.following.forEach(friendId => {
            const friend = users.find(u => u.id === friendId);
            if (friend) friendsMap.set(friend.name, friend);
        });
    }
    
    // KRİTİK EKLEME: Sistem uyarıları için sahte bir kullanıcı kaydı ekle
    const systemMessagesExist = privateMessages.some(m => m.receiver === currentUserName && m.sender.startsWith('Sistem Uyarısı'));
    
    if (systemMessagesExist) {
        const unreadSystemWarnings = privateMessages.filter(m => m.receiver === currentUserName && m.sender.startsWith('Sistem Uyarısı') && !m.read).length;
        
        friendsMap.set("SYSTEM_WARNINGS", { 
            name: "Sistem Uyarıları", 
            id: 0, 
            profileImage: "https://via.placeholder.com/45/FF0000/FFFFFF?text=SYS", 
            role: 'system',
            unreadCount: unreadSystemWarnings
        });
    }
    
    
    friendsMap.forEach((friend, key) => {
        const friendName = friend.name;
        const isActive = currentChatUser === friendName || (key === "SYSTEM_WARNINGS" && currentChatUser === "SYSTEM_WARNINGS") ? 'active' : '';
        const isSystem = friend.role === 'system';
        
        if (isSystem) {
             const badgeHtml = friend.unreadCount > 0 ? `<span class="badge bg-danger ms-2">${friend.unreadCount}</span>` : '';
             const item = document.createElement('div');
             item.className = `list-group-item list-group-item-action chat-list-item p-2 border-0 d-flex justify-content-between align-items-center ${isActive}`;
             item.onclick = () => startChat("SYSTEM_WARNINGS");
             item.innerHTML = `
                <div class="d-flex align-items-center flex-grow-1" style="cursor:pointer;">
                    <img src="${friend.profileImage}" class="rounded-circle me-3 shadow-sm" width="45" height="45" style="object-fit:cover;">
                    <div>
                        <h6 class="mb-0 text-danger fw-bold" style="font-size: 0.95rem;">${friend.name}</h6>
                        <small class="text-muted" style="font-size: 0.7rem;">Yeni Uyarılar</small>
                    </div>
                </div>
                ${badgeHtml}`;
             listContainer.appendChild(item);
             return;
        }


        // Normal Arkadaş Listesi
        const item = document.createElement('div');
        item.className = `list-group-item list-group-item-action chat-list-item p-2 border-0 d-flex justify-content-between align-items-center ${isActive}`;
        
        // Sol taraf: Avatar ve İsim
        const userInfoDiv = document.createElement('div');
        userInfoDiv.className = "d-flex align-items-center flex-grow-1";
        userInfoDiv.style.cursor = "pointer";
        userInfoDiv.onclick = () => startChat(friend.name);
        userInfoDiv.innerHTML = `
            <img src="${friend.profileImage || 'https://via.placeholder.com/40'}" class="rounded-circle me-3 shadow-sm" width="45" height="45" style="object-fit:cover;">
            <div>
                <h6 class="mb-0 text-dark fw-bold" style="font-size: 0.95rem;">${friend.name}</h6>
                <small class="text-muted" style="font-size: 0.7rem;">${ROLE_NAMES[friend.role]}</small>
            </div>
        `;

        // Sağ taraf: Kullanıcı Raporlama Butonu
        const actionDiv = document.createElement('div');
        actionDiv.innerHTML = `
            <button class="btn btn-sm btn-outline-danger border-0" title="Kullanıcıyı Raporla" onclick="reportUserFromChat('${friend.name}')">
                <i class="fas fa-exclamation-circle"></i>
            </button>
        `;

        item.appendChild(userInfoDiv);
        item.appendChild(actionDiv);
        listContainer.appendChild(item);
    });
}

function startChat(targetUserName) {
    currentChatUser = targetUserName;
    const myName = sessionStorage.getItem('CURRENT_USER_NAME');
    
    // Sistem uyarısı özel durum kontrolü
    if (targetUserName === "SYSTEM_WARNINGS") {
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('chatWindow').style.display = 'flex';
        document.getElementById('chatHeaderName').textContent = "SİSTEM YÖNETİMİ";
        document.getElementById('chatHeaderAvatar').src = "https://via.placeholder.com/40/FF0000/FFFFFF?text=SYS";
        document.getElementById('chatHeaderStatus').textContent = "KRİTİK UYARILAR";
        document.getElementById('chatHeaderStatus').className = 'small text-danger fw-bold';
        document.getElementById('sendMessageForm').style.display = 'none'; 
        
        // Mesajları "okundu" olarak işaretle (Sistem Uyarıları)
        privateMessages.forEach(msg => {
            if (msg.receiver === myName && msg.sender.startsWith('Sistem Uyarısı')) {
                msg.read = true;
            }
        });
        savePrivateMessages();


    } else {
        const targetUser = users.find(u => u.name === targetUserName);
        if (!targetUser) return;
        
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('chatWindow').style.display = 'flex';
        document.getElementById('chatHeaderName').textContent = targetUser.name;
        document.getElementById('chatHeaderAvatar').src = targetUser.profileImage || "https://via.placeholder.com/40";
        document.getElementById('chatHeaderStatus').textContent = targetUser.status === 'active' ? 'Çevrimiçi' : 'Çevrimdışı';
        document.getElementById('chatHeaderStatus').className = targetUser.status === 'active' ? 'small text-success fw-bold' : 'small text-muted';
        document.getElementById('sendMessageForm').style.display = 'flex'; 
        
        // Normal sohbeti okundu olarak işaretle
        privateMessages.forEach(msg => {
            if (msg.receiver === myName && msg.sender === targetUserName && !msg.read) {
                msg.read = true;
            }
        });
        savePrivateMessages();
    }


    loadFriendsList();
    renderMessages(true);
}

function closeChat() {
    currentChatUser = null;
    document.getElementById('chatWindow').style.display = 'none';
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('sendMessageForm').style.display = 'flex'; 
    loadFriendsList();
}

// --- MESAJLARI GÖSTERME (SİL VE RAPOR BUTONLARI YAN YANA) ---
function renderMessages(forceScroll = false) {
    if (!currentChatUser) return;

    const container = document.getElementById('messageContainer');
    const myName = sessionStorage.getItem('CURRENT_USER_NAME');
    
    const isSystemChat = currentChatUser === "SYSTEM_WARNINGS";

    const conversation = privateMessages.filter(msg => {
        if (isSystemChat) {
             return msg.receiver === myName && msg.sender.startsWith('Sistem Uyarısı');
        } else {
             return (msg.sender === myName && msg.receiver === currentChatUser && !msg.sender.startsWith('Sistem Uyarısı')) ||
                    (msg.sender === currentChatUser && msg.receiver === myName && !msg.sender.startsWith('Sistem Uyarısı'));
        }
    });

    conversation.sort((a, b) => a.timestamp - b.timestamp);

    let html = '';
    if (conversation.length === 0) {
        html = '<div class="text-center text-muted mt-5 opacity-75"><p>Henüz mesaj yok.</p></div>';
    } else {
        conversation.forEach(msg => {
            const isMe = msg.sender === myName;
            const isSystemSender = msg.sender.startsWith('Sistem Uyarısı');

            const bubbleClass = isMe && !isSystemSender ? 'message-sent' : 'message-received';
            const timeString = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Render sırasında sansürlenmiş metni kullan
            const filteredText = safeFilterWords(msg.text);

            let actionButtonsHtml = '';
            
            // Sistem mesajları silinemez veya raporlanamaz
            if (isMe && !isSystemSender) {
                // Benim Mesajım: Sil ve Raporla (yan yana)
                actionButtonsHtml = `
                    <i class="fas fa-trash text-white ms-2" style="cursor:pointer; font-size: 0.7rem; opacity: 0.8;" onclick="deleteMessage(${msg.id})" title="Mesajı Sil"></i>
                    <i class="fas fa-flag text-white ms-2" style="cursor:pointer; font-size: 0.7rem; opacity: 0.8;" onclick="reportMessage(${msg.id})" title="Mesajı Raporla"></i>
                `;
            } else if (!isMe && !isSystemSender) {
                // Karşı Tarafın Mesajı: Sadece Raporla
                actionButtonsHtml = `<i class="fas fa-flag text-danger ms-2" style="cursor:pointer; font-size: 0.7rem;" onclick="reportMessage(${msg.id})" title="Mesajı Raporla"></i>`;
            }
            
            // Sistem mesajları için özel stil ve içerik
            if (isSystemSender) {
                 html += `
                    <div class="d-flex justify-content-start align-items-center mb-2">
                        <div class="message-bubble bg-light shadow-sm" style="border: 1px solid #FF0000; color: #8B0000;">
                            <strong class="text-danger">SİSTEM UYARISI:</strong> ${filteredText.replace('❗ YÖNETİCİ UYARISI:', '').trim()}
                            <div class="d-flex justify-content-end align-items-center mt-1">
                                <span class="message-time text-muted me-2">${timeString}</span>
                            </div>
                        </div>
                    </div>`;
            } else {
                 html += `
                    <div class="d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'} align-items-center mb-2">
                        <div class="message-bubble ${bubbleClass} shadow-sm">
                            ${filteredText}
                            <div class="d-flex justify-content-end align-items-center mt-1">
                                <span class="message-time text-${isMe ? 'light' : 'muted'} me-2">${timeString}</span>
                                ${actionButtonsHtml} 
                            </div>
                        </div>
                    </div>`;
            }
        });
    }
    
    if (container.innerHTML !== html) {
        container.innerHTML = html;
        if (forceScroll || container.lastElementChild?.querySelector('.message-sent')) {
            container.scrollTop = container.scrollHeight;
        }
    }
}

function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    const myName = sessionStorage.getItem('CURRENT_USER_NAME');

    if (!text || !currentChatUser || currentChatUser === "SYSTEM_WARNINGS") return;

    // KRİTİK DÜZELTME: Mesajı kaydetmeden önce kara liste filtresini uygula
    const filteredText = safeFilterWords(text);

    const newMessage = {
        id: Date.now(),
        sender: myName,
        receiver: currentChatUser,
        text: filteredText, // Filtrelenmiş metni kaydet
        timestamp: Date.now(),
        read: false
    };

    privateMessages.push(newMessage);
    savePrivateMessages();
    renderMessages(true);
    input.value = '';
    input.focus();
}

// --- AKSİYONLAR (SİLME VE RAPORLAMA) ---

/**
 * Sohbet geçmişini siler.
 */
window.deleteConversation = function() {
    if (!currentChatUser) return;
    
    const myName = sessionStorage.getItem('CURRENT_USER_NAME');

    if (currentChatUser === "SYSTEM_WARNINGS") {
        if(confirm("Tüm Sistem Uyarılarını temizlemek istediğinizden emin misiniz?")) {
            // Sadece Sistem Uyarılarını filtreleyerek sil
            window.privateMessages = window.privateMessages.filter(msg => 
                !(msg.receiver === myName && msg.sender.startsWith('Sistem Uyarısı'))
            );
            savePrivateMessages();
            closeChat();
        }
    } else {
        if(confirm(`${currentChatUser} ile olan tüm sohbet geçmişini silmek istediğinizden emin misiniz?`)) {
            // Sadece bu iki kullanıcı arasındaki mesajları filtreleyerek sil
            window.privateMessages = window.privateMessages.filter(msg => 
                !(msg.sender === myName && msg.receiver === currentChatUser) &&
                !(msg.sender === currentChatUser && msg.receiver === myName)
            );
            savePrivateMessages();
            closeChat();
        }
    }
}

window.deleteMessage = function(msgId) {
    if(confirm("Bu mesajı silmek istiyor musunuz?")) {
        const index = privateMessages.findIndex(m => m.id === msgId);
        if (index !== -1) {
            privateMessages.splice(index, 1);
            savePrivateMessages();
            renderMessages();
        }
    }
}

window.reportMessage = function(msgId) {
    const msg = privateMessages.find(m => m.id === msgId);
    if (!msg) return;

    const reason = prompt("Bu mesajı neden raporluyorsunuz?");
    if (reason) {
        const report = {
            reportId: Date.now(),
            type: 'message_complaint', // Admin panelinde bu tipi yakalayacağız
            targetId: msg.id,
            targetName: msg.sender, 
            reportedBy: sessionStorage.getItem('CURRENT_USER_NAME'),
            contentPreview: safeFilterWords(msg.text), // Rapor içeriğini de sansürleyip Admin'e gönder
            reason: reason,
            isResolved: false,
            timestamp: Date.now()
        };
        
        reports.push(report);
        saveReportData();
        
        // KRİTİK DÜZELTME: Admin Panel Bildirimlerini Güncelle (Admin.js'e bağımlı)
        if (typeof window.updateModerationView === 'function') {
             window.updateModerationView();
        }
        if (typeof window.updateNotifications === 'function') {
             window.updateNotifications();
        }

        alert("Mesaj yönetime raporlandı.");
    }
}

window.reportUserFromChat = function(userName) {
    const reason = prompt(`${userName} adlı kullanıcıyı neden raporluyorsunuz?`);
    if (reason) {
        const targetUser = users.find(u => u.name === userName);
        const report = {
            reportId: Date.now(),
            type: 'user_complaint',
            targetId: targetUser ? targetUser.id : 0,
            targetName: userName,
            reportedBy: sessionStorage.getItem('CURRENT_USER_NAME'),
            contentPreview: "Sohbet ekranından kullanıcı şikayeti",
            reason: reason,
            isResolved: false
        };
        reports.push(report);
        saveReportData();
        
        // KRİTİK DÜZELTME: Admin Panel Bildirimlerini Güncelle (Admin.js'e bağımlı)
        if (typeof window.updateModerationView === 'function') {
             window.updateModerationView();
        }
        if (typeof window.updateNotifications === 'function') {
             window.updateNotifications();
        }

        alert("Kullanıcı raporlandı.");
    }
}