document.addEventListener('DOMContentLoaded', function() {
    
    // --- KONFIGURASI API BACKEND ---
    // URL Web App GAS Standalone milikmu
    const API_URL = 'https://script.google.com/macros/s/AKfycbxgz0nkLlWB5jLT2e8Dcf9gNFwlB8FNEb6af6WwezdUZkQXtfHw-oBq1NnpXiY8guhg/exec';

    // --- DEKLARASI ELEMEN DOM ---
    // Menggunakan ID yang sesuai dengan index.html milikmu
    const btnShowLogin = document.getElementById('btnShowLogin');
    const loginModal = document.getElementById('loginModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const loginForm = document.getElementById('loginForm');
    const btnLoginModal = document.getElementById('btnLoginModal');
    
    // Modal Ganti Password (Baru)
    const changePasswordModal = document.getElementById('changePasswordModal');
    const btnCancelChangePassword = document.getElementById('btnCancelChangePassword');
    const formChangePassword = document.getElementById('formChangePassword');
    const btnSubmitChangePassword = document.getElementById('btnSubmitChangePassword');

    // Variabel penampung NIP sementara saat proses ganti password
    let tempNip = '';

    // --- LOGIKA BUKA/TUTUP MODAL ---
    function openModal(modal) {
        modal.style.display = 'flex';
        setTimeout(() => { modal.classList.add('show'); }, 10);
    }

    function closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 400);
    }

    if(btnShowLogin) btnShowLogin.addEventListener('click', () => openModal(loginModal));
    if(btnCloseModal) btnCloseModal.addEventListener('click', () => closeModal(loginModal));
    
    if(btnCancelChangePassword) btnCancelChangePassword.addEventListener('click', () => {
        closeModal(changePasswordModal);
        tempNip = ''; // Reset NIP
    });

    // --- LOGIKA MATA (TOGGLE PASSWORD) ---
    function setupPasswordToggle(toggleIconId, inputId) {
        const icon = document.getElementById(toggleIconId);
        const input = document.getElementById(inputId);
        if(icon && input) {
            icon.addEventListener('click', function() {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                this.classList.toggle('fa-eye-slash');
                this.classList.toggle('fa-eye');
            });
        }
    }

    // Terapkan toggle ke 3 field password
    setupPasswordToggle('togglePassword', 'password');
    setupPasswordToggle('toggleNewPassword', 'newPassword');
    setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');

    // --- PROSES 1: FORM LOGIN (REQUEST KE API) ---
    if(loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nip = document.getElementById('nip').value.trim();
            const password = document.getElementById('password').value.trim();
            
            // Tampilan Loading
            btnLoginModal.classList.add('loading');
            btnLoginModal.disabled = true;

            // Siapkan payload data
            const payload = {
                action: 'login',
                nip: nip,
                password: password
            };

            // Kirim ke Backend
            fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                btnLoginModal.classList.remove('loading');
                btnLoginModal.disabled = false;

                if (data.success) {
                    if (data.requirePasswordChange) {
                        // Jika Password masih Default -> Arahkan ganti password
                        tempNip = nip; 
                        loginForm.reset();
                        
                        // Pastikan form ganti password benar-benar kosong sebelum dibuka
                        if(formChangePassword) formChangePassword.reset(); 
                        
                        closeModal(loginModal);
                        setTimeout(() => { openModal(changePasswordModal); }, 450); 
                        
                    } else {
                        // Jika Login Berhasil & Password sudah diubah
                        // Simpan data sesi pengguna
                        sessionStorage.setItem('isLoggedIn', 'true');
                        sessionStorage.setItem('userNip', data.data.nip);
                        sessionStorage.setItem('userName', data.data.nama);
                        sessionStorage.setItem('userRole', data.data.role.toLowerCase());
                        sessionStorage.setItem('userUnor', data.data.unor_induk);

                        Swal.fire({
                            icon: 'success',
                            title: 'Login Berhasil!',
                            text: `Selamat datang kembali, ${data.data.nama}.`,
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            // Arahkan (Redirect) sesuai Role dari Backend
                            const role = data.data.role.toLowerCase();
                            if(role === 'pengusul') window.location.href = 'pengusul.html';
                            else if (role === 'pengelola') window.location.href = 'pengelola.html';
                            else if (role === 'verifikator') window.location.href = 'verifikator.html';
                            else Swal.fire('Error', 'Role tidak dikenali sistem.', 'error');
                        });
                    }
                } else {
                    // Jika Login Gagal (Salah Pass/NIP/Bukan PNS)
                    Swal.fire({
                        icon: 'error',
                        title: 'Akses Ditolak',
                        text: data.message,
                        confirmButtonColor: '#3B82F6'
                    });
                }
            })
            .catch(error => {
                btnLoginModal.classList.remove('loading');
                btnLoginModal.disabled = false;
                Swal.fire('Error Koneksi', 'Gagal terhubung ke server. Pastikan Anda memiliki koneksi internet.', 'error');
            });
        });
    }

    // --- PROSES 2: FORM GANTI PASSWORD (REQUEST KE API) ---
    if(formChangePassword) {
        formChangePassword.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newPass = document.getElementById('newPassword').value;
            const confPass = document.getElementById('confirmPassword').value;
            const email = document.getElementById('userEmail').value.trim();

            // Validasi 1: Password harus sama
            if (newPass !== confPass) {
                Swal.fire('Kesalahan', 'Password baru dan konfirmasi password tidak cocok!', 'warning');
                return;
            }

            // Validasi 2: Minimal 8 karakter, wajib kombinasi huruf & angka
            const regex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
            if (!regex.test(newPass)) {
                Swal.fire('Format Tidak Valid', 'Password harus terdiri dari minimal 8 karakter dan mengandung kombinasi huruf serta angka.', 'warning');
                return;
            }

            // Tampilan Loading
            btnSubmitChangePassword.classList.add('loading');
            btnSubmitChangePassword.disabled = true;

            const payload = {
                action: 'changePassword',
                nip: tempNip,
                newPassword: newPass,
                email: email
            };

            // Kirim ke Backend
            fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                btnSubmitChangePassword.classList.remove('loading');
                btnSubmitChangePassword.disabled = false;

                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Keamanan Diperbarui!',
                        text: data.message, // "Password berhasil diperbarui! Silakan login kembali..."
                        confirmButtonColor: '#3B82F6'
                    }).then(() => {
                        formChangePassword.reset();
                        closeModal(changePasswordModal);
                        tempNip = '';
                        // Otomatis buka modal login agar user langsung bisa masuk
                        setTimeout(() => { openModal(loginModal); }, 450);
                    });
                } else {
                    Swal.fire('Gagal', data.message, 'error');
                }
            })
            .catch(error => {
                btnSubmitChangePassword.classList.remove('loading');
                btnSubmitChangePassword.disabled = false;
                Swal.fire('Error Koneksi', 'Gagal menghubungi server.', 'error');
            });
        });
    }

});