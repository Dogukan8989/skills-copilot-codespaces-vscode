// =======================================================
// login.js: GİRİŞ VE KAYIT MANTIĞI (GELİŞMİŞ IP/KONUM LOGLAMA)
// =======================================================

// Bu dosya, data_store.js'ten gelen global 'users', 'saveUserData' ve 'loadUsersData' fonksiyonlarına erişir.

/**
 * Harici API kullanarak kullanıcının gerçek genel IP adresini ve KONUMUNU (coğrafi) almaya çalışır.
 * Hata durumunda bile loglama yapmayı garanti eder.
 * @returns {Promise<{ip: string, location: string, apiError: boolean}>} IP ve Konum bilgisini içeren Promise.
 */
async function getRealUserIPAndLocation() {
    let ip = 'Bilinmiyor';
    let location = 'Bilinmeyen Konum';
    let apiError = false;
    
    try {
        // 1. Gerçek IP adresini al (HTTPS zorunlu)
        // Bu API çağrısı, gerçek sunucuda çalışmalıdır.
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (!ipResponse.ok) throw new Error("ipify API hatası");
        const ipData = await ipResponse.json();
        ip = ipData.ip;

        // 2. Alınan IP adresini kullanarak coğrafi konum bilgisini al (HTTPS zorunlu)
        const geoResponse = await fetch(`https://ip-api.com/json/${ip}?fields=country,city,status,regionName`);
        if (!geoResponse.ok) throw new Error("ip-api API hatası");
        
        const geoData = await geoResponse.json();
        
        if (geoData.status === 'success' && geoData.city && geoData.country) {
            // Şehir ve Ülke bilgisini birleştiriyoruz.
            location = `${geoData.city}, ${geoData.country}`;
        } else {
             location = `Konum Bulunamadı (${ip})`;
        }

    } catch (error) {
        // API'nin gerçek IP'yi almayı başaramadığı durumlar loglanır.
        console.error("IP/Konum alma hatası:", error.message);
        apiError = true;
        
        // Hata durumunda dahi gerçek loglama için Bilinmiyor/Hata notunu kaydeder.
        ip = 'API Hatası/Engellendi'; 
        location = 'Yerel Ağ / API Hatası';
    }

    return { ip, location, apiError };
}


