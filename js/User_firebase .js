import { 
    updateUserInFirestore, 
    findUserByEmail 
} from './firebase-config.js';

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    displayUserHeaderInfo();
    checkUpdateStatus();
    
    const updateBtn = document.getElementById('updateNamesBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', function() {
            updateUserNames();
        });
    }
    
    const userNameInput = document.getElementById('userName');
    const userFamilyInput = document.getElementById('userFamily');
    
    if (userNameInput) {
        userNameInput.addEventListener('input', checkForChanges);
    }
    if (userFamilyInput) {
        userFamilyInput.addEventListener('input', checkForChanges);
    }
});

// دالة مساعدة لجلب البيانات من localStorage
function getLocalStorageData() {
    const savedData = localStorage.getItem('userData');
    return savedData ? JSON.parse(savedData) : null;
}

// دالة لجلب بيانات المستخدم وعرضها في الحقول مع التحقق من وجود العناصر
function loadUserData() {
    const userData = getLocalStorageData();
    
    if (userData) {
        // دالة مساعدة للتحقق من وجود العنصر قبل تعيين القيمة
        function setValueIfElementExists(elementId, value) {
            const element = document.getElementById(elementId);
            if (element) element.value = value || '';
        }
        
        setValueIfElementExists('userName', userData.name);
        setValueIfElementExists('userFamily', userData.family);
        setValueIfElementExists('userEmail', userData.email);
        setValueIfElementExists('userPhone', userData.phone);
    }
}

// دالة لعرض معلومات المستخدم في الهيدر مع التحقق من وجود العناصر
function displayUserHeaderInfo() {
    const userData = getLocalStorageData();
    
    if (userData) {
        const welcomeElement = document.getElementById('welcomeName');
        const emailElement = document.getElementById('userEmailDisplay');
        
        if (welcomeElement) {
            welcomeElement.textContent = userData.name ? `مرحبا ${userData.name}` : 'مرحبا';
        }
        
        if (emailElement) {
            emailElement.textContent = userData.email || '';
        }
    }
}

// دالة لتحديث بيانات المستخدم مع التحقق من وجود العناصر
function updateUserInfo() {
    const userData = getLocalStorageData() || {};
    
    function getValueIfElementExists(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value.trim() : null;
    }
    
    const updatedData = {
        ...userData,
        name: getValueIfElementExists('editName') || userData.name,
        family: getValueIfElementExists('editFamily') || userData.family,
        email: getValueIfElementExists('editEmail') || userData.email,
        phone: getValueIfElementExists('editPhone') || userData.phone
    };
    
    localStorage.setItem('userData', JSON.stringify(updatedData));
    displayUserHeaderInfo();
    loadUserData();
    
    alert('تم تحديث البيانات بنجاح!');
    return true;
}

// دالة التحقق من حالة التحديث
function checkUpdateStatus() {
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    
    if (userData.isUpdated) {
        disableEditing();
    } else {
        const updateBtn = document.getElementById('updateNamesBtn');
        if (updateBtn) {
            updateBtn.disabled = true;
        }
        checkForChanges();
    }
}

