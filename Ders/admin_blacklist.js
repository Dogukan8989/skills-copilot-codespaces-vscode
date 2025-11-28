// =======================================================
// admin_blacklist.js: KARA LİSTE YÖNETİM MANTIĞI
// =======================================================

/**
 * Kara listedeki kelimeleri render eder.
 */
function renderBlacklistedWords() {
    // data_store.js'ten gelen BLACKLISTED_WORDS dizisini kullanır
    // (Bu dizi, data_store.js'ten LocalStorage üzerinden yüklenecektir)
    if (typeof BLACKLISTED_WORDS === 'undefined') return;

    const listContainer = document.getElementById('blacklistedWordsList');
    const wordCountSpan = document.getElementById('wordCount');
    
    if (!listContainer || !wordCountSpan) return;

    // Yetki kontrolü (admin.js'teki navigasyon zaten engeller, ama ek güvenlik)
    // CURRENT_USER_ROLE global olarak data_store.js ve session'dan gelir
    const CURRENT_USER_ROLE = sessionStorage.getItem('CURRENT_USER_ROLE');
    if (!['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE)) {
        listContainer.innerHTML = '<li class="list-group-item text-center text-danger">Yetkiniz yok.</li>';
        wordCountSpan.textContent = '0';
        return;
    }
    
    wordCountSpan.textContent = BLACKLISTED_WORDS.length;
    
    if (BLACKLISTED_WORDS.length === 0) {
        listContainer.innerHTML = '<li class="list-group-item text-center text-muted">Kara listede hiç kelime bulunmamaktadır.</li>';
        return;
    }
    
    // Kelimeleri listele ve silme butonu ekle
    listContainer.innerHTML = BLACKLISTED_WORDS.map(word => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <span class="fw-bold text-danger">${word}</span>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteBlacklistedWord('${word.replace(/'/g, "\\'")}')">
                <i class="fas fa-trash-alt"></i> Sil
            </button>
        </li>
    `).join('');
}
window.renderBlacklistedWords = renderBlacklistedWords;

/**
 * Kara listeye yeni kelime ekler.
 * @param {Event} e - Form submit olayı.
 */
window.addBlacklistedWord = function(e) {
    e.preventDefault();
    
    const CURRENT_USER_ROLE = sessionStorage.getItem('CURRENT_USER_ROLE');
    if (!['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE)) {
        alert('Bu işlemi yapmaya yetkiniz yok!');
        return;
    }
    
    const newWordInput = document.getElementById('newWordInput');
    const newWord = newWordInput.value.trim().toLowerCase();
    
    if (!newWord || typeof BLACKLISTED_WORDS === 'undefined') return;

    if (BLACKLISTED_WORDS.includes(newWord)) {
        alert(`'${newWord}' zaten kara listede bulunuyor!`);
        return;
    }
    
    BLACKLISTED_WORDS.push(newWord);
    
    // Veriyi kaydet ve tabloyu yenile
    if (typeof saveBlacklistedWords === 'function') saveBlacklistedWords();
    renderBlacklistedWords();
    newWordInput.value = '';
    
    // Loglama
    const CURRENT_USER_NAME = sessionStorage.getItem('CURRENT_USER_NAME');
    const ROLE_NAMES = typeof window.ROLE_NAMES === 'object' ? window.ROLE_NAMES : {};

    // moderationLogs global olarak data_store.js'ten geliyor.
    moderationLogs.push(`[KELİME EKLENDİ] ${CURRENT_USER_NAME} (${ROLE_NAMES[sessionStorage.getItem('CURRENT_USER_ROLE')] || 'Yetkili'}): Kara listeye '${newWord}' kelimesini ekledi.`);
    
    if (typeof saveModerationLogs === 'function') saveModerationLogs();
    
    alert(`'${newWord}' başarıyla kara listeye eklendi.`);
}

/**
 * Kara listeden kelime siler.
 * @param {string} wordToDelete - Silinecek kelime.
 */
window.deleteBlacklistedWord = function(wordToDelete) {
    if (!confirm(`'${wordToDelete}' kelimesini kara listeden silmek istediğinizden emin misiniz?`)) {
        return;
    }

    const CURRENT_USER_ROLE = sessionStorage.getItem('CURRENT_USER_ROLE');
    if (!['super_admin', 'admin', 'moderator'].includes(CURRENT_USER_ROLE)) {
        alert('Bu işlemi yapmaya yetkiniz yok!');
        return;
    }

    const initialLength = BLACKLISTED_WORDS.length;
    // Kelimeyi sil
    BLACKLISTED_WORDS = BLACKLISTED_WORDS.filter(word => word !== wordToDelete);
    
    if (BLACKLISTED_WORDS.length < initialLength) {
        // Veriyi kaydet ve tabloyu yenile
        if (typeof saveBlacklistedWords === 'function') saveBlacklistedWords();
        renderBlacklistedWords();
        
        // Loglama
        const CURRENT_USER_NAME = sessionStorage.getItem('CURRENT_USER_NAME');
        const ROLE_NAMES = typeof window.ROLE_NAMES === 'object' ? window.ROLE_NAMES : {};

        moderationLogs.push(`[KELİME SİLİNDİ] ${CURRENT_USER_NAME} (${ROLE_NAMES[sessionStorage.getItem('CURRENT_USER_ROLE')] || 'Yetkili'}): Kara listeden '${wordToDelete}' kelimesini SİLDİ.`);
        
        if (typeof saveModerationLogs === 'function') saveModerationLogs();

        alert(`'${wordToDelete}' kelimesi başarıyla silindi.`);
    } else {
        alert('Hata: Kelime bulunamadı.');
    }
}