document.addEventListener('DOMContentLoaded', function() {
    // KRİTİK: Global veriyi yüklüyoruz.
    if (typeof loadUsersData === 'function') {
         loadUsersData(); 
    }

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const errorDisplay = document.getElementById('loginError');
    
    // ----------------------
    // GİRİŞ İŞLEMİ
    // ----------------------
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) { 
            e.preventDefault();

            const email = document.getElementById('emailInput').value;
            const password = document.getElementById('passwordInput').value;
            
            if (errorDisplay) errorDisplay.classList.add('d-none');

            // KRİTİK DÜZELTME: window.users ile erişim
            const user = window.users.find(u => u.email === email);
            const userIndex = window.users.findIndex(u => u.email === email);
            const banReason = user ? user.ban_reason : "";

            if (user) {
                if (user.password === password) {
                    let errorMessage = "";

                    // KRİTİK DÜZELTME: Admin Onaylandıktan Sonraki Bildirim Kontrolü
                    if (user.status === 'pending_approval_notice') {
                        // Kullanıcıya giriş yapmaması gerektiğini, önce çıkış yapıp tekrar girmesi gerektiğini hatırlat.
                        errorMessage = 'Hesabınız onaylandı! İzinlerinizi aktive etmek için lütfen "Çıkış Yapınız ve Tekrar Giriş Yapınız" uyarısını uygulayın. Veya şimdi çıkış yapıp tekrar deneyin.';
                    } 
                    else if (user.status === 'pending') {
                        errorMessage = 'Girişiniz hâlâ onay bekliyor. Lütfen yetkili onayını bekleyin.';
                    } else if (user.status === 'banned') {
                        errorMessage = `Hesabınız engellendi. Sebep: ${banReason}`;
                    } else if (user.status.startsWith('timeout:')) {
                         const durationMatch = user.status.match(/timeout:(\d+)/);
                         const duration = durationMatch ? durationMatch[1] : '?';
                         errorMessage = `Hesabınız **${duration} saat** süreliğine geçici olarak banlanmıştır. Sebep: **${banReason || 'Belirtilmemiş'}**`;
                    }

                    if (errorMessage) {
                        if (errorDisplay) {
                            errorDisplay.innerHTML = errorMessage;
                            errorDisplay.classList.remove('d-none');
                        }
                        return; // Hata veya bildirim varsa buradan çıkar, Ana Sayfaya yönlendirmez.
                    }

                    // ************************************************
                    // YENİ KRİTİK ADIM: GERÇEK IP'Yİ AL VE KAYDET
                    // API Hata kontrolü eklendi.
                    const { ip, location, apiError } = await getRealUserIPAndLocation();
                    
                    const newSecurityLog = {
                         timestamp: Date.now(),
                         ip: ip, // Gerçek IP
                         location: location, // Gerçek Konum
                         success: true,
                         notes: apiError ? "Başarılı Oturum Açma (API HATALI)" : "Başarılı Oturum Açma"
                    };

                    if (!window.users[userIndex].securityLogs) {
                        window.users[userIndex].securityLogs = [];
                    }
                    window.users[userIndex].securityLogs.push(newSecurityLog);
                    // ************************************************
                    
                    // Başarılı Giriş! (Sadece 'active' veya 'offline' durumları buraya düşmeli)
                    if (user.status === 'offline') {
                        window.users[userIndex].status = 'active'; // Durumu aktif yap
                    }
                    
                    const sessionTime = Date.now();

                    // Oturum bilgilerini kaydet
                    sessionStorage.setItem('CURRENT_USER_ROLE', user.role);
                    sessionStorage.setItem('CURRENT_USER_NAME', user.name);
                    sessionStorage.setItem('LOGGED_IN_SESSION', sessionTime);

                    if (typeof saveUserData === 'function') {
                         saveUserData();
                    }
                    
                    // YÖNLENDİRME MANTIĞI:
                    if (user.role === 'member') {
                        window.location.href = 'social_media_main.html'; // Normal üyeyse
                    } else {
                        // Admin Panel Girişi Loglama
                        if (typeof window.logAdminLogin === 'function') {
                            window.logAdminLogin(user, sessionTime);
                        }
                        window.location.href = 'index.html'; // Admin, Moderatör vb. ise
                    }
                    return;
                    
                } else {
                    errorMessage = 'Girdiğiniz şifre hatalı.';
                }
            } else {
                errorMessage = 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.';
            }

            if (errorDisplay && errorMessage) {
                errorDisplay.innerHTML = errorMessage;
                errorDisplay.classList.remove('d-none');
            }
        });
    }

    // ----------------------
    // KAYIT İŞLEMİ
    // ----------------------
    if (registerForm) {
        const registerErrorDisplay = document.getElementById('registerError');
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const userName = document.getElementById('registerUserName').value.trim();
            const fullName = document.getElementById('registerFullName').value.trim();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;

            if (registerErrorDisplay) registerErrorDisplay.classList.add('d-none');
            
            // KRİTİK DÜZELTME: window.users ile erişim kontrolü
            if (typeof window.users === 'undefined') {
                 console.error("HATA: users dizisi yüklenmedi. data_store.js kontrol edin.");
                 if (registerErrorDisplay) {
                    registerErrorDisplay.textContent = 'Sistem hatası: Veri yüklenemedi.';
                    registerErrorDisplay.classList.remove('d-none');
                 }
                 return;
            }
            
            // E-posta Kontrolü
            if (window.users.some(u => u.email === email)) {
                if (registerErrorDisplay) {
                    registerErrorDisplay.textContent = 'Bu e-posta adresi zaten kayıtlı.';
                    registerErrorDisplay.classList.remove('d-none');
                }
                return;
            }
            
            // KULLANICI ADI Kontrolü (Benzersizlik)
            if (window.users.some(u => u.name.toLowerCase() === userName.toLowerCase())) {
                if (registerErrorDisplay) {
                    registerErrorDisplay.textContent = 'Bu kullanıcı adı zaten KULLANIMDA! Lütfen başka bir ad seçin.';
                    registerErrorDisplay.classList.remove('d-none');
                }
                return;
            }

            const newId = window.users.length > 0 ? Math.max(...window.users.map(u => u.id || 0)) + 1 : 1;

            const newUser = {
                id: newId,
                name: userName,
                full_name: fullName,
                email: email,
                password: password,
                role: 'member', 
                status: 'pending', // Kullanıcılar onay bekliyor başlar
                ban_reason: "",
                // Yeni default alanlar
                bio: "", followers: [], following: [], isPrivate: false, profileImage: "https://via.placeholder.com/150/007bff/FFFFFF?text=U", 
                badges: { black: false, blue: false, red: false, tech: false, vip: false }, 
                activityLogs: { "Pazartesi": 0, "Salı": 0, "Çarşamba": 0, "Perşembe": 0, "Cuma": 0, "Cumartesi": 0, "Pazar": 0 }, lastLogReset: Date.now(),
                achievements: {}, displayedAchievements: [], pendingFollowers: [],
                
                // YENİ EKLENTİ: Onay Bildirimi için bayrak
                showPendingWarning: true,
                securityLogs: [] 
            };

            window.users.push(newUser); // Global users dizisine ekle
            if (typeof saveUserData === 'function') {
                 saveUserData();
            }
            
            // YENİ MANTIK: Kullanıcıyı direkt sisteme al, ama status 'pending' kalsın.
            sessionStorage.setItem('CURRENT_USER_ROLE', 'member');
            sessionStorage.setItem('CURRENT_USER_NAME', userName);
            sessionStorage.setItem('LOGGED_IN_SESSION', Date.now()); 

            alert(`Kaydınız başarıyla alındı. Yönetici onayı bekleniyor. Ana sayfaya yönlendiriliyorsunuz.`);
            
            // Ana sayfaya yönlendir
            window.location.href = 'social_media_main.html'; 
        });
    }
});