// دالة التحديث المعدلة لإرسال البيانات إلى Firebase بدلاً من Google Sheets
async function updateUserNames() {
    const updateBtn = document.getElementById('updateNamesBtn');
    if (!updateBtn) return;
    
    updateBtn.disabled = true;
    updateBtn.textContent = 'جاري التحديث...';
    
    try {
        const userData = JSON.parse(localStorage.getItem('userData')) || {};
        const email = userData.email;
        
        if (!email) {
            throw new Error('لم يتم العثور على بريد المستخدم');
        }
        
        // تحديث البيانات المحلية
        userData.name = document.getElementById('userName').value;
        userData.family = document.getElementById('userFamily').value;
        userData.isUpdated = true;
        userData.updateTimestamp = new Date().toISOString();
        
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // إرسال البيانات إلى Firebase
        const response = await updateUserInFirestore(email, {
            name: userData.name,
            family: userData.family,
            isUpdated: true,
            updateTimestamp: userData.updateTimestamp
        });
        
        if (response.success) {
            disableEditing();
            alert('تم تحديث الأسماء بنجاح وتم تسجيلها في Firebase!');
            displayUserHeaderInfo();
        } else {
            throw new Error(response.error || 'فشل في إرسال البيانات');
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث البيانات:', error);
        updateBtn.disabled = false;
        updateBtn.textContent = 'تحديث الأسماء';
        alert('حدث خطأ أثناء محاولة تحديث البيانات. الرجاء المحاولة مرة أخرى.');
    }
}

// دالة لتعطيل التحرير بعد التحديث
function disableEditing() {
    const updateBtn = document.getElementById('updateNamesBtn');
    const userNameInput = document.getElementById('userName');
    const userFamilyInput = document.getElementById('userFamily');
    
    if (updateBtn) {
        updateBtn.disabled = true;
        updateBtn.textContent = 'تم التحديث';
        updateBtn.style.backgroundColor = '#4CAF50';
    }
    
    if (userNameInput) {
        userNameInput.readOnly = true;
    }
    
    if (userFamilyInput) {
        userFamilyInput.readOnly = true;
    }
}

// دالة للتحقق من التغييرات
function checkForChanges() {
    if (isUpdated()) return;
    
    const updateBtn = document.getElementById('updateNamesBtn');
    if (!updateBtn) return;
    
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    const userNameInput = document.getElementById('userName');
    const userFamilyInput = document.getElementById('userFamily');

    if (!userNameInput || !userFamilyInput) return;

    const nameChanged = userNameInput.value !== userData.name;
    const familyChanged = userFamilyInput.value !== userData.family;
    
    updateBtn.disabled = !(nameChanged || familyChanged);
}

// دالة للتحقق من حالة التحديث
function isUpdated() {
    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    return userData.isUpdated;
}

// ==================== نظام الصور الشخصية ====================

const icon = document.getElementById("icon_person");
const fileInput = document.getElementById("fileInput");
const profileImage = document.getElementById("profileImage");

// عند تحميل الصفحة، نتحقق إذا كانت هناك صورة محفوظة
window.addEventListener('load', function() {
    const savedImage = localStorage.getItem('userProfileImage');
    if (savedImage && icon && profileImage) {
        profileImage.src = savedImage;
        profileImage.style.display = "block";
        icon.style.display = "none";
    } else if (icon && profileImage) {
        profileImage.style.display = "none";
        icon.style.display = "block";
    }
});

// عند الضغط على الأيقونة
if (icon && fileInput) {
    icon.addEventListener("click", () => {
        fileInput.click();
    });
}

// عند اختيار صورة جديدة
if (fileInput) {
    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        
        if (file) {
            // التحقق من نوع الصورة
            if (!file.type.startsWith('image/')) {
                alert('الرجاء اختيار ملف صورة فقط');
                return;
            }

            // التحقق من حجم الصورة (2MB كحد أقصى)
            if (file.size > 2 * 1024 * 1024) {
                alert('حجم الصورة يجب أن يكون أقل من 2MB');
                return;
            }

            const reader = new FileReader();
            
            reader.onload = async function(e) {
                if (!profileImage || !icon) return;
                
                // عرض الصورة المختارة
                profileImage.src = e.target.result;
                profileImage.style.display = "block";
                icon.style.display = "none";
                
                // تخزين الصورة في localStorage
                localStorage.setItem('userProfileImage', e.target.result);
                
                // دمجها مع بيانات المستخدم الأخرى
                const userData = JSON.parse(localStorage.getItem('userData')) || {};
                userData.profileImage = e.target.result;
                localStorage.setItem('userData', JSON.stringify(userData));
                
                // إرسال البيانات إلى Firebase
                try {
                    const email = userData.email;
                    if (email) {
                        const result = await updateUserInFirestore(email, {
                            profileImage: e.target.result
                        });
                        
                        if (result.success) {
                            console.log('✅ تم حفظ الصورة في Firebase');
                        }
                    }
                } catch (error) {
                    console.error('❌ خطأ في حفظ الصورة في Firebase:', error);
                }
                
                alert('تم حفظ الصورة بنجاح!');
            };
            
            reader.onerror = function() {
                alert('حدث خطأ أثناء قراءة الصورة');
            };
            
            reader.readAsDataURL(file);
        }
    });
}

// إضافة حدث الضغط المزدوج لحذف الصورة
if (profileImage) {
    profileImage.addEventListener("dblclick", async function() {
        if (confirm("هل تريد حقاً حذف هذه الصورة؟")) {
            // حذف الصورة من localStorage
            localStorage.removeItem('userProfileImage');
            
            // حذف الصورة من بيانات المستخدم
            const userData = JSON.parse(localStorage.getItem('userData')) || {};
            const email = userData.email;
            delete userData.profileImage;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // حذف الصورة من Firebase
            if (email) {
                try {
                    const result = await updateUserInFirestore(email, {
                        profileImage: null
                    });
                    
                    if (result.success) {
                        console.log('✅ تم حذف الصورة من Firebase');
                    }
                } catch (error) {
                    console.error('❌ خطأ في حذف الصورة من Firebase:', error);
                }
            }
            
            // إعادة عرض الأيقونة الأصلية
            if (icon) {
                profileImage.style.display = "none";
                icon.style.display = "block";
                profileImage.src = "";
            }
            
            alert("تم حذف الصورة بنجاح");
        }
    });
}

// ==================== نظام تسجيل الخروج وحذف الحساب ====================

document.addEventListener('DOMContentLoaded', function() {
    // تعريف العناصر
    const logoutBtn = document.getElementById('logoutLink');
    const deletionModal = document.getElementById('accountDeletionModal');
    const deletionEmailInput = document.getElementById('accountDeletionEmailInput');
    const deletionError = document.getElementById('deletionErrorMsg');
    const confirmDeletionBtn = document.getElementById('confirmAccountDeletion');
    const cancelDeletionBtn = document.getElementById('cancelAccountDeletion');
    const deletionLoader = document.getElementById('deletionLoader');
    
    if (!logoutBtn) return;
    
    // عند النقر على تسجيل الخروج
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (deletionModal) {
            deletionModal.style.display = 'block';
        }
        if (deletionEmailInput) {
            deletionEmailInput.value = '';
        }
        if (deletionError) {
            deletionError.style.display = 'none';
        }
    });
    
    // عند الإلغاء
    if (cancelDeletionBtn && deletionModal) {
        cancelDeletionBtn.addEventListener('click', function() {
            deletionModal.style.display = 'none';
        });
    }
    
    // عند تأكيد الحذف
    if (confirmDeletionBtn) {
        confirmDeletionBtn.addEventListener('click', async function() {
            if (!deletionEmailInput || !deletionError) return;
            
            const enteredEmail = deletionEmailInput.value.trim().toLowerCase();
            const userData = JSON.parse(localStorage.getItem('userData')) || {};
            const storedEmail = userData.email ? userData.email.toLowerCase() : '';
            
            if (!enteredEmail) {
                deletionError.textContent = 'يجب إدخال البريد الإلكتروني';
                deletionError.style.display = 'block';
                return;
            }
            
            if (enteredEmail !== storedEmail) {
                deletionError.textContent = 'البريد الإلكتروني غير متطابق مع السجلات';
                deletionError.style.display = 'block';
                return;
            }
            
            // بدء عملية الحذف
            if (deletionModal) {
                deletionModal.style.display = 'none';
            }
            if (deletionLoader) {
                deletionLoader.style.display = 'flex';
            }
            
            // حذف من Firebase
            try {
                const { deleteUserFromFirestore } = await import('./firebase-config.js');
                const result = await deleteUserFromFirestore(enteredEmail);
                
                if (result.success) {
                    console.log('✅ تم حذف المستخدم من Firebase');
                } else {
                    console.error('❌ فشل في حذف المستخدم من Firebase:', result.error);
                }
            } catch (error) {
                console.error('❌ خطأ في حذف المستخدم من Firebase:', error);
            }
            
            setTimeout(function() {
                // حذف جميع البيانات المحفوظة
                localStorage.clear();
                sessionStorage.clear();
                
                // الانتقال للصفحة الرئيسية مع منع العودة
                window.location.replace('/');
                
                // إضافة علامة في localStorage للإشارة لتسجيل الخروج
                localStorage.setItem('logoutFlag', 'true');
            }, 1000);
        });
    }
    
    // التحقق من حالة تسجيل الخروج عند تحميل الصفحة
    if (localStorage.getItem('logoutFlag') === 'true') {
        localStorage.removeItem('logoutFlag');
        window.location.replace('/');
    }
});
